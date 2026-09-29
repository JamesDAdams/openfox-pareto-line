import type { ArtificialAnalysisModel } from './types.js'

export const FALLBACK_ARTIFICIAL_ANALYSIS_MODELS: ArtificialAnalysisModel[] = [
  {
    id: 'gemini-2-5-pro',
    slug: 'gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    shortName: 'Gemini 2.5 Pro',
    intelligenceIndex: 85.3,
    costPerTask: { cost: { total: 1.25 } },
    price1mInputTokens: 1.25,
    price1mOutputTokens: 10,
    creator: { name: 'Google', color: '#34a853' },
  },
  {
    id: 'gemini-2-5-flash',
    slug: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    shortName: 'Gemini 2.5 Flash',
    intelligenceIndex: 78.1,
    costPerTask: { cost: { total: 0.18 } },
    price1mInputTokens: 0.075,
    price1mOutputTokens: 0.3,
    creator: { name: 'Google', color: '#34a853' },
  },
  {
    id: 'claude-opus-4',
    slug: 'claude-opus-4',
    name: 'Claude Opus 4',
    shortName: 'Claude Opus 4',
    intelligenceIndex: 88.4,
    costPerTask: { cost: { total: 4.8 } },
    price1mInputTokens: 15,
    price1mOutputTokens: 75,
    creator: { name: 'Anthropic', color: '#cc785c' },
  },
  {
    id: 'claude-sonnet-4',
    slug: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    shortName: 'Claude Sonnet 4',
    intelligenceIndex: 82.6,
    costPerTask: { cost: { total: 0.95 } },
    price1mInputTokens: 3,
    price1mOutputTokens: 15,
    creator: { name: 'Anthropic', color: '#cc785c' },
  },
  {
    id: 'claude-haiku-3-5',
    slug: 'claude-haiku-3-5',
    name: 'Claude Haiku 3.5',
    shortName: 'Claude Haiku 3.5',
    intelligenceIndex: 65.2,
    costPerTask: { cost: { total: 0.09 } },
    price1mInputTokens: 0.8,
    price1mOutputTokens: 4,
    creator: { name: 'Anthropic', color: '#cc785c' },
  },
  {
    id: 'gpt-4o',
    slug: 'gpt-4o',
    name: 'GPT-4o',
    shortName: 'GPT-4o',
    intelligenceIndex: 79.5,
    costPerTask: { cost: { total: 0.72 } },
    price1mInputTokens: 2.5,
    price1mOutputTokens: 10,
    creator: { name: 'OpenAI', color: '#10a37f' },
  },
  {
    id: 'gpt-4o-mini',
    slug: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    shortName: 'GPT-4o mini',
    intelligenceIndex: 60.4,
    costPerTask: { cost: { total: 0.04 } },
    price1mInputTokens: 0.15,
    price1mOutputTokens: 0.6,
    creator: { name: 'OpenAI', color: '#10a37f' },
  },
  {
    id: 'o3',
    slug: 'o3',
    name: 'o3',
    shortName: 'o3',
    intelligenceIndex: 91.2,
    costPerTask: { cost: { total: 8.4 } },
    price1mInputTokens: 10,
    price1mOutputTokens: 40,
    creator: { name: 'OpenAI', color: '#10a37f' },
  },
  {
    id: 'o4-mini',
    slug: 'o4-mini',
    name: 'o4-mini',
    shortName: 'o4-mini',
    intelligenceIndex: 83.7,
    costPerTask: { cost: { total: 0.65 } },
    price1mInputTokens: 1.1,
    price1mOutputTokens: 4.4,
    creator: { name: 'OpenAI', color: '#10a37f' },
  },
  {
    id: 'deepseek-v3',
    slug: 'deepseek-v3',
    name: 'DeepSeek V3',
    shortName: 'DeepSeek V3',
    intelligenceIndex: 73.8,
    costPerTask: { cost: { total: 0.08 } },
    price1mInputTokens: 0.27,
    price1mOutputTokens: 1.1,
    creator: { name: 'DeepSeek', color: '#2243e6' },
  },
  {
    id: 'deepseek-r1',
    slug: 'deepseek-r1',
    name: 'DeepSeek R1',
    shortName: 'DeepSeek R1',
    intelligenceIndex: 84.5,
    costPerTask: { cost: { total: 0.42 } },
    price1mInputTokens: 0.55,
    price1mOutputTokens: 2.19,
    creator: { name: 'DeepSeek', color: '#2243e6' },
  },
  {
    id: 'llama-3-3-70b',
    slug: 'llama-3-3-70b',
    name: 'Llama 3.3 70B',
    shortName: 'Llama 3.3 70B',
    intelligenceIndex: 68.9,
    costPerTask: { cost: { total: 0.05 } },
    price1mInputTokens: 0.23,
    price1mOutputTokens: 0.4,
    creator: { name: 'Meta', color: '#0668e1' },
  },
  {
    id: 'llama-4-maverick',
    slug: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    shortName: 'Llama 4 Maverick',
    intelligenceIndex: 76.3,
    costPerTask: { cost: { total: 0.19 } },
    price1mInputTokens: 0.27,
    price1mOutputTokens: 0.85,
    creator: { name: 'Meta', color: '#0668e1' },
  },
  {
    id: 'qwen3-235b-a22b',
    slug: 'qwen3-235b-a22b',
    name: 'Qwen3 235B A22B',
    shortName: 'Qwen3 235B A22B',
    intelligenceIndex: 80.2,
    costPerTask: { cost: { total: 0.14 } },
    price1mInputTokens: 0.22,
    price1mOutputTokens: 0.88,
    creator: { name: 'Alibaba', color: '#ff6a00' },
  },
  {
    id: 'mistral-large-2',
    slug: 'mistral-large-2',
    name: 'Mistral Large 2',
    shortName: 'Mistral Large 2',
    intelligenceIndex: 67.4,
    costPerTask: { cost: { total: 0.55 } },
    price1mInputTokens: 2,
    price1mOutputTokens: 6,
    creator: { name: 'Mistral', color: '#ff7000' },
  },
  {
    id: 'grok-3',
    slug: 'grok-3',
    name: 'Grok 3',
    shortName: 'Grok 3',
    intelligenceIndex: 82.1,
    costPerTask: { cost: { total: 1.1 } },
    price1mInputTokens: 3,
    price1mOutputTokens: 15,
    creator: { name: 'xAI', color: '#736cd3' },
  },
  {
    id: 'grok-3-mini',
    slug: 'grok-3-mini',
    name: 'Grok 3 mini',
    shortName: 'Grok 3 mini',
    intelligenceIndex: 72.6,
    costPerTask: { cost: { total: 0.11 } },
    price1mInputTokens: 0.3,
    price1mOutputTokens: 0.5,
    creator: { name: 'xAI', color: '#736cd3' },
  },
]

