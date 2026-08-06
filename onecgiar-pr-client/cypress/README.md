# Cypress Testing (local-only)

Este proyecto utiliza Cypress para pruebas **end-to-end** y de **componentes** (component testing).

> ⚠️ **Solo local.** Cypress **NO** se ejecuta en GitHub Actions (el workflow `cypress.yml` fue
> eliminado a propósito). Estas pruebas existen para correrse en local y para que un **agente de
> IA pueda guiarse** con ellas al validar cambios (sobre todo en `custom-fields/`, que está
> excluido del coverage de Jest). No hay ejecución automática en CI.

## 🔧 Configuración

### 1. Copiar el archivo de ejemplo

```bash
cp cypress.env.js.example cypress.env.js
```

`cypress.env.js` está en `.gitignore`. **Nunca** se commitea.

### 2. Rellenar las credenciales

`cypress.config.js` lee el archivo con `require()`, así que debe ser **CommonJS**
(`module.exports`, no `export const`). Las claves que el config realmente lee son
**`guestEmail`**, **`guestPassword`** y **`userToken`**:

```javascript
// cypress.env.js
const environment = {
  cypress: {
    // Ruta lenta: login por formulario (cy.login('guest'))
    guestEmail: 'tu-email@domain.com',
    guestPassword: 'tu-contraseña',

    // Ruta rápida: sesión por token (cy.loginByToken()) — la preferida
    userToken: 'eyJhbGciOi...'
  }
};

module.exports = { environment };
```

#### ¿De dónde sale `userToken`?

Es el JWT crudo que la app guarda en `localStorage['token']`:

1. Iniciar sesión en el navegador (`http://localhost:4200`).
2. DevTools → Application → Local Storage → copiar el valor de la clave `token`.

`AuthService` (`src/app/shared/services/api/auth.service.ts`) sólo necesita
`localStorage['token']` y `localStorage['user']`; `cy.loginByToken()` siembra las dos (el objeto
`user` se reconstruye del payload del JWT) dentro de un `cy.session` cacheado entre specs.

### 3. Levantar el dev server

Los E2E corren contra `http://localhost:4200`, que apunta al backend de **testing**
(`prtest-back.ciat.cgiar.org`). Basta con `npm start` en otra terminal — **no** hace falta el
server local.

## 🚀 Uso

```bash
# Abrir Cypress en modo interactivo
npm run cypress:open

# Ejecutar todas las pruebas E2E
npm run cypress:run

# Ejecutar un spec concreto
npm run cypress:run -- --spec "cypress/e2e/result-detail/general-information.cy.ts"
```

### Component testing (custom-fields)

```bash
# Abrir Cypress en modo componentes (GUI)
npm run cypress:component

# Ejecutar todos los component tests (headless) — src/**/*.cy.ts
npm run test:ct
```

Los component specs viven junto a cada componente (ej.
`src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts`) y NO requieren credenciales ni
levantar `ng serve` (montan el componente aislado con el dev-server webpack de Cypress).

> Agentes en el sandbox de Cursor: el shell integrado setea `ELECTRON_RUN_AS_NODE=1` (rompe el
> binario de Cypress) y cambia `CYPRESS_CACHE_FOLDER`. Correr con:
> `env -u ELECTRON_RUN_AS_NODE CYPRESS_CACHE_FOLDER="$HOME/Library/Caches/Cypress" npm run test:ct`

### Comandos personalizados

```javascript
// Login rápido por token (preferido). Siembra localStorage y visita la URL indicada.
cy.loginByToken();                       // → '/'
cy.loginByToken('/result/results-outlet/results-list');

// Login por formulario (ejercita la pantalla de login real)
cy.login();               // rol Guest por defecto
cy.login('guest');
cy.login('guest', 'email@domain.com', 'password');

// Verificar si hay credenciales de formulario disponibles
cy.hasCredentials('guest');
```

> `cy.login()` **ya no** asume `/result-framework-reporting/home` como destino. La app redirige al
> primer science program asignado (`/result-framework-reporting/planned-toc?sp=<id>`) o, si el
> usuario no tiene ninguno, a `/result/results-outlet/results-list`. La aserción usa
> `LANDING_URL_PATTERN` (exportado desde `cypress/support/commands.ts`).

## 🛡️ Seguridad

Archivos ignorados por Git (nunca subirlos):

- `cypress.env.js` — credenciales y token locales
- `cypress.env.local.js`, `cypress.env.json` — legacy

### Manejo de credenciales vacías

- Los suites que necesitan sesión usan `describeWithToken` (`cypress/support/result-detail.ts`),
  que se convierte en `describe.skip` cuando no hay `userToken`. La suite sigue en verde en una
  máquina sin secretos.
- El spec de login marca como `it.skip` la prueba de sign-in real si faltan `guestEmail` /
  `guestPassword`; las aserciones del formulario corren siempre.

## 📁 Estructura

