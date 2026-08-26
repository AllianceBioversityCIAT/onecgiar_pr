# Cómo validar que una entrega ya está en prtest

**Verified:** 2026-08-26 · branch `performance-refactor` · `d1501fd55`

Escrito porque el 26-ago se perdió casi una hora afirmando "no está desplegado" con
comprobaciones que no probaban nada. Esto es lo que sí sirve.

## La cadena de despliegue

```
git push origin performance-refactor
   └─> GitHub Action  .github/workflows/jenkins-trigger.yml
         └─> POST https://automation.prms.cgiar.org/job/prms-reporting-tool-dev/build
               └─> despliegue a  https://prtest.ciat.cgiar.org
```

Sí hay CD: **pushear a `performance-refactor` dispara el despliegue solo**. No hay que pedirlo.

> ⚠️ **El nombre del job engaña.** Se llama `prms-reporting-tool-dev` pero **no** despliega `dev`:
> despliega `performance-refactor` a **prtest**. Los nombres quedaron invertidos temporalmente por
> el cambio de dominio. No deduzcas la rama ni el ambiente por el nombre del job — lee el workflow.

## 🥇 La única prueba fiable: el sello de build

`onecgiar-pr-client/src/app/shared/constants/app-version.constants.ts` define `APP_VERSION`, que se
pinta junto al wordmark del sidebar (`Build v11`). El bundle de prtest **no está minificado**, así
que se puede leer sin navegador:

```bash
curl -s https://prtest.ciat.cgiar.org/main.js | grep -oE 'APP_VERSION = "[0-9]+"'
```

**Es un contador escrito a mano. Súbelo en uno en cada entrega que QA vaya a verificar.** Si no lo
subes, el sello miente: el 26-ago llevaba semanas en `10`, y doce commits después seguía diciendo
`10` — no había forma de distinguir *"está roto"* de *"todavía no está desplegado"*. Ese es
exactamente el ciclo que se perdió en **P2-3245**.

Para QA, la instrucción en el ticket se escribe así: *"esto sale en la v11; si el sidebar dice v10,
estás en una versión anterior y no hay nada que reportar"*.

## Ver si el disparo salió

```bash
gh run list --workflow=jenkins-trigger.yml --limit 5 \
  --json displayTitle,status,conclusion,createdAt,headSha
```

- El run tarda en aparecer: el de `d5385f52d` se pusheó 11:23 y arrancó 11:47 (hora local).
- Se han visto runs atascados en `queued` más de hora y media — si el sello no cambia, mira aquí antes de suponer nada.
- 🛑 `completed/success` significa **"Jenkins fue notificado"**, no "ya está desplegado". Son dos cosas distintas.

## Lo que NO funciona (probado y descartado)

| Método | Por qué falla |
|---|---|
| Rastrear chunks con regex desde `main.js` | Angular referencia chunks lazy dentro de otros chunks. Barriendo desde `main.js` bajas ~60 y el de `pages/bilateral` **no está entre ellos** → falso negativo garantizado. |
| `Last-Modified` de `main.js` | Nginx lo genera al vuelo: devuelve la hora de tu petición. |
| El número de build a secas | Solo vale si alguien lo subió. Ver arriba. |

Lo que sí complementa al sello: abrir la pantalla en el navegador y mirarla.
