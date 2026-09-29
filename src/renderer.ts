import type { DeclarativeNode, LocalizedString, ParetoDataset, ParetoModelPoint } from './types.js'

/**
 * Generate an SVG chart representation for the Pareto Line.
 */
export function generateParetoSvg(dataset: ParetoDataset): string {
  const width = 1100
  const height = 520
  const padding = { top: 40, right: 80, bottom: 65, left: 80 }

  // Deduplicate points on the SVG chart by benchmark slug so each benchmark model is plotted exactly once
  const seenChartSlugs = new Set<string>()
  const models: ParetoModelPoint[] = []
  for (const m of dataset.models) {
    if (m.costPerTask <= 0 || m.intelligenceIndex <= 0) continue
    const key = m.slug || m.id
    if (seenChartSlugs.has(key)) continue
    seenChartSlugs.add(key)
    models.push(m)
  }

  if (models.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="w-full h-auto bg-neutral-900 rounded-lg p-4"><text x="${width / 2}" y="${height / 2}" fill="#888" font-size="14" text-anchor="middle">No models available for Pareto evaluation</text></svg>`
  }

  // Cost is logarithmic scale
  const costs = models.map((m) => m.costPerTask)
  const intelligences = models.map((m) => m.intelligenceIndex)

  const minCost = Math.max(0.01, Math.min(...costs) * 0.7)
  const maxCost = Math.max(...costs) * 1.5
  const minIntel = Math.max(0, Math.min(...intelligences) * 0.8)
  const maxIntel = Math.min(100, Math.max(...intelligences) * 1.15)

  const logMinCost = Math.log10(minCost)
  const logMaxCost = Math.log10(maxCost)

  const getX = (cost: number) => {
    const val = Math.max(minCost, cost)
    const ratio = (Math.log10(val) - logMinCost) / (logMaxCost - logMinCost || 1)
    return padding.left + ratio * (width - padding.left - padding.right)
  }

  const getY = (intel: number) => {
    const ratio = (intel - minIntel) / (maxIntel - minIntel || 1)
    return height - padding.bottom - ratio * (height - padding.top - padding.bottom)
  }

  // Generate Pareto frontier polyline without duplicate points
  const seenFrontierSlugs = new Set<string>()
  const frontier: ParetoModelPoint[] = []
  for (const pt of [...dataset.paretoFrontier].sort((a, b) => a.costPerTask - b.costPerTask)) {
    const key = pt.slug || pt.id
    if (seenFrontierSlugs.has(key)) continue
    seenFrontierSlugs.add(key)
    frontier.push(pt)
  }

  let paretoPathD = ''
  if (frontier.length > 1) {
    paretoPathD = frontier.reduce((acc, pt, idx) => {
      const x = getX(pt.costPerTask)
      const y = getY(pt.intelligenceIndex)
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }, '')
  }

  // Grid lines
  const xTicks = [0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0].filter(
    (v) => v >= minCost && v <= maxCost,
  )
  const yTicks = [10, 20, 30, 40, 50, 60, 70, 80].filter(
    (v) => v >= minIntel && v <= maxIntel,
  )

  let gridSvg = ''

  // Most attractive quadrant (top-left)
  const midX = padding.left + (width - padding.left - padding.right) * 0.45
  gridSvg += `<rect x="${padding.left}" y="${padding.top}" width="${(midX - padding.left).toFixed(1)}" height="${(height - padding.bottom - padding.top).toFixed(1)}" fill="rgba(16, 185, 129, 0.05)" rx="4"/>`
  gridSvg += `<text x="${padding.left + 8}" y="${padding.top + 16}" fill="rgba(16, 185, 129, 0.7)" font-size="10" font-weight="600">Most attractive quadrant</text>`

  // X grid lines
  for (const xt of xTicks) {
    const x = getX(xt)
    gridSvg += `<line x1="${x.toFixed(1)}" y1="${padding.top}" x2="${x.toFixed(1)}" y2="${height - padding.bottom}" stroke="#333" stroke-dasharray="2 2" stroke-width="1"/>`
    gridSvg += `<text x="${x.toFixed(1)}" y="${height - padding.bottom + 18}" fill="#888" font-size="10" text-anchor="middle">$${xt < 1 ? xt.toFixed(2) : xt.toFixed(0)}</text>`
  }

  // Y grid lines
  for (const yt of yTicks) {
    const y = getY(yt)
    gridSvg += `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" stroke="#333" stroke-dasharray="2 2" stroke-width="1"/>`
    gridSvg += `<text x="${padding.left - 10}" y="${y.toFixed(1) + 3}" fill="#888" font-size="10" text-anchor="end">${yt}</text>`
  }

  // Draw Pareto Line
  let paretoLineSvg = ''
  if (paretoPathD) {
    paretoLineSvg = `<path d="${paretoPathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4 4"/>`
  }

  // Draw Points & Labels
  const positioned = models.map((m) => ({
    model: m,
    cx: getX(m.costPerTask),
    cy: getY(m.intelligenceIndex),
    r: m.isParetoOptimal ? 7 : 5,
  }))

  const LABEL_FONT = 11
  const CHAR_W = LABEL_FONT * 0.6
  const LABEL_H = LABEL_FONT + 4
  const placedBoxes: { x: number; y: number; w: number; h: number }[] = []
  const labels: { x: number; y: number; anchor: string; text: string; isParetoOptimal: boolean }[] = []

  const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

  // Pareto-optimal points are labelled first so they get the cleanest spots.
  const labelOrder = [...positioned].sort(
    (a, b) => Number(b.model.isParetoOptimal) - Number(a.model.isParetoOptimal),
  )

  for (const p of labelOrder) {
    const text = p.model.shortName
    const w = text.length * CHAR_W
    let best: { x: number; y: number; anchor: string; box: { x: number; y: number; w: number; h: number }; collisions: number } | undefined

    for (const offset of LABEL_OFFSETS) {
      const x = p.cx + offset.dx
      const y = p.cy + offset.dy
      const boxX = offset.anchor === 'start' ? x : offset.anchor === 'end' ? x - w : x - w / 2
      const box = { x: boxX - 2, y: y - LABEL_H + 2, w: w + 4, h: LABEL_H }
      const inBounds =
        box.x >= padding.left &&
        box.x + box.w <= width - padding.right &&
        box.y >= padding.top - 8 &&
        box.y + box.h <= height - padding.bottom + 8
      const collisions = placedBoxes.filter((b) => overlaps(box, b)).length
      const candidate = { x, y, anchor: offset.anchor, box, collisions: inBounds ? collisions : collisions + 100 }
      if (!best || candidate.collisions < best.collisions) best = candidate
      if (inBounds && collisions === 0) break
    }

    if (!best) continue
    placedBoxes.push(best.box)
    labels.push({ x: best.x, y: best.y, anchor: best.anchor, text, isParetoOptimal: p.model.isParetoOptimal })
  }

  let pointsSvg = ''
  for (const p of positioned) {
    const stroke = p.model.isParetoOptimal ? '#ffffff' : 'none'
    const strokeWidth = p.model.isParetoOptimal ? 2 : 0
    const fill = p.model.color || '#3b82f6'
    pointsSvg += `<circle cx="${p.cx.toFixed(1)}" cy="${p.cy.toFixed(1)}" r="${p.r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
  }

  const renderLabel = (l: (typeof labels)[number]) =>
    `<text class="lbl" x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="${l.anchor}" fill="${
      l.isParetoOptimal ? '#10b981' : '#cbd5e1'
    }" font-size="${LABEL_FONT}" font-weight="${l.isParetoOptimal ? 'bold' : '600'}" stroke="#0a0a0a" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(l.text)}</text>`

  // Dim labels first so the frontier names always stay on top.
  const labelsSvg = [
    ...labels.filter((l) => !l.isParetoOptimal).map(renderLabel),
    ...labels.filter((l) => l.isParetoOptimal).map(renderLabel),
  ].join('')

  // Hover tooltips (pure CSS, no script: works inside the sandboxed data: iframe)
  const TIP_FONT = 11
  const TIP_NAME_FONT = 12
  const TIP_PAD = 12
  const TIP_H = 70
  const COST_LABEL = 'Cost per Task (USD, Log Scale)'
  const INTELLIGENCE_LABEL = 'Artificial Analysis Intelligence Index'
  const labelWidth = Math.max(COST_LABEL.length, INTELLIGENCE_LABEL.length) * TIP_FONT * 0.55

  let tooltipsSvg = ''
  for (const p of positioned) {
    const nameWidth = p.model.shortName.length * TIP_NAME_FONT * 0.6
    const tipWidth = Math.round(Math.max(nameWidth, labelWidth) + TIP_PAD * 2 + 72)

    let tx = p.cx + 14
    if (tx + tipWidth > width - 8) tx = p.cx - 14 - tipWidth
    tx = Math.max(8, Math.min(tx, width - 8 - tipWidth))
    const ty = Math.max(padding.top - 8, Math.min(p.cy - TIP_H / 2, height - padding.bottom + 8 - TIP_H))

    const cost = `$${p.model.costPerTask.toFixed(2)}`
    const intelligence = String(Math.round(p.model.intelligenceIndex))

    tooltipsSvg += `
      <g class="pt">
        <circle cx="${p.cx.toFixed(1)}" cy="${p.cy.toFixed(1)}" r="12" fill="transparent" pointer-events="all"/>
        <g class="tip" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})">
          <rect x="0" y="0" width="${tipWidth}" height="${TIP_H}" rx="6" fill="#0f172a" fill-opacity="0.96" stroke="#334155" stroke-width="1"/>
          <circle cx="${TIP_PAD}" cy="16" r="4" fill="${p.model.color || '#3b82f6'}"/>
          <text x="${TIP_PAD + 10}" y="20" fill="#e5e7eb" font-size="${TIP_NAME_FONT}" font-weight="bold">${escapeXml(p.model.shortName)}</text>
          <text x="${TIP_PAD}" y="40" fill="#9ca3af" font-size="${TIP_FONT}">${COST_LABEL}</text>
          <text x="${tipWidth - TIP_PAD}" y="40" text-anchor="end" fill="#f9fafb" font-size="${TIP_NAME_FONT}" font-weight="bold">${cost}</text>
          <text x="${TIP_PAD}" y="58" fill="#9ca3af" font-size="${TIP_FONT}">${INTELLIGENCE_LABEL}</text>
          <text x="${tipWidth - TIP_PAD}" y="58" text-anchor="end" fill="#f9fafb" font-size="${TIP_NAME_FONT}" font-weight="bold">${intelligence}</text>
        </g>
      </g>`
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="w-full h-auto bg-neutral-900 rounded-lg p-2 font-sans border border-neutral-800">
      <style>
        .tip { opacity: 0; pointer-events: none; transition: opacity 0.12s ease; }
        .pt:hover .tip { opacity: 1; }
        .pt { cursor: pointer; }
      </style>

      <!-- Background & Axes -->
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#555" stroke-width="1.5"/>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#555" stroke-width="1.5"/>
      
      <!-- Grid & Quadrant -->
      ${gridSvg}

      <!-- Pareto Line -->
      ${paretoLineSvg}

      <!-- Points -->
      ${pointsSvg}

      <!-- Labels -->
      ${labelsSvg}

      <!-- Axis Labels -->
      <text x="${(width - padding.right + padding.left) / 2}" y="${height - 15}" fill="#bbb" font-size="11" font-weight="600" text-anchor="middle">Cost per Task (USD, Log Scale)</text>
      <text transform="rotate(-90)" x="${-(height - padding.bottom + padding.top) / 2}" y="20" fill="#bbb" font-size="11" font-weight="600" text-anchor="middle">Artificial Analysis Intelligence Index</text>

      <!-- Legend -->
      <g transform="translate(${width - 220}, 20)">
        <line x1="0" y1="5" x2="20" y2="5" stroke="#10b981" stroke-width="2" stroke-dasharray="3 3"/>
        <text x="26" y="8" fill="#10b981" font-size="10" font-weight="600">Pareto Frontier</text>
        <circle cx="120" cy="5" r="4" fill="#3b82f6"/>
        <text x="130" y="8" fill="#bbb" font-size="10">Active Models</text>
      </g>

      <!-- Hover tooltips -->
      ${tooltipsSvg}
    </svg>
  `.trim()
}

const LABEL_OFFSETS: Array<{ dx: number; dy: number; anchor: string }> = (() => {
  const offsets: Array<{ dx: number; dy: number; anchor: string }> = []
  for (const radius of [14, 22, 32, 44, 58, 74]) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8
      const dx = Math.cos(angle) * radius
      const dy = Math.sin(angle) * radius
      offsets.push({ dx, dy, anchor: dx > 6 ? 'start' : dx < -6 ? 'end' : 'middle' })
    }
  }
  return offsets
})()

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '\'':
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

const ONLY_MY_MODELS_LABEL: LocalizedString = {
  en: 'Only models available in configured providers',
  fr: 'Uniquement les modèles disponibles dans les fournisseurs configurés',
}

function buildOnlyMyModelsToggle(onlyMyModels: boolean): DeclarativeNode {
  return {
    type: 'stack',
    direction: 'row',
    align: 'center',
    gap: 'sm',
    children: [
      {
        type: 'text',
        text: ONLY_MY_MODELS_LABEL,
        className: 'text-sm text-text-primary',
      },
      {
        type: 'toggle',
        id: 'pareto-only-my-models',
        enabled: onlyMyModels,
        label: ONLY_MY_MODELS_LABEL,
        onActivate: {
          kind: 'rpc',
          method: 'pareto.toggleFilter',
        },
      },
    ],
  }
}

/**
 * Builds the complete declarative UI tree for the Pareto Modal panel.
 */
export function buildParetoModalDeclarativeTree(
  dataset: ParetoDataset,
  options: { onlyMyModels?: boolean } = {},
): DeclarativeNode[] {
  const onlyMyModels = options.onlyMyModels ?? false
  const svg = generateParetoSvg(dataset)
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  if (onlyMyModels && dataset.models.length === 0) {
    return [
      {
        type: 'stack',
        direction: 'row',
        align: 'center',
        justify: 'between',
        className: 'mb-4 pb-2 border-b border-border flex-wrap gap-2',
        children: [
          {
            type: 'stack',
            direction: 'column',
            gap: 'xs',
            children: [
              {
                type: 'text',
                text: {
                  en: 'Intelligence Index vs Cost per Task',
                  fr: 'Indice d\u2019intelligence vs Co\u00fbt par t\u00e2che',
                },
                className: 'text-lg font-bold text-text-primary',
              },
              {
                type: 'text',
                text: {
                  en: `Last synchronized: ${dataset.lastSync || 'Never'} (via artificialanalysis.ai) \u2022 Showing: My Configured Models (0)`,
                  fr: `Dernière synchronisation : ${dataset.lastSync || 'Jamais'} (via artificialanalysis.ai) • Affichage : Mes modèles configurés (0)`,
                },
                muted: true,
                className: 'text-xs text-text-muted',
              },
            ],
          },
          buildOnlyMyModelsToggle(true),
        ],
      },
      {
        type: 'card',
        className: 'p-8 text-center border border-border rounded-lg',
        children: [
          {
            type: 'stack',
            direction: 'column',
            align: 'center',
            gap: 'md',
            children: [
              {
                type: 'text',
                text: {
                  en: 'No models found from your configured providers',
                  fr: 'Aucun modèle trouvé dans vos fournisseurs configurés',
                },
                className: 'text-base font-semibold text-text-primary',
              },
              {
                type: 'text',
                text: {
                  en: 'Configure providers with models in OpenFox settings, or turn off "Only models available in configured providers" to browse all benchmark models.',
                  fr: 'Configurez des fournisseurs avec des modèles dans les paramètres OpenFox, ou désactivez « Uniquement les modèles disponibles dans les fournisseurs configurés » pour parcourir tous les modèles du benchmark.',
                },
                muted: true,
                className: 'text-sm text-text-muted max-w-md',
              },
            ],
          },
        ],
      },
    ]
  }

  return [
    {
      type: 'stack',
      direction: 'row',
      align: 'center',
      justify: 'between',
      className: 'mb-4 pb-2 border-b border-border flex-wrap gap-2',
      children: [
        {
          type: 'stack',
          direction: 'column',
          gap: 'xs',
          children: [
            {
              type: 'text',
              text: {
                en: 'Intelligence Index vs Cost per Task',
                fr: 'Indice d’intelligence vs Coût par tâche',
              },
              className: 'text-lg font-bold text-text-primary',
            },
            {
              type: 'text',
              text: {
                en: `Last synchronized: ${dataset.lastSync || 'Never'} (via artificialanalysis.ai) • Showing: ${onlyMyModels ? 'My Configured Models' : 'All Benchmark Models'} (${dataset.models.length})`,
                fr: `Dernière synchronisation : ${dataset.lastSync || 'Jamais'} (via artificialanalysis.ai) • Affichage : ${onlyMyModels ? 'Mes modèles configurés' : 'Tous les modèles du benchmark'} (${dataset.models.length})`,
              },
              muted: true,
              className: 'text-xs text-text-muted',
            },
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          align: 'center',
          gap: 'sm',
          justify: 'end',
          className: 'shrink-0 flex-wrap',
          children: [
            {
              type: 'stack',
              direction: 'column',
              gap: 'none',
              className: 'shrink-0',
              children: [buildOnlyMyModelsToggle(onlyMyModels)],
            },
            {
              type: 'stack',
              direction: 'column',
              gap: 'none',
              className: 'shrink-0',
              children: [
                {
                  type: 'button',
                  id: 'pareto-sync-btn',
                  label: {
                    en: 'Sync Data',
                    fr: 'Synchroniser',
                  },
                  icon: 'refresh',
                  variant: 'default',
                  onActivate: {
                    kind: 'rpc',
                    method: 'pareto.sync',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'card',
      className: 'mb-4 p-2 bg-bg-primary border border-border rounded-lg overflow-hidden w-full',
      children: [
        {
          type: 'iframe',
          url: svgDataUrl,
          height: 520,
          width: '100%',
        },
      ],
    },
    {
      type: 'card',
      title: onlyMyModels
        ? {
            en: 'My Configured Models Comparison',
            fr: 'Comparatif de mes modèles configurés',
          }
        : {
            en: 'All Benchmark Models Comparison',
            fr: 'Comparatif de tous les modèles du benchmark',
          },
      subtitle: {
        en: '⭐ Indicates models located on the Pareto efficiency frontier',
        fr: '⭐ Indique les modèles situés sur la frontière d’efficacité de Pareto',
      },
      children: [buildComparisonGrid(dataset.models, onlyMyModels)],
    },
  ]
}

/**
 * The declarative `table` node only renders plain-text cells, so the comparison
 * grid is built from stacks: that is the only way to show a provider icon
 * (declarative `icon` node) next to the provider name.
 */
function buildComparisonGrid(models: ParetoModelPoint[], onlyMyModels: boolean): DeclarativeNode {
  const columns: Array<{ label: LocalizedString; className: string; align: 'left' | 'right' }> = [
    { label: { en: 'Model', fr: 'Modèle' }, className: 'flex-1 min-w-0', align: 'left' },
    {
      label: onlyMyModels ? { en: 'Provider', fr: 'Fournisseur' } : { en: 'Creator', fr: 'Créateur' },
      className: 'w-40 shrink-0',
      align: 'left',
    },
    { label: { en: 'Intelligence', fr: 'Intelligence' }, className: 'w-24 shrink-0', align: 'right' },
    { label: { en: 'Cost / Task', fr: 'Coût / Tâche' }, className: 'w-28 shrink-0', align: 'right' },
    { label: { en: 'Input / 1M', fr: 'Entrée / 1M' }, className: 'w-24 shrink-0', align: 'right' },
    { label: { en: 'Output / 1M', fr: 'Sortie / 1M' }, className: 'w-24 shrink-0', align: 'right' },
    { label: { en: 'Price Origin', fr: 'Origine prix' }, className: 'w-36 shrink-0', align: 'left' },
  ]

  const headerRow: DeclarativeNode = {
    type: 'stack',
    direction: 'row',
    align: 'center',
    gap: 'sm',
    className: 'w-full border-b border-border pb-1',
    children: columns.map((column) =>
      buildCell(column.className, [
        buildText(
          column.label,
          `text-xs text-text-muted font-medium${column.align === 'right' ? ' text-right' : ''}`,
        ),
      ]),
    ),
  }

  const rows: DeclarativeNode[] = models.map((m) => {
    const providerCell = onlyMyModels
      ? buildCell('w-40 shrink-0', [
          {
            type: 'stack',
            direction: 'row',
            align: 'center',
            gap: 'xs',
            className: 'min-w-0',
            children: [
              ...(m.providerLogo
                ? [{ type: 'icon', icon: providerIconMarkup(m.providerLogo), className: 'w-4 h-4 shrink-0' }]
                : []),
              buildText(m.providerName ?? '-', 'min-w-0 truncate text-sm text-text-primary'),
            ],
          },
        ])
      : buildCell('w-40 shrink-0', [buildText(m.creator, 'truncate text-sm text-text-primary')])

    return {
      type: 'stack',
      direction: 'row',
      align: 'center',
      gap: 'sm',
      className: 'w-full border-b border-border py-1',
      children: [
        buildCell('flex-1 min-w-0', [
          buildText(m.isParetoOptimal ? `⭐ ${m.shortName}` : m.shortName, 'truncate text-sm text-text-primary'),
        ]),
        providerCell,
        buildCell('w-24 shrink-0', [
          buildText(m.intelligenceIndex > 0 ? m.intelligenceIndex.toFixed(1) : '-', 'text-right text-sm text-text-primary'),
        ]),
        buildCell('w-28 shrink-0', [
          buildText(m.costPerTask > 0 ? `$${m.costPerTask.toFixed(4)}` : '-', 'text-right text-sm text-text-primary'),
        ]),
        buildCell('w-24 shrink-0', [
          buildText(typeof m.inputPrice === 'number' ? `$${m.inputPrice.toFixed(2)}` : '-', 'text-right text-sm text-text-primary'),
        ]),
        buildCell('w-24 shrink-0', [
          buildText(typeof m.outputPrice === 'number' ? `$${m.outputPrice.toFixed(2)}` : '-', 'text-right text-sm text-text-primary'),
        ]),
        buildCell('w-36 shrink-0', [
          buildText(
            m.priceSource === 'openfox_custom'
              ? 'OpenFox Config'
              : m.intelligenceIndex > 0
                ? 'Artificial Analysis'
                : '-',
            'truncate text-sm text-text-muted',
          ),
        ]),
      ],
    }
  })

  return {
    type: 'stack',
    direction: 'column',
    gap: 'none',
    className: 'w-full',
    children: [headerRow, ...rows],
  }
}

function buildText(text: string | LocalizedString, className: string): DeclarativeNode {
  // The declarative `text` node only localizes `{ en, fr }` objects: a plain
  // string would render as an empty cell.
  return { type: 'text', text: typeof text === 'string' ? { en: text, fr: text } : text, className }
}

function buildCell(className: string, children: DeclarativeNode[]): DeclarativeNode {
  return { type: 'stack', direction: 'column', align: 'stretch', gap: 'none', className, children }
}

/**
 * The declarative `icon` node accepts raw SVG markup but not image URLs, so an
 * image logo is wrapped in an inline SVG `<image>` element.
 */
export function providerIconMarkup(logo: string): string {
  const trimmed = logo.trim()
  if (trimmed.startsWith('<svg')) return trimmed
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><image href="${escapeXml(trimmed)}" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet"/></svg>`
}
