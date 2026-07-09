# Cypress Testing (local-only)

Este proyecto utiliza Cypress para pruebas **end-to-end** y de **componentes** (component testing).

> ⚠️ **Solo local.** Cypress **NO** se ejecuta en GitHub Actions (el workflow `cypress.yml` fue
> eliminado a propósito). Estas pruebas existen para correrse en local y para que un **agente de
> IA pueda guiarse** con ellas al validar cambios (sobre todo en `custom-fields/`, que está
> excluido del coverage de Jest). No hay ejecución automática en CI.

## 🔧 Configuración

### Credenciales por Roles

El sistema ahora maneja diferentes roles de usuario:

- **Guest**: Usuario básico para pruebas generales
- **Admin**: Usuario administrativo (para uso futuro)

### Configuración Local

1. **Copia el archivo de ejemplo**:
   ```bash
   cp cypress.env.js.example cypress.env.js
   ```

2. **Configura tus credenciales**:
   ```javascript
   // cypress.env.js
   export const environment = {
     cypress: {
       testEmail: 'tu-email@domain.com',
       testPassword: 'tu-contraseña'
     }
   };
   ```

3. **O usa variables de entorno**:
   ```bash
   export CYPRESS_GUEST_EMAIL=tu-email@domain.com
   export CYPRESS_GUEST_PASSWORD=tu-contraseña
   ```

## 🚀 Uso

### Comandos disponibles

```bash
# Abrir Cypress en modo interactivo
npm run cypress:open

# Ejecutar todas las pruebas
npm run cypress:run

# Ejecutar pruebas específicas
npm run cypress:run -- --spec "cypress/e2e/login-simplified.cy.ts"
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
// Login con role por defecto (Guest)
cy.login();

// Login con role específico
cy.login('guest');

// Login con credenciales específicas
cy.login('guest', 'email@domain.com', 'password');

// Verificar si hay credenciales disponibles
cy.hasCredentials('guest');
```

## 🛡️ Seguridad

### Archivos ignorados por Git

Los siguientes archivos NO se suben al repositorio:
- `cypress.env.js` - Credenciales locales
- `cypress.env.local.js` - Credenciales locales (legacy)
- `cypress.env.json` - Credenciales locales (legacy)

### Manejo de credenciales vacías

Si no hay credenciales disponibles:
- Las pruebas que requieren login se saltarán automáticamente
- Se mostrarán mensajes informativos en los logs
- La aplicación no fallará por falta de credenciales

## 📁 Estructura

```
cypress/
├── e2e/                    # Pruebas end-to-end
│   ├── app.cy.ts          # Pruebas básicas de la aplicación
│   ├── login-simplified.cy.ts  # Pruebas de login
│   └── results-list.cy.ts # Pruebas de lista de resultados
├── fixtures/              # Datos de prueba
├── support/               # Comandos y configuración
│   ├── commands.ts        # Comandos personalizados (login, etc. — E2E)
│   ├── e2e.ts            # Configuración global E2E
│   ├── component.ts       # Runner de component testing (mount)
│   └── component-index.html
├── screenshots/           # Capturas de errores
├── videos/               # Videos de las pruebas
└── cypress.env.js        # Credenciales locales (no en Git)

# Component specs colocados junto a cada componente:
src/app/custom-fields/**/*.cy.ts
```

## 🕐 Ejecución

- **Solo local.** No hay ejecución automática en GitHub Actions.
- Correr E2E con `npm run cypress:run` y component tests con `npm run test:ct` antes de
  commitear cambios en los componentes cubiertos.

## 🎯 Mejores Prácticas

1. **Usa roles específicos**: Siempre especifica el role al hacer login
2. **Verifica credenciales**: Usa `cy.hasCredentials()` antes de pruebas que requieran login
3. **Maneja errores**: Las pruebas deben funcionar con o sin credenciales
4. **Mantén seguridad**: Nunca subas credenciales al repositorio

## 🔍 Debugging

Para debug local:
```bash
# Ejecutar con debug
DEBUG=cypress:* npm run cypress:run

# Ejecutar con UI para ver en tiempo real
npm run cypress:open
``` 