export function extractArtificialAnalysisModels(html: string): ArtificialAnalysisModel[] {
  const rscRegex = /self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs
  let fullPayload = ''
  let match: RegExpExecArray | null

  while ((match = rscRegex.exec(html)) !== null) {
    let unescaped = match[1] ?? ''
    try {
      unescaped = JSON.parse('"' + unescaped + '"')
    } catch {
      // ignore
    }
    fullPayload += unescaped
  }

  if (!fullPayload) {
    return FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
  }

  // 1. Extract costs and prices by slug from detailed benchmark blocks
  const costsBySlug = new Map<string, number>()
  const pricesBySlug = new Map<string, { in?: number; out?: number }>()
  let p = 0
  while (true) {
    const costIdx = fullPayload.indexOf('"intelligenceIndexCostPerTask"', p)
    if (costIdx === -1) break
    const prevSlugIdx = fullPayload.lastIndexOf('"slug":', costIdx)
    if (prevSlugIdx !== -1) {
      const slugMatch = fullPayload.substring(prevSlugIdx, prevSlugIdx + 60).match(/"slug":"([^"]+)"/)
      const costMatch = fullPayload.substring(costIdx, costIdx + 200).match(/"total":([\d.]+)/)
      if (slugMatch?.[1] && costMatch?.[1]) {
        costsBySlug.set(slugMatch[1], parseFloat(costMatch[1]))
      }
      const inPriceMatch = fullPayload.substring(costIdx - 200, costIdx + 200).match(/"price1mInputTokens":([\d.]+)/)
      const outPriceMatch = fullPayload.substring(costIdx - 200, costIdx + 200).match(/"price1mOutputTokens":([\d.]+)/)
      if (slugMatch?.[1]) {
        pricesBySlug.set(slugMatch[1], {
          in: inPriceMatch?.[1] ? parseFloat(inPriceMatch[1]) : undefined,
          out: outPriceMatch?.[1] ? parseFloat(outPriceMatch[1]) : undefined,
        })
      }
    }
    p = costIdx + 30
  }

  // 2. Extract models from the chart dataset (where chartDefaultSelected is true)
  let idx = 0
  let chartModels: ArtificialAnalysisModel[] = []
  while (true) {
    const nextArray = fullPayload.indexOf('"chartDefaultSelected":true', idx + 1)
    if (nextArray === -1) break
    const startChar = fullPayload.lastIndexOf('[', nextArray)
    if (startChar !== -1) {
      let depth = 0
      let endIdx = -1
      for (let i = startChar; i < fullPayload.length; i++) {
        if (fullPayload[i] === '[') depth++
        else if (fullPayload[i] === ']') {
          depth--
          if (depth === 0) {
            endIdx = i
            break
          }
        }
      }
      if (endIdx !== -1) {
        try {
          const arr = JSON.parse(fullPayload.substring(startChar, endIdx + 1))
          if (Array.isArray(arr) && arr.length > 0 && arr.some((x) => x && x.chartDefaultSelected === true)) {
            chartModels = arr
              .filter((x) => x && x.chartDefaultSelected === true && typeof x.intelligenceIndex === 'number')
              .map((m) => {
                const totalCost =
                  costsBySlug.get(m.slug) ??
                  m.intelligenceIndexCostPerTask?.cost?.total ??
                  (typeof m.costPerTask === 'number' ? m.costPerTask : undefined)
                const prices = pricesBySlug.get(m.slug)
                return {
                  id: m.id || m.slug,
                  slug: m.slug,
                  name: m.name || m.slug,
                  shortName: m.shortName || m.name || m.slug,
                  intelligenceIndex: m.intelligenceIndex,
                  costPerTask: typeof totalCost === 'number' ? { cost: { total: totalCost } } : undefined,
                  price1mInputTokens:
                    prices?.in ?? (typeof m.price1mInputTokens === 'number' ? m.price1mInputTokens : null),
                  price1mOutputTokens:
                    prices?.out ?? (typeof m.price1mOutputTokens === 'number' ? m.price1mOutputTokens : null),
                  creator: m.creator,
                }
              })
              .filter(
                (m) =>
                  m.costPerTask &&
                  typeof m.costPerTask.cost.total === 'number' &&
                  m.costPerTask.cost.total > 0,
              )
            if (chartModels.length > 0) break
          }
        } catch {
          // ignore parse error
        }
      }
    }
    idx = nextArray + 30
  }

  // Fallback if chartDefaultSelected array was not located
  if (chartModels.length === 0) {
    let scanIdx = 0
    while (true) {
      const nextArray = fullPayload.indexOf('["id"', scanIdx + 1)
      const nextObject = fullPayload.indexOf('{"id":', scanIdx + 1)
      if (nextArray === -1 && nextObject === -1) break
      scanIdx = nextArray === -1 ? nextObject : nextObject === -1 ? nextArray : Math.min(nextArray, nextObject)

      let depth = 0
      let endIdx = -1
      const startChar = fullPayload[scanIdx] === '[' ? scanIdx : fullPayload.lastIndexOf('[', scanIdx)
      if (startChar === -1) continue

      for (let i = startChar; i < fullPayload.length; i++) {
        if (fullPayload[i] === '[') depth++
        else if (fullPayload[i] === ']') {
          depth--
          if (depth === 0) {
            endIdx = i
            break
          }
        }
      }

      if (endIdx !== -1) {
        try {
          const jsonStr = fullPayload.substring(startChar, endIdx + 1)
          const parsed = JSON.parse(jsonStr)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.slug && parsed[0]?.intelligenceIndex !== undefined) {
            const valid = parsed.filter(
              (item) =>
                item &&
                typeof item.slug === 'string' &&
                item.chartDefaultSelected !== false &&
                (typeof item.intelligenceIndex === 'number' || typeof item.intelligenceIndexCostPerTask === 'object'),
            )
            if (valid.length > chartModels.length) {
              chartModels = valid.map((item) => ({
                id: item.id || item.slug,
                slug: item.slug,
                name: item.name || item.slug,
                shortName: item.shortName || item.name || item.slug,
                intelligenceIndex: typeof item.intelligenceIndex === 'number' ? item.intelligenceIndex : null,
                costPerTask:
                  costsBySlug.get(item.slug) !== undefined
                    ? { cost: { total: costsBySlug.get(item.slug)! } }
                    : item.intelligenceIndexCostPerTask ||
                      (typeof item.costPerTask === 'number' ? { cost: { total: item.costPerTask } } : undefined),
                price1mInputTokens: typeof item.price1mInputTokens === 'number' ? item.price1mInputTokens : null,
                price1mOutputTokens: typeof item.price1mOutputTokens === 'number' ? item.price1mOutputTokens : null,
                creator: item.creator,
              }))
            }
          }
        } catch {
          // ignore parse error and continue
        }
      }
    }
  }

  return chartModels.length > 0 ? chartModels : FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
}

export async function fetchArtificialAnalysisModels(timeoutMs = 10000): Promise<ArtificialAnalysisModel[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch('https://artificialanalysis.ai', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      return FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
    }
    const html = await res.text()
    return extractArtificialAnalysisModels(html)
  } catch {
    return FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
  }
}
