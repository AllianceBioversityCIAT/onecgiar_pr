# Cypress E2E Testing

Este proyecto utiliza Cypress para pruebas end-to-end automatizadas.

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

### Configuración en Producción (GitHub Actions)

Las credenciales se configuran como GitHub Secrets:
- `CYPRESS_GUEST_EMAIL`: Email del usuario Guest
- `CYPRESS_GUEST_PASSWORD`: Contraseña del usuario Guest

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
│   ├── commands.ts        # Comandos personalizados
│   └── e2e.ts            # Configuración global
├── screenshots/           # Capturas de errores
├── videos/               # Videos de las pruebas
└── cypress.env.js        # Credenciales locales (no en Git)
```

## 🕐 Ejecución Automática

El sistema ejecuta pruebas automáticamente:
- **Cada 4 horas** mediante GitHub Actions
- **Al hacer push** a las ramas `master` o `dev`
- **Al crear Pull Requests**

Los resultados se notifican por Slack con:
- ✅ Estado de éxito
- ❌ Detalles de fallos
- 📊 Resumen de pruebas ejecutadas

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
