import { describe, it, expect, vi } from 'vitest'
import { computeParetoFrontier, markParetoOptimality } from './pareto.js'
import { extractArtificialAnalysisModels, FALLBACK_ARTIFICIAL_ANALYSIS_MODELS } from './fetcher.js'
import { matchModel, buildParetoDatasetFromConfig, normalizeKey, getOpenFoxConfiguredModels } from './models-filter.js'
import { generateParetoSvg, buildParetoModalDeclarativeTree, providerIconMarkup } from './renderer.js'
import { register, buildHeaderButton } from './index.js'
import type { DeclarativeNode, ParetoModelPoint, PluginContext, PluginRegistry } from './types.js'

/**
 * Real Artificial Analysis sync (27 models) used to check label placement at
 * the density the plugin actually faces.
 */
const AA_LIVE_MODELS = [
  { shortName: 'Gemini 3.5 Flash-Lite', intelligenceIndex: 22.1685424839812, costPerTask: 0.1235, isParetoOptimal: false },
  { shortName: 'Step 5 Preview', intelligenceIndex: 43.7343049141614, costPerTask: 0.7175, isParetoOptimal: false },
  { shortName: 'Inkling', intelligenceIndex: 24.9847810999384, costPerTask: 0.5, isParetoOptimal: false },
  { shortName: 'GLM-5.3-Flash', intelligenceIndex: 41.807466113455, costPerTask: 0.2533, isParetoOptimal: false },
  { shortName: 'MiMo-V2.6-Pro', intelligenceIndex: 46.3242065310383, costPerTask: 0.1332, isParetoOptimal: true },
  { shortName: 'MiniMax-M3', intelligenceIndex: 29.2202932236316, costPerTask: 0.5076, isParetoOptimal: false },
  { shortName: 'GPT-6 Astra (max)', intelligenceIndex: 52.673669395513, costPerTask: 3.2575, isParetoOptimal: true },
  { shortName: 'Claude Opus 5.5 (max with fallback)', intelligenceIndex: 57.6223698102963, costPerTask: 5.982, isParetoOptimal: true },
  { shortName: 'Claude Fable 5.1 (max with fallback)', intelligenceIndex: 53.3549259623252, costPerTask: 7.6297, isParetoOptimal: false },
  { shortName: 'GPT-5.6 Luna (max)', intelligenceIndex: 37.3244239690841, costPerTask: 0.1783, isParetoOptimal: false },
  { shortName: 'Muse Glimmer (high)', intelligenceIndex: 17.4754176089465, costPerTask: 0.0567, isParetoOptimal: true },
  { shortName: 'Grok 4.7 (xhigh)', intelligenceIndex: 46.4465506302286, costPerTask: 3.7383, isParetoOptimal: false },
  { shortName: 'Nemotron 3 Ultra', intelligenceIndex: 22.9279123422858, costPerTask: 0.5976, isParetoOptimal: false },
  { shortName: 'GPT-6 Luna (max)', intelligenceIndex: 37.2559686869738, costPerTask: 0.0679, isParetoOptimal: true },
  { shortName: 'Gemini 3.8 Flash (high)', intelligenceIndex: 40.9262321765904, costPerTask: 1.2428, isParetoOptimal: false },
  { shortName: 'Muse Spark 1.3 (max)', intelligenceIndex: 48.0923107719685, costPerTask: 1.6049, isParetoOptimal: true },
  { shortName: 'Qwen3.8 27B (xhigh)', intelligenceIndex: 33.6962858057476, costPerTask: 1.0073, isParetoOptimal: false },
  { shortName: 'Qwen3.8 Max (0902)', intelligenceIndex: 45.4152084980521, costPerTask: 5.4085, isParetoOptimal: false },
  { shortName: 'Claude Sonnet 5.5 (max with fallback)', intelligenceIndex: 55.9779549012591, costPerTask: 7.6026, isParetoOptimal: false },
  { shortName: 'Claude Opus 5 (max)', intelligenceIndex: 50.7771115797629, costPerTask: 5.8584, isParetoOptimal: false },
  { shortName: 'GPT-6 Sol (max)', intelligenceIndex: 47.5276426437724, costPerTask: 1.0494, isParetoOptimal: true },
  { shortName: 'GLM-5.3 (max)', intelligenceIndex: 44.777392385614, costPerTask: 2.0056, isParetoOptimal: false },
  { shortName: 'GPT-5.6 Sol (max)', intelligenceIndex: 46.9727068915036, costPerTask: 1.9885, isParetoOptimal: false },
  { shortName: 'DeepSeek V4.1 Flash (max)', intelligenceIndex: 39.456167472527, costPerTask: 0.2652, isParetoOptimal: false },
  { shortName: 'Mistral Medium 3.5', intelligenceIndex: 14.1889227802691, costPerTask: 0.502, isParetoOptimal: false },
  { shortName: 'gpt-oss-120b (high)', intelligenceIndex: 11.6028431512592, costPerTask: 0.1074, isParetoOptimal: false },
  { shortName: 'Kimi K3 (max)', intelligenceIndex: 43.5938229518782, costPerTask: 2.0001, isParetoOptimal: false },
] as const

