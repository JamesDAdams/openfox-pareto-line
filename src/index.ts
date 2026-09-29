import type {
  ArtificialAnalysisModel,
  DeclarativeNode,
  ParetoDataset,
  PluginContext,
  PluginRegistry,
  PluginSettingsSchema,
} from './types.js'
import { fetchArtificialAnalysisModels, FALLBACK_ARTIFICIAL_ANALYSIS_MODELS } from './fetcher.js'
import { getOpenFoxConfiguredModels, buildParetoDatasetFromConfig, buildAllBenchmarkDataset } from './models-filter.js'
import { buildParetoModalDeclarativeTree } from './renderer.js'
import { computeParetoFrontier } from './pareto.js'

export * from './types.js'
export * from './fetcher.js'
export * from './pareto.js'
export * from './models-filter.js'
export * from './renderer.js'

export const PARETO_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="7" r="2"/><path d="M6 18c3-4 7-6 13-11" stroke-dasharray="2 2"/></svg>'

export const SETTINGS_SCHEMA: PluginSettingsSchema = {
  fields: [
    {
      key: 'showInHeader',
      label: {
        en: 'Show Pareto button in header',
        fr: 'Afficher le bouton Pareto dans l’en-tête',
      },
      type: 'boolean',
      description: {
        en: 'Display a direct quick-access button in the top navigation header.',
        fr: 'Afficher un bouton d’accès rapide direct dans l’en-tête de navigation supérieur.',
      },
      default: false,
    },
    {
      key: 'autoSyncOnOpen',
      label: {
        en: 'Auto-sync benchmark on open',
        fr: 'Synchronisation automatique à l’ouverture',
      },
      type: 'boolean',
      description: {
        en: 'Automatically fetch latest benchmarks from artificialanalysis.ai when opening the modal.',
        fr: 'Récupérer automatiquement les derniers benchmarks depuis artificialanalysis.ai lors de l’ouverture de la modal.',
      },
      default: true,
    },
  ],
}

export function buildHeaderButton(showInHeader: boolean): DeclarativeNode {
  if (!showInHeader) {
    return {
      type: 'stack',
      direction: 'row',
      children: [],
    }
  }

  return {
    type: 'button',
    id: 'pareto-header-btn',
    label: {
      en: 'Pareto Line',
      fr: 'Ligne de Pareto',
    },
    title: {
      en: 'Pareto Line',
      fr: 'Ligne de Pareto',
    },
    icon: PARETO_ICON_SVG,
    variant: 'ghost',
    onActivate: {
      kind: 'openPanel',
      panelId: 'pareto-modal',
    },
  }
}

export class ParetoManager {
  private aaModels: ArtificialAnalysisModel[] = []
  private lastSyncTime: string = ''
  private onlyMyModels: boolean = false
  public context?: PluginContext
  public registry?: PluginRegistry

  async loadInitialData(context: PluginContext): Promise<void> {
    this.context = context
    this.onlyMyModels = false
    try {
      const cached = await context.storage?.get<{ lastSync: string; models: ArtificialAnalysisModel[]; onlyMyModels?: boolean }>('aa_cache')
      if (cached && Array.isArray(cached.models) && cached.models.length > 0) {
        this.aaModels = cached.models
        this.lastSyncTime = cached.lastSync
        if (typeof cached.onlyMyModels === 'boolean') {
          this.onlyMyModels = cached.onlyMyModels
        }
      } else {
        this.aaModels = FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
        this.lastSyncTime = new Date().toLocaleString()
      }
    } catch {
      this.aaModels = FALLBACK_ARTIFICIAL_ANALYSIS_MODELS
      this.lastSyncTime = new Date().toLocaleString()
    }
  }

  getOnlyMyModelsFilter(): boolean {
    return this.onlyMyModels
  }

  async setOnlyMyModelsFilter(onlyMyModels: boolean, context?: PluginContext): Promise<void> {
    this.onlyMyModels = onlyMyModels
    const ctx = context || this.context
    if (ctx?.storage) {
      await ctx.storage.set('aa_cache', {
        lastSync: this.lastSyncTime,
        models: this.aaModels,
        onlyMyModels: this.onlyMyModels,
      })
    }
  }

