# Cypress E2E Tests Configuration

## Variables de Entorno

Las credenciales de testing no deben estar hardcodeadas en el código. Este proyecto utiliza variables de entorno para configurar las credenciales de testing.

### Configuración de Variables de Entorno

#### 1. Archivo `cypress.env.json` (Desarrollo Local)

Crea un archivo `cypress.env.json` en la raíz del proyecto cliente:

```json
{
  "testEmail": "tu-email@ejemplo.com",
  "testPassword": "tu-password"
}
```

**⚠️ IMPORTANTE:** Este archivo debe estar en `.gitignore` para no subir credenciales al repositorio.

#### 2. Variables de Sistema (CI/CD)

Para CI/CD, usa variables de entorno del sistema:

```bash
export CYPRESS_TEST_EMAIL="tu-email@ejemplo.com"
export CYPRESS_TEST_PASSWORD="tu-password"
```

#### 3. Configuración en GitHub Actions

En el archivo `.github/workflows/cypress.yml`, agrega las variables de entorno:

```yaml
env:
  CYPRESS_TEST_EMAIL: ${{ secrets.CYPRESS_TEST_EMAIL }}
  CYPRESS_TEST_PASSWORD: ${{ secrets.CYPRESS_TEST_PASSWORD }}
```

Y configura los secrets en GitHub:
- Ve a Settings → Secrets and variables → Actions
- Agrega `CYPRESS_TEST_EMAIL` y `CYPRESS_TEST_PASSWORD`

### Uso en las Pruebas

#### Comando Personalizado

El comando `cy.login()` usa automáticamente las variables de entorno:

```typescript
// Usa las variables de entorno por defecto
cy.login();

// O proporciona credenciales específicas
cy.login('email@ejemplo.com', 'password');
```

#### Acceso Directo a Variables

En las pruebas, puedes acceder a las variables de entorno:

```typescript
cy.get('#email').type(Cypress.env('testEmail'));
cy.get('#password').type(Cypress.env('testPassword'));
```

### Estructura de Archivos

```
onecgiar-pr-client/
├── cypress/
│   ├── e2e/
│   │   ├── login.cy.ts
│   │   ├── login-simplified.cy.ts
│   │   └── results-list.cy.ts
│   └── support/
│       └── commands.ts
├── cypress.config.js
├── cypress.env.json (NO SUBIR A GIT)
└── .gitignore
```

### Comandos de Ejecución

```bash
# 1. PRIMERO: Iniciar el servidor Angular
npm start

# 2. En otra terminal, ejecutar las pruebas:

# Ejecutar todas las pruebas
npm run cypress:run

# Ejecutar pruebas específicas
npx cypress run --spec "cypress/e2e/login*.cy.ts"

# Abrir interfaz interactiva
npm run cypress:open

# Ejecutar con variables de entorno específicas
CYPRESS_TEST_EMAIL=test@example.com CYPRESS_TEST_PASSWORD=password123 npm run cypress:run

# Ejecutar pruebas y subir screenshots a Argos
npm run cypress:run:argos

# Solo subir screenshots existentes a Argos
npm run argos:upload
```

### Integración con Argos (Visual Testing)

Este proyecto está configurado con Argos para testing visual automático:

#### Configuración
- **Token configurado**: En `cypress.config.js` y scripts de npm
- **Integración automática**: Los screenshots se toman automáticamente durante las pruebas
- **Subida automática**: Use `npm run cypress:run:argos` para ejecutar pruebas y subir screenshots

#### Enlaces útiles
- Dashboard de Argos: https://app.argos-ci.com/yecksin/onecgiar_pr
- Builds: Los enlaces se muestran después de cada subida

### Scripts Disponibles (package.json)

```json
{
  "cypress:open": "cypress open",
  "cypress:run": "cypress run", 
  "cypress:run:record": "cypress run --record --key $CYPRESS_RECORD_KEY",
  "argos:upload": "ARGOS_TOKEN=... npx argos upload ./cypress/screenshots",
  "cypress:run:argos": "cypress run && npm run argos:upload"
}
```

### Pruebas Disponibles

1. **login.cy.ts**: Pruebas completas de login con verificación de navegación a results list
2. **login-simplified.cy.ts**: Pruebas simplificadas usando el comando personalizado  
3. **results-list.cy.ts**: Pruebas específicas de la funcionalidad de la tabla de resultados

### Dependencias Instaladas

- **@argos-ci/cypress**: Integración de Argos con Cypress para screenshots automáticos
- **@argos-ci/cli**: CLI de Argos para subir screenshots manualmente

### Credenciales de Testing

Las credenciales por defecto configuradas son:
- Email: `yecksin.multimedia@gmail.com`
- Password: `Cypress@2`

Estas pueden ser sobrescritas usando las variables de entorno mencionadas anteriormente.

### Seguridad

- ✅ Las credenciales se manejan via variables de entorno
- ✅ El archivo `cypress.env.json` está en `.gitignore`
- ✅ Las credenciales no están hardcodeadas en el código
- ✅ Se usan secrets de GitHub Actions para CI/CD

## Resolución de Problemas

### ⚠️ NUNCA uses `sudo` con npm/npx

**PROBLEMA:** Error de permisos con npm/npx
```bash
npm error EACCES: permission denied
```

**SOLUCIÓN:**
```bash
# Corregir permisos de npm cache
sudo chown -R $(whoami):staff ~/.npm

# Corregir permisos del proyecto
sudo chown -R $(whoami):staff .

# Corregir permisos de Cypress cache
sudo chown -R $(whoami):staff ~/Library/Application\ Support/Cypress
```

### Servidor no está ejecutándose

**PROBLEMA:** 
```
Cypress failed to verify that your server is running.
```

**SOLUCIÓN:**
```bash
# En una terminal, iniciar el servidor Angular
npm start

# En otra terminal, ejecutar las pruebas
npm run cypress:run
```

### Token de Argos no encontrado

**PROBLEMA:**
```
Missing Argos repository token 'ARGOS_TOKEN'
```

**SOLUCIÓN:** El token ya está configurado en los scripts de npm. Use:
```bash
npm run argos:upload
# En lugar de: npx argos upload
``` 