describe('pareto algorithm', () => {
  it('correctly calculates 2D Pareto frontier', () => {
    const points: ParetoModelPoint[] = [
      {
        id: 'model-a',
        slug: 'a',
        name: 'Model A',
        shortName: 'A',
        creator: 'OpenAI',
        color: '#000',
        intelligenceIndex: 50,
        costPerTask: 1.0,
        priceSource: 'artificial_analysis',
        isParetoOptimal: false,
      },
      {
        id: 'model-b',
        slug: 'b',
        name: 'Model B (Dominated by A: lower intel, same cost)',
        shortName: 'B',
        creator: 'OpenAI',
        color: '#000',
        intelligenceIndex: 40,
        costPerTask: 1.0,
        priceSource: 'artificial_analysis',
        isParetoOptimal: false,
      },
      {
        id: 'model-c',
        slug: 'c',
        name: 'Model C (Cheap & Fast)',
        shortName: 'C',
        creator: 'Google',
        color: '#34a853',
        intelligenceIndex: 35,
        costPerTask: 0.2,
        priceSource: 'artificial_analysis',
        isParetoOptimal: false,
      },
      {
        id: 'model-d',
        slug: 'd',
        name: 'Model D (Top Intelligence, High Cost)',
        shortName: 'D',
        creator: 'Anthropic',
        color: '#cc785c',
        intelligenceIndex: 60,
        costPerTask: 5.0,
        priceSource: 'artificial_analysis',
        isParetoOptimal: false,
      },
    ]

    const frontier = computeParetoFrontier(points)
    expect(frontier.map((m) => m.id)).toEqual(['model-c', 'model-a', 'model-d'])

    const marked = markParetoOptimality(points)
    expect(marked.find((m) => m.id === 'model-b')?.isParetoOptimal).toBe(false)
    expect(marked.find((m) => m.id === 'model-a')?.isParetoOptimal).toBe(true)
    expect(marked.find((m) => m.id === 'model-c')?.isParetoOptimal).toBe(true)
    expect(marked.find((m) => m.id === 'model-d')?.isParetoOptimal).toBe(true)
  })
})

describe('fetcher and parser', () => {
  it('returns fallback models when HTML payload is invalid', () => {
    const parsed = extractArtificialAnalysisModels('<html><body>Nothing here</body></html>')
    expect(parsed.length).toBe(FALLBACK_ARTIFICIAL_ANALYSIS_MODELS.length)
    expect(parsed[0]?.slug).toBe(FALLBACK_ARTIFICIAL_ANALYSIS_MODELS[0]?.slug)
  })

  it('terminates when the RSC payload contains no ["id" marker (regression: infinite loop)', () => {
    const models = [
      {
        id: 'm1',
        slug: 'm1',
        name: 'Model One',
        intelligenceIndex: 80,
        intelligenceIndexCostPerTask: { cost: { total: 1 } },
      },
    ]
    const inner = JSON.stringify(JSON.stringify(models)).slice(1, -1)
    const html = `<script>self.__next_f.push([1,"${inner}"])</script>`

    const parsed = extractArtificialAnalysisModels(html)
    expect(parsed.length).toBe(1)
    expect(parsed[0]?.slug).toBe('m1')
  })

  it('extracts models from a payload that contains both markers', () => {
    const models = [
      { id: 'a', slug: 'a', name: 'A', intelligenceIndex: 70, intelligenceIndexCostPerTask: { cost: { total: 2 } } },
      { id: 'b', slug: 'b', name: 'B', intelligenceIndex: 90, intelligenceIndexCostPerTask: { cost: { total: 5 } } },
    ]
    const inner = JSON.stringify(JSON.stringify(models)).slice(1, -1)
    const html = `<script>self.__next_f.push([1,"${inner}"])</script>`

    const parsed = extractArtificialAnalysisModels(html)
    expect(parsed.map((m) => m.slug)).toEqual(['a', 'b'])
  })
})

