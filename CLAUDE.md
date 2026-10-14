# claude-panel-agentes

Plugin de Claude Code: panel que se abre solo cuando hay agentes trabajando (guía + monitor en vivo) y enrutado automático de modelo por tipo de agente.

## Estructura
- `.claude-plugin/plugin.json` — manifiesto del plugin
- `.claude-plugin/marketplace.json` — marketplace mínimo (un solo plugin, `source: "./"`)
- `hooks/register.tsx` — toda la lógica: panel, reglas de enrutado (`ROUTES`), guía de agentes
- `types/index.d.ts` — contrato de `$.state` (`AgentRow`)
- `tests/panel.test.ts` — tests con `claude plugin test`

## Antes de tocar `hooks/register.tsx`
1. Edita `ROUTES` para cambiar qué modelo usa cada tipo de agente.
2. `claude plugin validate .`
3. `claude plugin test .`
4. Sube la nueva versión subiendo el número en `plugin.json`.

No hace falta leer nada más del repo para trabajar en esto: todo el contenido relevante está en los archivos de arriba.
