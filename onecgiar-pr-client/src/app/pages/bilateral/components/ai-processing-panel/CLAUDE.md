# ai-processing-panel

**Verified:** 2026-09-15 · branch qa-development-2026 · `APF-T-10`

## Qué es
Panel de retroalimentación de procesamiento de IA (`app-ai-processing-panel`) que reemplaza los bloques inline anteriores en el flujo de carga bilateral (`bilateral-ai-upload`). Presenta un stepper de 6 etapas, reloj de tiempo transcurrido, rango de duración esperada según mezcla de fuentes, posición en cola, intentos/reintentos, y bloques de desenlace terminal (`completed`, `completed_no_candidates`, `failed`, `still_running`).

## Contrato de Componente
- **Completamente presentacional y OnPush:** No realiza peticiones HTTP, no mantiene timers propios (`setInterval`), ni maneja suscripciones directas.
- **Inputs:**
  - `job: NormalizedBilateralAiJob | null` — Modelo normalizado del job (con `queueEntryDate`, `documentKeys`, `audioKeys`, `attempts`, `retrying`, etc.).
  - `status: BilateralAiUploadState['status']` — Estado actual de la carga/job (`pending | processing | still_running | failed | completed | completed_no_candidates`).
  - `expectation: BilateralAiExpectations | null` — Rangos p50..p90 según mezcla de fuentes calculados por el servidor.
  - `now: number` — Marca de tiempo actual suministrada por el componente anfitrión cada segundo.
- **Outputs:**
  - `retry: void` — Disparado cuando el usuario hace clic en "Try again" en un job fallido.
  - `resetUpload: void` — Disparado para volver al formulario limpio ("Upload different files" o "Start another").
  - `openDrafts: void` — Disparado cuando el job completó con éxito para navegar a "AI Draft Results".

## Invariantes Fundamentales
1. **Input-driven / Sin estado interno:** Cada sondeo del polling vuelve a renderizar la misma vista sin parpadeos, skeletons ni reseteos. El componente no conoce la red.
2. **Sin fallos declarados por el cliente:** El cliente jamás declara un job como `failed` por su cuenta por simple paso del tiempo. Los fallos solo provienen del servidor (`status: 'failed'`). Si el cliente agota su ventana de polling mientras el job sigue activo en el servidor, transiciona a `still_running`, dejando las opciones de seguir esperando o navegar.
3. **Superficie única vía `panelVisible`:** Cuando el usuario está en el creador con el panel abierto, `BilateralAiService.panelVisible` se mantiene en `true`, lo cual suprime el diálogo modal global (`app-bilateral-ai-completion-dialog`). Si el usuario navega fuera, `panelVisible` se vuelve `false` y el modal global toma el relevo al completarse el job.
4. **Reloj basado en `queue_entry_date`:** El cálculo del tiempo transcurrido (`elapsedSeconds`) se calcula a partir de `queue_entry_date` devuelto por el servidor, nunca desde la hora local de subida del cliente.
5. **Token Gate / Estilos:** Cumplimiento estricto con las variables semánticas de diseño de PRMS (`var(--pr-*)`). Sin colores hexadecimales en bruto ni tokens inexistentes.

## Pruebas
- Jest unit specs: `ai-processing-panel.component.spec.ts` (pruebas de renderizado de estados, etiquetas de fuentes, accesibilidad `aria-live`).
- Cypress CT: `ai-processing-panel.cy.ts` (validación de layout responsivo a 1280px, 900px y 375px; comportamiento con `prefers-reduced-motion: reduce`).