describe('matching and price overrides', () => {
  it('normalizes model names accurately', () => {
    expect(normalizeKey('anthropic/claude-3-5-sonnet-20241022')).toBe('claude35sonnet')
    expect(normalizeKey('gemini-2.5-flash-preview')).toBe('gemini25flash')
    expect(normalizeKey('GPT-5.6 Luna (1M context)')).toBe('gpt56luna')
    expect(normalizeKey('Muse Spark 1.3 Contributor')).toBe('musespark13')
    expect(normalizeKey('Qwen3.8 Max (0902)')).toBe('qwen38')
  })

  it('matches OpenFox model ids to Artificial Analysis catalog', () => {
    const matched = matchModel('claude-opus-4', undefined, FALLBACK_ARTIFICIAL_ANALYSIS_MODELS)
    expect(matched).toBeDefined()
    expect(matched?.slug).toBe('claude-opus-4')

    const matchedSuffix = matchModel('gpt-5-6-luna-1m', 'GPT-5.6 Luna (1M context)', [
      { id: 'gpt-5-6-luna', slug: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', shortName: 'GPT-5.6 Luna', intelligenceIndex: 37.3, creator: 'OpenAI', price1mInputTokens: 0.1, price1mOutputTokens: 0.5 },
    ])
    expect(matchedSuffix).toBeDefined()
    expect(matchedSuffix?.slug).toBe('gpt-5-6-luna')
  })

  it('filters out OpenFox configured models not available on Artificial Analysis, while preserving all matched models per provider', () => {
    const configured = [
      {
        providerId: 'opencode-go',
        providerName: 'OpenCode Go',
        modelId: 'space-bunny-free',
        modelName: 'Space Bunny Free',
      },
      {
        providerId: 'opencode-go',
        providerName: 'OpenCode Go',
        modelId: 'gpt-5-6-luna-max',
        modelName: 'GPT-5.6 Luna (max)',
      },
      {
        providerId: 'google-antigravity',
        providerName: 'Google Antigravity',
        modelId: 'gpt-5-6-luna',
        modelName: 'GPT-5.6 Luna',
      },
    ]

    const aaCatalog = [
      { id: 'gpt-5-6-luna', slug: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', shortName: 'GPT-5.6 Luna', intelligenceIndex: 37.3, costPerTask: { cost: { total: 0.1783 } }, creator: 'OpenAI', price1mInputTokens: 0.1, price1mOutputTokens: 0.5 },
    ]

    const dataset = buildParetoDatasetFromConfig(configured, aaCatalog)
    // Space Bunny Free (unbenchmarked) must NOT be present
    expect(dataset.find((m) => m.name === 'Space Bunny Free')).toBeUndefined()

    // Both provider instances of Luna (matched) must be present with their respective provider info
    expect(dataset).toHaveLength(2)

    const openCodeLuna = dataset.find((m) => m.providerName === 'OpenCode Go' && m.name === 'GPT-5.6 Luna (max)')
    expect(openCodeLuna).toBeDefined()
    expect(openCodeLuna?.intelligenceIndex).toBe(37.3)

    const antigravityLuna = dataset.find((m) => m.providerName === 'Google Antigravity' && m.name === 'GPT-5.6 Luna')
    expect(antigravityLuna).toBeDefined()
    expect(antigravityLuna?.intelligenceIndex).toBe(37.3)
  })

  it('re-weights cost per task if custom OpenFox prices are defined', () => {
    const configured = [
      {
        providerId: 'anthropic-prov',
        providerName: 'Anthropic',
        modelId: 'claude-opus-4',
        modelName: 'Claude Opus 4',
        customPricing: {
          inputPrice: 7.5, // Half the AA input price ($15 -> $7.5)
          outputPrice: 37.5, // Half the AA output price ($75 -> $37.5)
        },
      },
    ]

    const dataset = buildParetoDatasetFromConfig(configured, FALLBACK_ARTIFICIAL_ANALYSIS_MODELS)
    expect(dataset.length).toBe(1)
    expect(dataset[0]?.priceSource).toBe('openfox_custom')
    expect(dataset[0]?.costPerTask).toBeCloseTo(4.8 * 0.5, 2)
  })
})

describe('renderer', () => {
  it('generates valid SVG and declarative modal tree', () => {
    const dataset = {
      lastSync: '2026-09-29 10:00:00',
      models: [
        {
          id: 'test-model',
          slug: 'test',
          name: 'Test Model',
          shortName: 'Test',
          creator: 'OpenAI',
          color: '#000',
          intelligenceIndex: 50,
          costPerTask: 1.0,
          priceSource: 'artificial_analysis' as const,
          isParetoOptimal: true,
        },
      ],
      paretoFrontier: [],
    }

    const svg = generateParetoSvg(dataset)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Test')

    const nodes = buildParetoModalDeclarativeTree(dataset, { onlyMyModels: false })
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes[0]?.type).toBe('stack')

    const nodesFiltered = buildParetoModalDeclarativeTree(dataset, { onlyMyModels: true })
    expect(JSON.stringify(nodesFiltered)).toContain('pareto.toggleFilter')
    expect(JSON.stringify(nodesFiltered)).toContain('Only models available in configured providers')
    expect(JSON.stringify(nodesFiltered)).toContain('"type":"toggle"')
  })

  it('exposes the configured-providers filter as a toggle, not a "show all" button', () => {
    const dataset = {
      lastSync: '2026-09-29 10:00:00',
      models: [
        {
          id: 'test-model',
          slug: 'test',
          name: 'Test Model',
          shortName: 'Test',
          creator: 'OpenAI',
          color: '#000',
          intelligenceIndex: 50,
          costPerTask: 1.0,
          priceSource: 'artificial_analysis' as const,
          isParetoOptimal: true,
        },
      ],
      paretoFrontier: [],
    }

    const findToggles = (nodes: DeclarativeNode[]): any[] =>
      nodes.flatMap((n) => {
        const found = n.type === 'toggle' ? [n] : []
        const children = Array.isArray((n as any).children) ? (n as any).children : []
        return [...found, ...findToggles(children)]
      })

    const off = findToggles(buildParetoModalDeclarativeTree(dataset, { onlyMyModels: false }))
    expect(off).toHaveLength(1)
    expect(off[0]?.enabled).toBe(false)
    expect(off[0]?.onActivate?.method).toBe('pareto.toggleFilter')

    const on = findToggles(buildParetoModalDeclarativeTree(dataset, { onlyMyModels: true }))
    expect(on[0]?.enabled).toBe(true)

    expect(JSON.stringify(buildParetoModalDeclarativeTree(dataset, { onlyMyModels: false }))).not.toContain(
      'Show All Benchmark Models',
    )
  })

  it('deduplicates identical benchmark models on the SVG chart when multiple providers offer the same model', () => {
    const models: ParetoModelPoint[] = [
      {
        id: 'opencode:gpt-5-6-luna',
        slug: 'gpt-5-6-luna',
        name: 'GPT 5.6 Luna',
        shortName: 'GPT-5.6 Luna (max)',
        creator: 'OpenCode Go',
        color: '#3b82f6',
        intelligenceIndex: 37.3,
        costPerTask: 0.1783,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
      },
      {
        id: 'copilot:gpt-5-6-luna',
        slug: 'gpt-5-6-luna',
        name: 'GPT-5.6 Luna',
        shortName: 'GPT-5.6 Luna (max)',
        creator: 'GitHub Copilot',
        color: '#3b82f6',
        intelligenceIndex: 37.3,
        costPerTask: 0.1783,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
      },
      {
        id: 'copilot:gpt-5-6-luna-1m',
        slug: 'gpt-5-6-luna',
        name: 'GPT-5.6 Luna (1M context)',
        shortName: 'GPT-5.6 Luna (max)',
        creator: 'GitHub Copilot',
        color: '#3b82f6',
        intelligenceIndex: 37.3,
        costPerTask: 0.1783,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
      },
    ]

    const svg = generateParetoSvg({ lastSync: '', models, paretoFrontier: [] })
    const labels = [...svg.matchAll(/class="lbl" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
    // Exactly ONE label on the chart for the benchmark model, not three
    expect(labels).toHaveLength(1)
    expect(labels[0]?.[4]).toBe('GPT-5.6 Luna (max)')
  })

  it('places Pareto labels without overlapping each other', () => {
    const models = Array.from({ length: 6 }, (_, i) => ({
      id: `m${i}`,
      slug: `m${i}`,
      name: `Model ${i}`,
      shortName: `Model ${i} (max with fallback)`,
      creator: 'OpenAI',
      color: '#3b82f6',
      intelligenceIndex: 40 + i * 0.5,
      costPerTask: 1 + i * 0.01,
      priceSource: 'artificial_analysis' as const,
      isParetoOptimal: true,
    }))

    const svg = generateParetoSvg({ lastSync: '', models, paretoFrontier: [] })
    const texts = [...svg.matchAll(/class="lbl" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)].map(
      (m) => ({ x: Number(m[1]), y: Number(m[2]), anchor: m[3], text: m[4] ?? '' }),
    )

    expect(texts.length).toBeGreaterThan(0)
    const charW = 11 * 0.6
    const boxes = texts.map((t) => {
      const w = t.text.length * charW
      const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
      return { x: x - 2, y: t.y - 11, w: w + 4, h: 15 }
    })
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!
        const b = boxes[j]!
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        expect(overlap, `labels ${i} and ${j} overlap`).toBe(false)
      }
    }
  })

  it('labels every plotted point, including non-Pareto-optimal models', () => {
    const models: ParetoModelPoint[] = AA_LIVE_MODELS.map((m, index) => ({
      id: `m${index}`,
      slug: `m${index}`,
      name: m.shortName,
      shortName: m.shortName,
      creator: 'OpenAI',
      color: '#3b82f6',
      intelligenceIndex: m.intelligenceIndex,
      costPerTask: m.costPerTask,
      priceSource: 'artificial_analysis' as const,
      isParetoOptimal: m.isParetoOptimal,
    }))

    const svg = generateParetoSvg({ lastSync: '', models, paretoFrontier: [] })
    const labels = [...svg.matchAll(/class="lbl" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)].map(
      (m) => ({ x: Number(m[1]), y: Number(m[2]), anchor: m[3], text: m[4] ?? '' }),
    )

    // One label per point: no dot is left anonymous.
    expect(models.filter((m) => !m.isParetoOptimal).length).toBeGreaterThan(0)
    expect(labels).toHaveLength(models.length)
    for (const model of models) {
      expect(labels.some((l) => l.text === model.shortName), `missing label for ${model.shortName}`).toBe(true)
    }

    const boxes = labels.map((t) => {
      const w = t.text.length * 11 * 0.6
      const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
      return { x: x - 2, y: t.y - 11, w: w + 4, h: 15, text: t.text }
    })
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!
        const b = boxes[j]!
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        expect(overlap, `labels "${a.text}" and "${b.text}" overlap`).toBe(false)
      }
    }
  })

  it('renders a hover tooltip with the cost and the intelligence index for each point', () => {
    const models: ParetoModelPoint[] = [
      {
        id: 'a',
        slug: 'a',
        name: 'Model A',
        shortName: 'Model A',
        creator: 'OpenAI',
        color: '#3b82f6',
        intelligenceIndex: 46.4,
        costPerTask: 0.13,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
      },
      {
        id: 'b',
        slug: 'b',
        name: 'Model B',
        shortName: 'Model B',
        creator: 'Google',
        color: '#34a853',
        intelligenceIndex: 22.2,
        costPerTask: 1.5,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: false,
      },
    ]

    const svg = generateParetoSvg({ lastSync: '', models, paretoFrontier: [] })

    // CSS-only tooltip: no script needed inside the sandboxed data: iframe.
    expect(svg).toContain('.pt:hover .tip')
    expect((svg.match(/class="pt"/g) ?? []).length).toBe(models.length)
    expect((svg.match(/class="tip"/g) ?? []).length).toBe(models.length)
    expect(svg).toContain('Cost per Task (USD, Log Scale)')
    expect(svg).toContain('Artificial Analysis Intelligence Index')
    expect(svg).toContain('>$0.13<')
    expect(svg).toContain('>$1.50<')
    expect(svg).toContain('>46<')
    expect(svg).toContain('>22<')
  })

  it('shows the OpenFox provider name and logo in the comparison grid when filtering', () => {
    const models: ParetoModelPoint[] = [
      {
        id: 'claude-opus-4-7',
        slug: 'claude-opus-4-7',
        name: 'Claude Opus 4.7',
        shortName: 'Claude Opus 4.7',
        creator: 'Anthropic',
        color: '#cc785c',
        intelligenceIndex: 46,
        costPerTask: 0.13,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
        providerId: 'provider-1',
        providerName: 'GitHub Copilot',
        providerLogo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2"/></svg>',
      },
    ]

    const filtered = JSON.stringify(buildParetoModalDeclarativeTree({ lastSync: '', models, paretoFrontier: [] }, { onlyMyModels: true }))
    expect(filtered).toContain('GitHub Copilot')
    expect(filtered).toContain('"type":"icon"')
    expect(filtered).toContain('M12 2')
    expect(filtered).toContain('Provider')
    expect(filtered).not.toContain('"type":"table"')
    // Cells must be localized objects: a plain string renders as an empty cell.
    expect(filtered).toContain('"en":"⭐ Claude Opus 4.7"')
    expect(filtered).toContain('"en":"46.0"')
    expect(filtered).toContain('"en":"$0.1300"')

    const all = JSON.stringify(buildParetoModalDeclarativeTree({ lastSync: '', models, paretoFrontier: [] }, { onlyMyModels: false }))
    expect(all).toContain('Anthropic')
    expect(all).toContain('Creator')
    expect(all).not.toContain('"type":"icon"')
  })

  it('wraps image provider logos in an inline SVG <image> so the icon node can render them', () => {
    const markup = providerIconMarkup('/assets/providers/lmstudio.webp')
    expect(markup.startsWith('<svg')).toBe(true)
    expect(markup).toContain('<image href="/assets/providers/lmstudio.webp"')

    const inlineSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>'
    expect(providerIconMarkup(inlineSvg)).toBe(inlineSvg)
  })

  it('keeps the sync button label on a single line', () => {
    const models: ParetoModelPoint[] = [
      {
        id: 'a',
        slug: 'a',
        name: 'Model A',
        shortName: 'Model A',
        creator: 'OpenAI',
        color: '#3b82f6',
        intelligenceIndex: 46,
        costPerTask: 0.13,
        priceSource: 'artificial_analysis' as const,
        isParetoOptimal: true,
      },
    ]

    const findParent = (
      nodes: DeclarativeNode[],
      predicate: (node: any) => boolean,
    ): DeclarativeNode | undefined => {
      for (const node of nodes) {
        const children = Array.isArray((node as any).children) ? ((node as any).children as DeclarativeNode[]) : []
        if (children.some(predicate)) return node
        const nested = findParent(children, predicate)
        if (nested) return nested
      }
      return undefined
    }

    for (const onlyMyModels of [true, false]) {
      const nodes = buildParetoModalDeclarativeTree({ lastSync: '', models, paretoFrontier: [] }, { onlyMyModels })
      const parent = findParent(nodes, (node) => node.id === 'pareto-sync-btn')
      expect(parent, 'sync button must sit in its own non-shrinking container').toBeDefined()
      expect(String((parent as any).className)).toContain('shrink-0')
    }
  })
})