  async sync(context?: PluginContext): Promise<ParetoDataset> {
    const ctx = context || this.context
    try {
      const fetched = await fetchArtificialAnalysisModels(12000)
      if (fetched && fetched.length > 0) {
        this.aaModels = fetched
        this.lastSyncTime = new Date().toLocaleString()
        if (ctx?.storage) {
          await ctx.storage.set('aa_cache', {
            lastSync: this.lastSyncTime,
            models: this.aaModels,
            onlyMyModels: this.onlyMyModels,
          })
        }
      }
    } catch (err) {
      ctx?.logger?.warn?.(`[openfox-pareto-line] Sync failed, using cached data: ${String(err)}`)
    }

    return this.getDataset(ctx, this.onlyMyModels)
  }

  async getDataset(context?: PluginContext, onlyMyModels?: boolean): Promise<ParetoDataset> {
    const ctx = context || this.context
    const filterActive = typeof onlyMyModels === 'boolean' ? onlyMyModels : this.onlyMyModels
    const rawAaModels = this.aaModels.length > 0 ? this.aaModels : FALLBACK_ARTIFICIAL_ANALYSIS_MODELS

    if (!filterActive) {
      return buildAllBenchmarkDataset(rawAaModels, this.lastSyncTime)
    }

    if (!ctx) {
      const pts = buildParetoDatasetFromConfig([], rawAaModels)
      return {
        lastSync: this.lastSyncTime,
        models: pts,
        paretoFrontier: computeParetoFrontier(pts),
      }
    }

    const configuredModels = await getOpenFoxConfiguredModels(ctx)
    const points = buildParetoDatasetFromConfig(
      configuredModels,
      rawAaModels,
    )
    const frontier = computeParetoFrontier(points)

    return {
      lastSync: this.lastSyncTime,
      models: points,
      paretoFrontier: frontier,
    }
  }

  async renderModalContent(context?: PluginContext, onlyMyModels?: boolean) {
    const filterActive = typeof onlyMyModels === 'boolean' ? onlyMyModels : this.onlyMyModels
    const dataset = await this.getDataset(context, filterActive)
    return buildParetoModalDeclarativeTree(dataset, { onlyMyModels: filterActive })
  }
}

export const paretoManager = new ParetoManager()

