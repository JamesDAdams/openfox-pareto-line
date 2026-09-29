import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  ArtificialAnalysisModel,
  ParetoDataset,
  ParetoModelPoint,
  PluginContext,
} from './types.js'
import { markParetoOptimality } from './pareto.js'

export interface OpenFoxProviderModel {
  providerId: string
  providerName: string
  providerLogo?: string
  modelId: string
  modelName?: string
  inputPrice?: number
  outputPrice?: number
  customPricing?: {
    inputPrice?: number
    outputPrice?: number
  }
}

interface OpenFoxProviderConfig {
  id: string
  name?: string
  preset?: string
  backend?: string
  transport?: string
  transportAdapter?: string
  authAdapter?: string
  icon?: string
  logo?: string
  models?: Array<{
    id: string
    name?: string
    inputPrice?: number
    outputPrice?: number
    customPricing?: {
      inputPrice?: number
      outputPrice?: number
    }
  }>
}

/**
 * Provider logos served by the OpenFox web app for the built-in local backends.
 * Mirrors BUILTIN_PROVIDER_LOGOS in web/src/components/shared/PluginLogo.tsx.
 */
export const BUILTIN_PROVIDER_LOGOS: Record<string, string> = {
  lmstudio: '/assets/providers/lmstudio.webp',
  'lm studio': '/assets/providers/lmstudio.webp',
  'lm-studio': '/assets/providers/lmstudio.webp',
  llamacpp: '/assets/providers/llama-cpp.png',
  'llama.cpp': '/assets/providers/llama-cpp.png',
  'llama-cpp': '/assets/providers/llama-cpp.png',
  llama_cpp: '/assets/providers/llama-cpp.png',
  ollama: '/assets/providers/ollama.webp',
  vllm: '/assets/providers/vllm.png',
  unsloth: '/assets/providers/unsloth.png',
}

/**
 * Reads the icons/logos declared by the plugins installed in the config
 * directory — the same source the OpenFox web UI uses to brand providers.
 */
export async function readInstalledPluginLogos(configDir: string): Promise<Array<{ id: string; icon: string }>> {
  const logos: Array<{ id: string; icon: string }> = []
  try {
    const entries = await readdir(join(configDir, 'plugins'), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      try {
        const raw = await readFile(join(configDir, 'plugins', entry.name, 'package.json'), 'utf8')
        const manifest = JSON.parse(raw) as { name?: string; openfox?: { icon?: string; logo?: string } }
        const icon = manifest.openfox?.icon ?? manifest.openfox?.logo
        if (!icon) continue
        logos.push({ id: (manifest.name ?? entry.name).toLowerCase(), icon })
      } catch {
        // ignore unreadable plugin manifests
      }
    }
  } catch {
    // no plugins directory — nothing to resolve
  }
  return logos
}

/**
 * Resolves the logo of a configured provider, mirroring
 * findPluginLogoForProvider in web/src/components/shared/PluginLogo.tsx.
 */
export function findProviderLogo(
  provider: OpenFoxProviderConfig,
  pluginLogos: Array<{ id: string; icon: string }>,
): string | undefined {
  if (provider.logo) return provider.logo
  if (provider.icon) return provider.icon

  const preset = provider.preset?.toLowerCase()
  const transport = (provider.transport ?? provider.transportAdapter ?? '').toLowerCase()
  const auth = (provider.authAdapter ?? '').toLowerCase()
  const backend = (provider.backend ?? '').toLowerCase()
  const name = (provider.name ?? '').toLowerCase()
  const pid = (provider.id ?? '').toLowerCase()

  for (const plugin of pluginLogos) {
    const pluginId = plugin.id
    const cleanId = pluginId.replace(/^openfox-/, '')
    if (preset && (preset === cleanId || preset === pluginId || cleanId.includes(preset))) return plugin.icon
    if (transport && (transport.includes(cleanId) || transport.includes(pluginId))) return plugin.icon
    if (auth && (auth.includes(cleanId) || auth.includes(pluginId))) return plugin.icon
    if (backend && (backend === cleanId || backend === pluginId)) return plugin.icon
    if (pid && (pid === cleanId || pid === pluginId || pid.startsWith(cleanId) || pid.startsWith(pluginId))) {
      return plugin.icon
    }
    if (name && (name === cleanId || name === pluginId)) return plugin.icon
  }

  const candidates = [backend, preset, name, pid].filter((c): c is string => Boolean(c))
  for (const candidate of candidates) {
    if (BUILTIN_PROVIDER_LOGOS[candidate]) return BUILTIN_PROVIDER_LOGOS[candidate]
    const normalized = candidate.replace(/[^a-z0-9]/g, '')
    if (BUILTIN_PROVIDER_LOGOS[normalized]) return BUILTIN_PROVIDER_LOGOS[normalized]
  }

  for (const [needle, logo] of [
    ['lmstudio', BUILTIN_PROVIDER_LOGOS['lm studio']],
    ['llama.cpp', BUILTIN_PROVIDER_LOGOS['llama.cpp']],
    ['ollama', BUILTIN_PROVIDER_LOGOS['ollama']],
    ['vllm', BUILTIN_PROVIDER_LOGOS['vllm']],
    ['unsloth', BUILTIN_PROVIDER_LOGOS['unsloth']],
  ] as Array<[string, string]>) {
    if (name.includes(needle) || backend.includes(needle) || pid.includes(needle)) return logo
  }

  return undefined
}