describe('getOpenFoxConfiguredModels', () => {
  it('returns empty array when runtime is not set', async () => {
    const ctx: PluginContext = {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      settings: vi.fn().mockReturnValue({}),
      notify: vi.fn(),
      publish: vi.fn(),
    }
    const result = await getOpenFoxConfiguredModels(ctx)
    expect(result).toEqual([])
  })

  it('returns empty array when config.json does not exist', async () => {
    const ctx: PluginContext = {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      settings: vi.fn().mockReturnValue({}),
      notify: vi.fn(),
      publish: vi.fn(),
      runtime: { mode: 'development', configDirectory: '/nonexistent/path/xyz' },
    }
    const result = await getOpenFoxConfiguredModels(ctx)
    expect(result).toEqual([])
  })

  it('parses providers and models from config.json', async () => {
    const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const dir = await mkdtemp(join(tmpdir(), 'pareto-test-'))
    const config = {
      providers: [
        {
          id: 'anthropic',
          name: 'Anthropic',
          models: [
            { id: 'claude-opus-4', name: 'Claude Opus 4', inputPrice: 15, outputPrice: 75 },
            { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
          ],
        },
        {
          id: 'openai',
          name: 'OpenAI',
          models: [{ id: 'o3' }],
        },
      ],
    }
    await writeFile(join(dir, 'config.json'), JSON.stringify(config), 'utf8')

    const ctx: PluginContext = {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      settings: vi.fn().mockReturnValue({}),
      notify: vi.fn(),
      publish: vi.fn(),
      runtime: { mode: 'development', configDirectory: dir },
    }

    const result = await getOpenFoxConfiguredModels(ctx)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ providerId: 'anthropic', modelId: 'claude-opus-4', inputPrice: 15, outputPrice: 75 })
    expect(result[1]).toMatchObject({ providerId: 'anthropic', modelId: 'claude-sonnet-4-5' })
    expect(result[2]).toMatchObject({ providerId: 'openai', modelId: 'o3' })

    await rm(dir, { recursive: true })
  })

  it('skips providers without models array and models without id', async () => {
    const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const dir = await mkdtemp(join(tmpdir(), 'pareto-test-'))
    const config = {
      providers: [
        { id: 'empty-provider' },
        { id: 'prov', models: [{ id: '' }, { name: 'No ID model' }, { id: 'valid-model' }] },
      ],
    }
    await writeFile(join(dir, 'config.json'), JSON.stringify(config), 'utf8')

    const ctx: PluginContext = {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      settings: vi.fn().mockReturnValue({}),
      notify: vi.fn(),
      publish: vi.fn(),
      runtime: { mode: 'development', configDirectory: dir },
    }

    const result = await getOpenFoxConfiguredModels(ctx)
    expect(result).toHaveLength(1)
    expect(result[0]?.modelId).toBe('valid-model')

    await rm(dir, { recursive: true })
  })

  it('resolves provider logos from installed plugin manifests and builtin backends', async () => {
    const { writeFile, mkdtemp, mkdir, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const dir = await mkdtemp(join(tmpdir(), 'pareto-logo-'))
    const copilotSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2"/></svg>'
    await mkdir(join(dir, 'plugins', 'openfox-github-copilot'), { recursive: true })
    await writeFile(
      join(dir, 'plugins', 'openfox-github-copilot', 'package.json'),
      JSON.stringify({ name: 'openfox-github-copilot', openfox: { apiVersion: 2, icon: copilotSvg } }),
      'utf8',
    )
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({
        providers: [
          {
            id: 'p1',
            name: 'GitHub Copilot',
            backend: 'openai',
            authAdapter: 'github-copilot-auth',
            models: [{ id: 'claude-opus-4-7' }],
          },
          { id: 'p2', name: 'LM Studio', backend: 'lmstudio', models: [{ id: 'qwen3' }] },
          { id: 'p3', name: 'Mystery', backend: 'unknown-backend', models: [{ id: 'x' }] },
        ],
      }),
      'utf8',
    )

    const ctx: PluginContext = {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
      storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      settings: vi.fn().mockReturnValue({}),
      notify: vi.fn(),
      publish: vi.fn(),
      runtime: { mode: 'development', configDirectory: dir },
    }

    const result = await getOpenFoxConfiguredModels(ctx)
    expect(result.find((m) => m.providerId === 'p1')?.providerLogo).toBe(copilotSvg)
    expect(result.find((m) => m.providerId === 'p2')?.providerLogo).toBe('/assets/providers/lmstudio.webp')
    expect(result.find((m) => m.providerId === 'p3')?.providerLogo).toBeUndefined()

    await rm(dir, { recursive: true })
  })
})

