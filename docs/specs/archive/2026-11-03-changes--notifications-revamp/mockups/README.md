# Mockups — notifications-revamp

Fuente: Claude Design (`claude.ai/design/p/b6234307-e82b-43d0-b4c4-a2bb13b12242`, proyecto "PRMS Reporting"), exportado por Santiago el 2026-09-25.

## Archivos

- `PRMS-Reporting.dc.html` — export completo del prototipo (HTML plano con los design tokens del mockup como `var(--token)`, no valores hardcodeados). La sección de **Notifications** vive en el bloque `showNotifications` — buscar `showNotifications` en el archivo.
- `screenshots/notifications-list.png` — vista completa de la lista (Received/Sent, grupos Today/This week/Earlier, Accept/Decline, chips Accepted/Declined).
- `screenshots/bell-icon-badge.png` — ícono de campana del header con badge de no leídos.

## Resumen de la sección Notifications (para no releer todo el .dc.html)

- **Header de página:** `h1` 800/30px + ícono "i" con popover explicativo; subtítulo 14px `--text-3`.
- **Barra de controles:** segmented control Received/Sent; buscador 320px; botón Filter (panel con checkboxes por Program/Center/Bilateral project) con badge de conteo; chips de filtros activos; botón "Notification settings" alineado a la derecha.
- **Lista agrupada** Today / This week / Earlier: header de grupo con contador en píldora (JetBrains Mono); filas de 64px con avatar o ícono de entidad, texto con códigos de resultado en mono + link `--accent`, botones Accept/Decline, o chip de estado si ya hay decisión.
- **Bell icon (header):** botón 32px, badge `--primary` con borde `--surface` 2px.

## Tokens de estado usados (del mockup, para comparar contra `docs/ux-ui/design.md §7`)

- Accepted → `--st-approved-fg #047857` / `--st-approved-bg #D1FAE5` (dark: `#4FBF95` / `#14332A`)
- Declined → `--st-rejected-fg #B91C1C` / `--st-rejected-bg #FEF2F2` (dark: `#F08A85` / `#3A1D1D`)

⚠️ Pendiente de verificar en `/akili-propose` / `/akili-specify`: si estos tokens de estado (`--st-approved-*`, `--st-rejected-*`) ya existen en el design system del cliente o son nuevos que introduce este revamp. La intención del usuario es que el módulo de Notifications real quede **visualmente igual** a este mockup, pero construido con los tokens/componentes ya definidos en `docs/ux-ui/design.md §7` y Spartan — no copiando CSS del `.dc.html` tal cual.