/**
 * Normalizes strings for loose fuzzy matching.
 * e.g. "gemini-2.5-flash" -> "gemini25flash"
 * e.g. "GPT-5.6 Luna (1M context)" -> "gpt56luna"
 * e.g. "Muse Spark 1.3 Contributor" -> "musespark13"
 */
export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/^(openai|anthropic|google|deepseek|mistralai|mistral|qwen|alibaba|meta|zhipu|meta-llama|xai|stepfun|copilot|github|antigravity|opencode|minimax)\//i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(20\d{6}|\d{4})\b/g, '')
    .replace(/\b(\d+k|\d+m)\b/gi, '')
    .replace(/\b(context|contributor|preview|experimental|exp|default|fallback|reasoning|adaptive|effort|max|xhigh|high|medium|low|minimal|free|vision|instruct|chat|turbo|latest|beta|tiered)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Matches an OpenFox configured model against Artificial Analysis models.
 */
export function matchModel(
  providerModelId: string,
  providerModelName: string | undefined,
  aaModels: ArtificialAnalysisModel[],
): ArtificialAnalysisModel | undefined {
  const normId = normalizeKey(providerModelId)
  const normName = providerModelName ? normalizeKey(providerModelName) : ''

  // 1. Exact slug or id match
  for (const m of aaModels) {
    if (m.slug === providerModelId || m.id === providerModelId) return m
    if (providerModelName && (m.slug === providerModelName || m.id === providerModelName || m.name === providerModelName)) {
      return m
    }
  }

  // 2. Exact normalized match
  for (const m of aaModels) {
    const normSlug = normalizeKey(m.slug)
    const normMName = normalizeKey(m.name)
    const normShortName = normalizeKey(m.shortName || '')

    if (normSlug && (normSlug === normId || (normName && normSlug === normName))) return m
    if (normMName && (normMName === normId || (normName && normMName === normName))) return m
    if (normShortName && (normShortName === normId || (normName && normShortName === normName))) return m
  }

  // 3. Substring inclusion (minimum 4 chars to prevent false positives)
  for (const m of aaModels) {
    const normSlug = normalizeKey(m.slug)
    const normMName = normalizeKey(m.name)
    for (const target of [normSlug, normMName].filter(Boolean)) {
      if (target.length >= 4 && normId.length >= 4 && (normId.includes(target) || target.includes(normId))) {
        return m
      }
      if (normName && target.length >= 4 && normName.length >= 4 && (normName.includes(target) || target.includes(normName))) {
        return m
      }
    }
  }

  return undefined
}

/**
 * Extract all active configured models from OpenFox context.
 * Reads config.json from the configDirectory exposed via context.runtime,
 * with standard system fallbacks.
 */
export async function getOpenFoxConfiguredModels(context: PluginContext): Promise<OpenFoxProviderModel[]> {
  const configuredModels: OpenFoxProviderModel[] = []

  const candidateDirs: string[] = []
  if (context.runtime?.configDirectory) {
    candidateDirs.push(context.runtime.configDirectory)
  } else if (process.env['NODE_ENV'] !== 'test') {
    const home = homedir()
    candidateDirs.push(
      join(home, 'Library', 'Application Support', 'openfox-dev'),
      join(home, 'Library', 'Application Support', 'openfox'),
      join(home, '.config', 'openfox-dev'),
      join(home, '.config', 'openfox'),
    )
    if (process.env['APPDATA']) {
      candidateDirs.push(
        join(process.env['APPDATA'], 'openfox-dev'),
        join(process.env['APPDATA'], 'openfox'),
      )
    }
  }

  for (const configDir of candidateDirs) {
    try {
      const configPath = join(configDir, 'config.json')
      const raw = await readFile(configPath, 'utf8')
      const data = JSON.parse(raw) as { providers?: OpenFoxProviderConfig[] }
      if (Array.isArray(data.providers) && data.providers.length > 0) {
        const pluginLogos = await readInstalledPluginLogos(configDir)
        for (const p of data.providers) {
          if (!p?.id || !Array.isArray(p.models)) continue
          const providerLogo = findProviderLogo(p, pluginLogos)
          for (const m of p.models) {
            if (!m?.id) continue
            configuredModels.push({
              providerId: p.id,
              providerName: p.name ?? p.id,
              providerLogo,
              modelId: m.id,
              modelName: m.name,
              inputPrice: m.inputPrice,
              outputPrice: m.outputPrice,
              customPricing: m.customPricing,
            })
          }
        }
        if (configuredModels.length > 0) {
          break
        }
      }
    } catch {
      // try next candidate directory
    }
  }

  return configuredModels
}

export function buildAllBenchmarkDataset(aaModels: ArtificialAnalysisModel[], lastSync: string): ParetoDataset {
  const validModels = aaModels.filter(
    (m): m is ArtificialAnalysisModel & { intelligenceIndex: number; costPerTask: { cost: { total: number } } } =>
      typeof m.intelligenceIndex === 'number' &&
      m.intelligenceIndex > 0 &&
      typeof m.costPerTask?.cost?.total === 'number' &&
      m.costPerTask.cost.total > 0,
  )

  const points: ParetoModelPoint[] = validModels.map((m) => {
    const cost = m.costPerTask.cost.total
    const creatorName = typeof m.creator === 'object' ? m.creator?.name || 'AI' : m.creator || 'AI'
    const creatorColor = typeof m.creator === 'object' ? m.creator?.color || '#3b82f6' : '#3b82f6'
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      shortName: m.shortName || m.name,
      creator: creatorName,
      color: creatorColor,
      intelligenceIndex: m.intelligenceIndex,
      costPerTask: cost,
      priceSource: 'artificial_analysis' as const,
      isParetoOptimal: false,
      inputPrice: m.price1mInputTokens ?? undefined,
      outputPrice: m.price1mOutputTokens ?? undefined,
    }
  })

  const marked = markParetoOptimality(points)
  return {
    lastSync,
    models: marked,
    paretoFrontier: marked.filter((m) => m.isParetoOptimal),
  }
}