describe('initPanel RPC — non-blocking sync', () => {
  it('returns cached content immediately without waiting for sync', async () => {
    let syncResolve: (() => void) | undefined

    const syncPromise = new Promise<void>((resolve) => {
      syncResolve = resolve
    })

    const rpcs: Record<string, Function> = {}
    const publishCalls: unknown[] = []

    const mockRegistry: PluginRegistry = {
      pluginId: 'openfox-pareto-line',
      runtime: { mode: 'development', configDirectory: '/tmp' },
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        settings: vi.fn().mockReturnValue({ autoSyncOnOpen: true }),
        notify: vi.fn(),
        publish: vi.fn((...args: unknown[]) => { publishCalls.push(args) }),
      },
      registerSettings: vi.fn(),
      registerUiAction: vi.fn(),
      registerUiComponent: vi.fn(),
      registerUiPanel: vi.fn(),
      registerRpc: (method, handler) => { rpcs[method] = handler },
      registerTool: vi.fn(),
    }

    await register(mockRegistry)

    const initRpc = rpcs['initPanel']
    expect(initRpc).toBeDefined()

    const start = Date.now()
    const result = await initRpc({ panelId: 'pareto-modal' })
    const elapsed = Date.now() - start

    expect(result).toBeDefined()
    expect(result.content).toBeDefined()
    expect(Array.isArray(result.content)).toBe(true)
    // Should return immediately from cache (well under 1 second), not wait for network
    expect(elapsed).toBeLessThan(1000)

    syncResolve?.()
    await syncPromise
  })
})

