export type AgentRow = {
  id: string
  type: string
  model: string
  task: string
  status: 'en marcha' | 'terminado' | 'fallido' | 'detenido'
  lastAction: string
  actions: number
  startedAt: number
  endedAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'panel-agentes': { agents: AgentRow[] }
  }
}
