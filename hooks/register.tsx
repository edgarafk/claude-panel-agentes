import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'panel-agentes'
const TITLE = 'Agentes'
const CLOSE_DELAY_MS = 15_000
const agents = atom({ plugin: 'panel-agentes', key: 'agents' } as const, [])

const GUIDE: { name: string; does: string; when: string }[] = [
  { name: 'general-purpose', does: 'Investiga, busca y ejecuta tareas de varios pasos con todas las herramientas.', when: 'Tareas amplias o búsquedas en las que no sabes dónde está la respuesta.' },
  { name: 'claude', does: 'Agente comodín: hace cualquier cosa que no encaje en otro tipo.', when: 'Cuando ningún agente especializado encaja.' },
  { name: 'Explore', does: 'Solo lectura: barre muchos archivos y carpetas y te da la conclusión.', when: 'Localizar dónde está algo en un proyecto grande.' },
  { name: 'Plan', does: 'Arquitecto: diseña un plan paso a paso, archivos clave y pros/contras.', when: 'Antes de construir algo complejo.' },
  { name: 'claude-code-guide', does: 'Responde dudas sobre Claude Code, la API, el Agent SDK y Claude en Slack.', when: '"¿Puede Claude…?", "¿Cómo hago…?" sobre productos de Claude.' },
  { name: 'statusline-setup', does: 'Configura la línea de estado de Claude Code.', when: 'Personalizar la barra de estado.' },
]

const ICON: Record<AgentRow['status'], string> = {
  'en marcha': '●',
  terminado: '✓',
  fallido: '✗',
  detenido: '■',
}

function detail(input: unknown): string {
  const r = (input ?? {}) as Record<string, unknown>
  for (const k of ['description', 'file_path', 'query', 'pattern', 'url', 'path', 'command']) {
    const v = r[k]
    if (typeof v === 'string' && v.length > 0) return v.length > 60 ? v.slice(0, 57) + '…' : v
  }
  return ''
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agentes', description: 'Abre el panel de agentes (guía + en vivo)' })
    const list = await read($, agents)
    if (list.some(a => a.status === 'en marcha')) void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('command.run', { command: 'agentes' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Panel de agentes abierto.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const res = await next(e)
    if (res.agentId) {
      const row: AgentRow = {
        id: res.agentId,
        type: e.subagentType,
        task: e.description,
        status: 'en marcha',
        lastAction: 'arrancando…',
        actions: 0,
        startedAt: Date.now(),
      }
      await update($, agents, list => [...list.filter(a => a.id !== row.id), row].slice(-30))
      void $.ui.open({ id: PANE, title: TITLE })
    }
    return res
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      const d = detail(e)
      const action = d ? `${e.tool}: ${d}` : e.tool
      await update($, agents, list =>
        list.map(a => (a.id === id ? { ...a, status: 'en marcha', lastAction: action, actions: a.actions + 1 } : a)),
      )
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      const status: AgentRow['status'] = e.reason === 'answer' ? 'terminado' : e.reason === 'aborted' ? 'detenido' : 'fallido'
      const summary = e.answer ? e.answer.replace(/\s+/g, ' ').slice(0, 80) : 'sin respuesta'
      await update($, agents, list =>
        list.map(a => (a.id === id ? { ...a, status, lastAction: `Resultado: ${summary}`, endedAt: Date.now() } : a)),
      )
      const rest = await read($, agents)
      if (!rest.some(a => a.status === 'en marcha')) {
        $.clock.after(CLOSE_DELAY_MS, () => {
          void read($, agents).then(now => {
            if (!now.some(a => a.status === 'en marcha')) void $.ui.close({ id: PANE })
          })
        })
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, agents)
    const now = Date.now()
    const live = list.filter(a => a.status === 'en marcha').length

    return (
      <Box flexDirection="column">
        <Text bold>En vivo · {live} en marcha</Text>
        {list.length === 0 && <Text dimColor>Ningún agente lanzado todavía en esta sesión.</Text>}
        {[...list].reverse().map(a => (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor={a.status !== 'en marcha'}>
              {ICON[a.status]} {a.type} · {a.task}
            </Text>
            <Text dimColor>
              {'  '}{a.status} · {a.actions} acciones · {ago((a.endedAt ?? now) - a.startedAt)}
            </Text>
            <Text dimColor>{'  '}{a.lastAction}</Text>
          </Box>
        ))}
        <Text bold>Guía · qué hace cada agente</Text>
        {GUIDE.map(g => (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>{g.name}</Text>
            <Text>{g.does}</Text>
            <Text dimColor>Úsalo para: {g.when}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