describe('plugin registration', () => {
  it('registers all UI actions, panel, settings and RPCs', async () => {
    const rpcs: Record<string, Function> = {}
    const actions: any[] = []
    const components: any[] = []
    let panel: any = null
    let settings: any = null
    let tool: any = null

    const mockRegistry: PluginRegistry = {
      pluginId: 'openfox-pareto-line',
      runtime: {
        mode: 'development',
        configDirectory: '/tmp',
      },
      context: {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
        storage: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
        },
        settings: vi.fn().mockReturnValue({ showInHeader: true }),
        notify: vi.fn(),
        publish: vi.fn(),
        providers: vi.fn().mockReturnValue([
          {
            id: 'openai',
            name: 'OpenAI',
            models: [{ id: 'gpt-6-sol', name: 'GPT-6 Sol' }],
          },
        ]),
      },
      registerSettings: (s) => {
        settings = s
      },
      registerUiAction: (a) => {
        actions.push(a)
      },
      registerUiComponent: (c) => {
        components.push(c)
      },
      registerUiPanel: (p) => {
        panel = p
      },
      registerRpc: (method, handler) => {
        rpcs[method] = handler
      },
      registerTool: (t) => {
        tool = t
      },
    }

    await register(mockRegistry)

    expect(settings).toBeDefined()
    expect(actions.length).toBe(1)
    expect(actions[0].slot).toBe('plugin.menu')
    expect(actions[0].label).toEqual({ en: 'Pareto Line', fr: 'Ligne de Pareto' })
    expect(components.length).toBe(1)
    expect(components[0].zone).toBe('header.actions')
    expect(components[0].contentSource).toEqual({
      kind: 'rpc',
      method: 'pareto.getHeaderButton',
      refreshMs: 2000,
    })
    expect(panel).toBeDefined()
    expect(panel.id).toBe('pareto-modal')
    expect(panel.size).toBe('2xl')
    expect(tool).toBeDefined()
    expect(rpcs['pareto.sync']).toBeDefined()
    expect(rpcs['pareto.toggleFilter']).toBeDefined()
    expect(rpcs['pareto.getDataset']).toBeDefined()
    expect(rpcs['pareto.getHeaderButton']).toBeDefined()

    // Test header button RPC
    const headerBtnRes = await rpcs['pareto.getHeaderButton']()
    expect(headerBtnRes.content).toBeDefined()
    expect(headerBtnRes.content.type).toBe('button')
    expect(headerBtnRes.content.label).toEqual({ en: 'Pareto Line', fr: 'Ligne de Pareto' })
    expect(headerBtnRes.content.title).toEqual({ en: 'Pareto Line', fr: 'Ligne de Pareto' })
    expect(JSON.stringify(headerBtnRes.content)).not.toContain('intelligence vs')
    expect(JSON.stringify(headerBtnRes.content)).not.toContain('Intelligence vs')

    // Test tool execution
    const toolRes = await tool.execute({})
    expect(toolRes.success).toBe(true)
    expect(toolRes.output).toContain('models')

    // Test toggle filter RPC
    const toggleRes = await rpcs['pareto.toggleFilter']({ onlyMyModels: true })
    expect(toggleRes.success).toBe(true)
    expect(toggleRes.onlyMyModels).toBe(true)
  })

  it('buildHeaderButton returns button when showInHeader is true, and empty stack when false', () => {
    const hidden = buildHeaderButton(false)
    expect(hidden).toEqual({
      type: 'stack',
      direction: 'row',
      children: [],
    })

    const visible = buildHeaderButton(true)
    expect(visible.type).toBe('button')
    expect(visible.id).toBe('pareto-header-btn')
    expect(visible.label).toEqual({ en: 'Pareto Line', fr: 'Ligne de Pareto' })
    expect(visible.title).toEqual({ en: 'Pareto Line', fr: 'Ligne de Pareto' })
    expect(JSON.stringify(visible)).not.toContain('intelligence vs')
    expect(JSON.stringify(visible)).not.toContain('Intelligence vs')
  })

  it('pareto.getHeaderButton returns empty stack when showInHeader setting is disabled', async () => {
    const rpcs: Record<string, Function> = {}

    const mockRegistry: PluginRegistry = {
      pluginId: 'openfox-pareto-line',
      runtime: { mode: 'development', configDirectory: '/tmp' },
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        settings: vi.fn().mockReturnValue({ showInHeader: false }),
        notify: vi.fn(),
        publish: vi.fn(),
      },
      registerSettings: vi.fn(),
      registerUiAction: vi.fn(),
      registerUiComponent: vi.fn(),
      registerUiPanel: vi.fn(),
      registerRpc: (method, handler) => {
        rpcs[method] = handler
      },
      registerTool: vi.fn(),
    }

    await register(mockRegistry)

    const res = await rpcs['pareto.getHeaderButton']()
    expect(res.content).toEqual({
      type: 'stack',
      direction: 'row',
      children: [],
    })
  })

  it('accepts the value param emitted by the declarative toggle node', async () => {
    const rpcs: Record<string, Function> = {}

    const mockRegistry: PluginRegistry = {
      pluginId: 'openfox-pareto-line',
      runtime: { mode: 'development', configDirectory: '/tmp' },
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        settings: vi.fn().mockReturnValue({}),
        notify: vi.fn(),
        publish: vi.fn(),
      },
      registerSettings: vi.fn(),
      registerUiAction: vi.fn(),
      registerUiComponent: vi.fn(),
      registerUiPanel: vi.fn(),
      registerRpc: (method, handler) => {
        rpcs[method] = handler
      },
      registerTool: vi.fn(),
    }

    await register(mockRegistry)

    const on = await rpcs['pareto.toggleFilter']({ value: 'true' })
    expect(on.success).toBe(true)
    expect(on.onlyMyModels).toBe(true)

    const off = await rpcs['pareto.toggleFilter']({ value: 'false' })
    expect(off.onlyMyModels).toBe(false)
  })
})

