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
# Ejecutar todas las pruebas
npm run cypress:run

# Ejecutar pruebas específicas
npx cypress run --spec "cypress/e2e/login*.cy.ts"

# Abrir interfaz interactiva
npm run cypress:open

# Ejecutar con variables de entorno específicas
CYPRESS_TEST_EMAIL=test@example.com CYPRESS_TEST_PASSWORD=password123 npm run cypress:run
```

### Pruebas Disponibles

1. **login.cy.ts**: Pruebas completas de login con verificación de navegación a results list
2. **login-simplified.cy.ts**: Pruebas simplificadas usando el comando personalizado
3. **results-list.cy.ts**: Pruebas específicas de la funcionalidad de la tabla de resultados

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