/**
 * Filter Artificial Analysis models to all models configured in OpenFox,
 * only keeping models that are available and benchmarked on Artificial Analysis.
 */
export function buildParetoDatasetFromConfig(
  configuredModels: OpenFoxProviderModel[],
  aaModels: ArtificialAnalysisModel[],
): ParetoModelPoint[] {
  const points: ParetoModelPoint[] = []

  if (configuredModels.length === 0) {
    return []
  }

  for (const cm of configuredModels) {
    const matched = matchModel(cm.modelId, cm.modelName, aaModels)
    // Only include models that are available on Artificial Analysis with valid benchmark data
    if (!matched || typeof matched.intelligenceIndex !== 'number' || matched.intelligenceIndex <= 0) {
      continue
    }

    const baseCostPerTask = matched.costPerTask?.cost?.total
    if (typeof baseCostPerTask !== 'number' || baseCostPerTask <= 0) {
      continue
    }

    let costPerTask = baseCostPerTask
    let priceSource: 'artificial_analysis' | 'openfox_custom' = 'artificial_analysis'

    const customInput = cm.customPricing?.inputPrice ?? cm.inputPrice
    const customOutput = cm.customPricing?.outputPrice ?? cm.outputPrice

    // If OpenFox has custom token prices, rescale costPerTask proportionally
    if (typeof customInput === 'number' && typeof customOutput === 'number' && matched.price1mInputTokens && matched.price1mOutputTokens) {
      const origAvg = matched.price1mInputTokens * 0.7 + matched.price1mOutputTokens * 0.3
      const customAvg = (customInput * 0.7) + (customOutput * 0.3)
      if (origAvg > 0 && customAvg > 0) {
        costPerTask = baseCostPerTask * (customAvg / origAvg)
        priceSource = 'openfox_custom'
      }
    }

    const displayName = cm.modelName || cm.modelId
    const creatorName = typeof matched.creator === 'object' ? matched.creator?.name || cm.providerName : matched.creator || cm.providerName
    const creatorColor = typeof matched.creator === 'object' ? matched.creator?.color || '#3b82f6' : '#3b82f6'

    points.push({
      id: `${cm.providerId}:${cm.modelId}`,
      slug: matched.slug,
      name: displayName,
      shortName: displayName,
      creator: creatorName,
      color: creatorColor,
      intelligenceIndex: matched.intelligenceIndex,
      costPerTask,
      priceSource,
      isParetoOptimal: false,
      providerId: cm.providerId,
      providerName: cm.providerName,
      providerLogo: cm.providerLogo,
      modelId: cm.modelId,
      inputPrice: customInput ?? matched.price1mInputTokens ?? undefined,
      outputPrice: customOutput ?? matched.price1mOutputTokens ?? undefined,
    })
  }

  // Compute Pareto optimality across all valid points
  return markParetoOptimality(points)
}