describe('RPC handlers resolve models from the plugin context', () => {
  it('reads configured models through an RPC even when a tool context is supplied', async () => {
    const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const dir = await mkdtemp(join(tmpdir(), 'pareto-rpc-'))
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({
        providers: [{ id: 'anthropic', name: 'Anthropic', models: [{ id: 'claude-opus-4' }] }],
      }),
      'utf8',
    )

    const rpcs: Record<string, Function> = {}

    const mockRegistry: PluginRegistry = {
      pluginId: 'openfox-pareto-line',
      runtime: { mode: 'development', configDirectory: dir },
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        settings: vi.fn().mockReturnValue({}),
        notify: vi.fn(),
        publish: vi.fn(),
        runtime: { mode: 'development', configDirectory: dir },
      },
      registerSettings: vi.fn(),
      registerUiAction: vi.fn(),
      registerUiComponent: vi.fn(),
      registerUiPanel: vi.fn(),
      registerRpc: (method, handler) => {
        rpcs[method] = handler
      },
      registerTool: vi.fn(),
    }

    await register(mockRegistry)

    const toolContext = { sessionId: 'session-1', workdir: '/tmp' }
    const res = await rpcs['pareto.getDataset']({ onlyMyModels: true }, toolContext)

    expect(res.success).toBe(true)
    expect(res.dataset.models.length).toBeGreaterThan(0)
    expect(res.dataset.models[0]?.slug).toBe('claude-opus-4')
    expect(res.dataset.models[0]?.providerName).toBe('Anthropic')

    await rm(dir, { recursive: true })
  })
})
