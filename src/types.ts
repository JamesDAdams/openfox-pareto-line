export interface LocalizedString {
  en: string
  fr: string
}

export type PluginBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface DeclarativeNode {
  type: string
  [key: string]: unknown
}

export interface PluginSettingsField {
  key: string
  label: LocalizedString
  type: 'text' | 'number' | 'boolean' | 'select' | 'password' | 'list'
  description?: LocalizedString
  default?: unknown
  options?: Array<{ value: string; label: LocalizedString }>
}

export interface PluginSettingsSchema {
  fields: PluginSettingsField[]
}

export interface PluginUiAction {
  id: string
  pluginId?: string
  slot: string
  label: LocalizedString
  icon?: string
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'pill'
  tooltip?: LocalizedString
  visibleWhen?: Record<string, unknown>
  onActivate: {
    kind: 'rpc' | 'openPanel' | 'openSettings' | 'openUrl'
    method?: string
    panelId?: string
    url?: string
    tab?: string
    params?: Record<string, unknown>
  }
}

export interface PluginUiContentSource {
  kind?: 'rpc'
  method: string
  refreshMs?: number
}

export interface PluginUiComponent {
  id: string
  pluginId?: string
  zone: string
  position?: 'inside' | 'before' | 'after'
  order?: number
  visibleWhen?: Record<string, unknown>
  contentSource?: PluginUiContentSource
  component: DeclarativeNode
}

export interface PluginUiPanel {
  id: string
  pluginId?: string
  title: LocalizedString
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  kind: 'declarative' | 'iframe'
  content?: DeclarativeNode[]
}

export interface PluginContext {
  logger: {
    info(msg: string): void
    warn(msg: string): void
    error(msg: string): void
    debug(msg: string): void
  }
  runtime?: {
    mode: 'production' | 'development'
    configDirectory: string
  }
  storage: {
    get<T>(key: string): Promise<T | undefined> | (T | undefined)
    set<T>(key: string, value: T): Promise<void> | void
    delete(key: string): Promise<void> | void
    list?(): Promise<string[]> | string[]
  }
  settings(): Record<string, unknown>
  notify(notification: {
    title: LocalizedString
    body?: LocalizedString
    level?: 'info' | 'success' | 'warning' | 'error'
    actions?: Array<{ label: LocalizedString; onActivate: unknown }>
  }): void
  publish(panelId: string, key: string, value: unknown): void
  providers?(): Array<{
    id: string
    name: string
    backend?: string
    models?: Array<{
      id: string
      name?: string
      inputPrice?: number
      outputPrice?: number
    }>
  }>
}

export interface PluginRegistry {
  pluginId: string
  runtime: {
    mode: 'production' | 'development'
    configDirectory: string
  }
  context: PluginContext
  registerSettings(schema: PluginSettingsSchema): void
  registerUiAction(action: PluginUiAction): void
  registerUiComponent(component: PluginUiComponent): void
  registerUiPanel(panel: PluginUiPanel): void
  registerRpc(method: string, handler: (params?: any, context?: any) => Promise<any> | any): void
  registerTool(tool: {
    name: string
    description: string
    parameters: Record<string, unknown>
    execute: (args: Record<string, unknown>, context?: any) => Promise<{ success: boolean; output?: string; error?: string }>
  }): void
  registerHook?(name: string, handler: (payload: any) => Promise<void> | void): void
}

export interface ArtificialAnalysisModel {
  id: string
  slug: string
  name: string
  shortName: string
  intelligenceIndex: number | null
  costPerTask?: {
    cost?: {
      total?: number
      input?: number
      output?: number
      reasoning?: number
      answer?: number
    }
  }
  price1mInputTokens: number | null
  price1mOutputTokens: number | null
  creator?: {
    name?: string
    slug?: string
    color?: string
  } | string
}

export interface ParetoModelPoint {
  id: string
  slug: string
  name: string
  shortName: string
  creator: string
  color: string
  intelligenceIndex: number
  costPerTask: number
  priceSource: 'artificial_analysis' | 'openfox_custom'
  isParetoOptimal: boolean
  providerId?: string
  providerName?: string
  providerLogo?: string
  modelId?: string
  inputPrice?: number
  outputPrice?: number
}

export interface ParetoDataset {
  lastSync: string
  models: ParetoModelPoint[]
  paretoFrontier: ParetoModelPoint[]
}