export async function register(registry: PluginRegistry): Promise<void> {
  const { context } = registry
  paretoManager.registry = registry
  paretoManager.context = context

  // 1. Initial storage & data load
  await paretoManager.loadInitialData(context)

  // 2. Register Settings Schema
  registry.registerSettings(SETTINGS_SCHEMA)

  // 3. Register Plugin Menu item (accessible from the plugin list / menu)
  registry.registerUiAction({
    id: 'pareto-plugin-menu-item',
    pluginId: 'openfox-pareto-line',
    slot: 'plugin.menu',
    label: {
      en: 'Pareto Line',
      fr: 'Ligne de Pareto',
    },
    icon: PARETO_ICON_SVG,
    onActivate: {
      kind: 'openPanel',
      panelId: 'pareto-modal',
    },
  })

  // 4. Register Dedicated Header Component (controlled via showInHeader setting)
  const initialSettings = context?.settings ? context.settings() : {}
  const initialShowInHeader = initialSettings['showInHeader'] === true

  registry.registerUiComponent({
    id: 'pareto-header-component',
    pluginId: 'openfox-pareto-line',
    zone: 'header.actions',
    contentSource: {
      kind: 'rpc',
      method: 'pareto.getHeaderButton',
      refreshMs: 2000,
    },
    component: buildHeaderButton(initialShowInHeader),
  })

  // 5. Register Pareto Modal Panel (using 2xl for wide display)
  const initialContent = await paretoManager.renderModalContent(context)
  registry.registerUiPanel({
    id: 'pareto-modal',
    pluginId: 'openfox-pareto-line',
    title: {
      en: 'Pareto Line Benchmark',
      fr: 'Benchmark Ligne de Pareto',
    },
    size: '2xl',
    kind: 'declarative',
    content: initialContent,
  })

  // 6. Register RPC Handlers
  registry.registerRpc('initPanel', async (params, _rpcContext) => {
    if (params?.panelId === 'pareto-modal') {
      const currentSettings = context?.settings ? context.settings() : {}
      const autoSync = currentSettings['autoSyncOnOpen'] ?? true
      const dataset = await paretoManager.getDataset(context)
      const content = buildParetoModalDeclarativeTree(dataset, {
        onlyMyModels: paretoManager.getOnlyMyModelsFilter(),
      })
      if (autoSync) {
        void paretoManager.sync(context).then((syncedDataset) => {
          try {
            const syncedContent = buildParetoModalDeclarativeTree(syncedDataset, {
              onlyMyModels: paretoManager.getOnlyMyModelsFilter(),
            })
            context.publish('pareto-modal', 'content', syncedContent)
          } catch {
          }
        }).catch(() => {})
      }
      return { content }
    }
    return undefined
  })

  registry.registerRpc('pareto.sync', async (_params, _rpcContext) => {
    const dataset = await paretoManager.sync(context)
    const content = buildParetoModalDeclarativeTree(dataset, {
      onlyMyModels: paretoManager.getOnlyMyModelsFilter(),
    })
    return {
      success: true,
      openPanel: 'pareto-modal',
      content,
    }
  })

  registry.registerRpc('pareto.toggleFilter', async (params, _rpcContext) => {
    const requested =
      typeof params?.onlyMyModels === 'boolean'
        ? params.onlyMyModels
        : params?.value === 'true'
          ? true
          : params?.value === 'false'
            ? false
            : undefined
    const onlyMyModels =
      typeof requested === 'boolean' ? requested : !paretoManager.getOnlyMyModelsFilter()

    await paretoManager.setOnlyMyModelsFilter(onlyMyModels, context)
    const dataset = await paretoManager.getDataset(context, onlyMyModels)
    const content = buildParetoModalDeclarativeTree(dataset, { onlyMyModels })

    return {
      success: true,
      onlyMyModels,
      openPanel: 'pareto-modal',
      content,
    }
  })

  registry.registerRpc('pareto.getHeaderButton', async () => {
    const currentSettings = context?.settings ? context.settings() : {}
    const showInHeader = currentSettings['showInHeader'] === true
    return {
      content: buildHeaderButton(showInHeader),
    }
  })

  registry.registerRpc('pareto.getDataset', async (params, _rpcContext) => {
    const onlyMy = typeof params?.onlyMyModels === 'boolean' ? params.onlyMyModels : undefined
    const dataset = await paretoManager.getDataset(context, onlyMy)
    return { success: true, dataset }
  })

  registry.registerRpc('pareto.getModalContent', async (params, _rpcContext) => {
    const onlyMy = typeof params?.onlyMyModels === 'boolean' ? params.onlyMyModels : undefined
    const nodes = await paretoManager.renderModalContent(context, onlyMy)
    return { nodes }
  })

  // 7. Register Tool for Agent querying
  registry.registerTool({
    name: 'get_pareto_models',
    description: 'Get benchmark scores and Pareto frontier efficiency analysis for active or available models.',
    parameters: {
      type: 'object',
      properties: {
        onlyOptimal: {
          type: 'boolean',
          description: 'Filter only models that lie on the Pareto optimal frontier.',
        },
        onlyMyModels: {
          type: 'boolean',
          description: 'Filter only models configured in active OpenFox providers.',
        },
      },
    },
    execute: async (args) => {
      const onlyMy = typeof args['onlyMyModels'] === 'boolean' ? Boolean(args['onlyMyModels']) : undefined
      const dataset = await paretoManager.getDataset(context, onlyMy)
      const onlyOptimal = Boolean(args['onlyOptimal'])
      const models = onlyOptimal ? dataset.paretoFrontier : dataset.models
      return {
        success: true,
        output: JSON.stringify({ lastSync: dataset.lastSync, count: models.length, models }, null, 2),
      }
    },
  })

  context?.logger?.info?.('openfox-pareto-line initialized successfully')
}