```
cypress/
├── e2e/
│   ├── app.cy.ts                  # Smoke sin credenciales (pantalla de login)
│   ├── login-simplified.cy.ts     # Formulario de login + sign-in real
│   ├── results-list.cy.ts         # Results Center: columnas RC_COLUMNS y filas
│   └── result-detail/
│       ├── general-information.cy.ts        # input + textarea + radios + yes/no, guardar, recargar
│       ├── contributors-and-partners.cy.ts  # selects y multiselects (chips, contador, búsqueda)
│       └── save-validation.cy.ts            # panel de campos obligatorios faltantes
├── fixtures/
├── support/
│   ├── commands.ts        # cy.loginByToken, cy.login, cy.hasCredentials
│   ├── e2e.ts             # Configuración global E2E (uncaught:exception)
│   ├── result-detail.ts   # Helpers de Result Detail + contrato DOM de custom-fields
│   ├── component.ts       # Runner de component testing (mount)
│   ├── ct-utils.ts
│   └── component-index.html
├── screenshots/           # Capturas de errores
└── videos/

# Component specs colocados junto a cada componente:
src/app/custom-fields/**/*.cy.ts
```

## 🧭 Contrato DOM de los `custom-fields` (leer antes de escribir un spec nuevo)

Estos componentes NO se comportan como widgets estándar. `cypress/support/result-detail.ts`
documenta y encapsula lo esencial:

- **Abrir un dropdown**: `app-pr-select` y `app-pr-multi-select` se abren sólo por CSS
  `:focus-within`. No hay handler de click en el trigger y un overlay `.remove_focus` lo **cierra**.
  → `cy.get('<scope> .custom_select a.field').focus()` (helper `openDropdown`).
- **Elegir opción**: click en `.options .option .label`.
- **Buscar**: `.options .search_input_container input` (helper `searchInDropdown`, re-enfoca antes
  de escribir porque Angular puede robar el foco entre comandos).
- **`app-pr-select`**: raíz `.pr-field` con `mandatory` / `complete`; etiqueta seleccionada en
  `a.field .text`; limpiar con `i.pr-select-clear`.
- **`app-pr-multi-select`**: no tiene `.pr-field`; `a.field .text` siempre muestra el placeholder.
  La selección son chips `.selected_container .chips_container .pr_chip_selected` más el contador
  `.selected_container .pr_description` (`<selectedLabel> (n)`). Los chips sólo se renderizan si el
  consumidor pasó `selectedLabel` **y** `selectedOptionLabel`.
- **`app-pr-input`**: raíz `.pr-input` (+`mandatory`), espejo de valor `.input-validation`, control
  `.pr-input .input_container input`. Nunca recibe `.complete`.
- **`app-pr-textarea`**: raíz `.pr-field` (+`mandatory`/`complete`), control
  `.pr-field .input_container textarea`.
- **`app-pr-radio-button`**: los ids `radio_{{i}}` **colisionan** entre grupos → anclar por texto:
  `cy.contains('.radioButton', 'Yes').find('input.pr-native-radio')`.
- **`app-pr-yes-or-not`**: `cy.contains('.field_container .choice', 'Yes').click()`; el estado
  seleccionado es `.choice.yes` / `.choice.no`. `FieldsManagerService` puede ocultarlo por portfolio.
- **`app-save-button`**: el nodo clickeable es un `<div>`, no un `<button>` →
  `cy.get('app-save-button app-pr-button')`. Muestra `Saving` mientras `saveButtonSE.isSaving()`.
  El panel de faltantes es `.fields-feedback-list`, colapsado en `.counter` (`n alerts`) y expandido
  con `.back_icon` en `.items .item` (`<strong>Campo</strong> is missing`).

Los specs de Result Detail **nunca** hardcodean un id de resultado: `findEditableResultUrl()` abre
el Results Center, toma la primera fila que apunta a `/result/result-detail/` y verifica que sea
editable (hasta 5 candidatas) antes de usarla.

## 🕐 Ejecución

- **Solo local.** No hay ejecución automática en GitHub Actions.
- Correr E2E con `npm run cypress:run` y component tests con `npm run test:ct` antes de
  commitear cambios en los componentes cubiertos.

## 🎯 Mejores Prácticas

1. **Preferir `cy.loginByToken()`** — es una sesión cacheada, mucho más rápida que el formulario.
2. **Anclar por texto, no por id** — los ids de los `custom-fields` colisionan entre grupos.
3. **Usar selectores como string, no elementos capturados** — Result Detail re-renderiza en cada
   callback de catálogo y un nodo guardado se desprende del DOM a mitad del test.
4. **Esperar el payload de la sección** (`openGeneralInformation` / `openContributorsPartners`)
   antes de aseverar: los catálogos llegan en peticiones separadas.
5. **Dejar el dato como estaba** — los specs corren contra el backend compartido de testing; las
   ediciones se escriben como toggles reversibles y las selecciones se restauran.
6. **Manejar la ausencia de secretos** — usar `describeWithToken` para que el suite siga en verde.

## 🔍 Debugging

```bash
# Ejecutar con debug
DEBUG=cypress:* npm run cypress:run

# Ejecutar con UI para ver en tiempo real
npm run cypress:open
```
