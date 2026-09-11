# Cómo retomar el defecto del auto-relleno del Innovation Developer

**Para mañana, 2-sep-2026.** Defecto abierto: `W-20260901-47` · Historia: **P2-3272 Part 4**.
El escenario **ya está montado** y no hay que volver a construirlo.

---

## Lo que está probado (no volver a medirlo)

En prtest, resultado **`8560`**, fase **Reporting 2026** (`?phase=36`), sección *Innovation
Development information*:

| Pieza | Estado | Cómo se comprobó |
|---|---|---|
| El dato | ✅ presente | `currentResult.lead_contact_person = "Cadavid, Juan Carlos (Alliance Bioversity-CIAT)"` — y el signal devuelve **el mismo objeto**, mismo valor |
| El gate | ✅ `true` | `isInnovationDeveloperAutoFilled2026()` leído en vivo |
| El método | ✅ funciona | llamando a `applyInnovationDeveloperAutoFill()` **a mano**, con la página cargada, **rellena correctamente** |
| El campo en pantalla | 🛑 **vacío** | `Innovation Developer` sin valor |
| La otra mitad del cambio | ✅ correcta | la nota gris **no** se muestra en 2026 y **sí** en 2025 |

**Las tres piezas están bien por separado. Lo que falla es la relación entre ellas** — concretamente,
*cuándo* se ejecuta el método respecto a *cuándo* están listas las otras dos.

---

## 🛑 Hipótesis YA DESCARTADA — no repetir este intento

> *"El contacto llega después del GET de la sección, así que la llamada única del `next` corre
> demasiado pronto y nadie vuelve a mirar."*

**Descartada el 1-sep con evidencia.** Escrita como test, **PASA contra el código roto**: al cambiar
`currentResultSignal()` se re-dispara `OnChangePortfolio`, que **recarga la sección** y vuelve a
aplicar el relleno, así que en el test el campo siempre acaba relleno — por una vía que en el
navegador no se dio.

🥇 **Y esa es la regla que salió de aquí:** un test que **pasa a la primera contra el código roto**
está escrito a la suposición del autor. Cuando eso ocurre, **se tira la hipótesis, no el test**, y
**no se arregla nada hasta tener otra**.

⚠️ **Por eso no se cambió el orden de las llamadas.** Habría dejado los tests verdes, el ticket
cerrado y el defecto vivo en pantalla — con una capa más de falsa confianza encima.

---

## El plan, en tres pasos y en este orden

### 1. Cronometrar los tres tiempos (instrumentar, no suponer)

Con el navegador en `8560`, `?phase=36`, y **recarga en frío**. Lo que hay que capturar, con marca
de tiempo cada uno:

1. **Cuándo responde el GET de la sección** — el `next` de `getSectionInformationp25()`.
2. **Cuándo el signal trae el contacto** — primer instante en que
   `currentResultSignal()?.lead_contact_person` deja de ser nulo.
3. 🥇 **Cuándo el gate pasa a `true`** — `isInnovationDeveloperAutoFilled2026()`. **Es el único de
   los tres que no se cronometró**, y es el sospechoso que queda: el gate depende de `phase_year`,
   que llega en el mismo objeto que el contacto, así que puede ser `false` en el momento exacto de
   la llamada aunque después sea `true`.

Forma práctica: envolver los tres en un `MutationObserver`/`setInterval` corto desde la consola, o
parchear el método en caliente para que registre `performance.now()` y el valor de las tres piezas
en su entrada.

### 2. Escribir el caso que reproduzca el fallo — y aplicarle el criterio

Con los tiempos medidos, escribir el test **antes** de tocar el componente.

🛑 **Si pasa a la primera contra el código actual, está mal escrito: tirar la hipótesis y volver al
paso 1.** No arreglar.

### 3. Arreglar, solo entonces

Condiciones acordadas para el arreglo, sea cual sea la causa:

- Sostener **explícitamente** el *"solo si está vacío"*, porque la solución probablemente se ejecute
  más de una vez y **no debe pisar lo que el reportante acaba de teclear**.
- **Los seis tests existentes se quedan.** Si siguen pasando con el arreglo, mejor: prueba que el
  orden bueno tampoco se rompió.
- **Zoneless: el test tiene que ejercer el DOM renderizado**, no el campo de clase. Un assert sobre
  la propiedad pasa con el defecto presente — que es cómo se coló la primera vez.

---

## Datos y rutas que ahorran el arranque

```
Resultado con el escenario montado :  8560   (Innovation Development, fase 2026)
Contacto guardado en él            :  "Cadavid, Juan Carlos (Alliance Bioversity-CIAT)"
URL                                :  /result/result-detail/8560/innovation-dev-info?phase=36
Ids de fase                        :  Reporting 2026 = 36   ·   Reporting 2025 = 34
Comparación 2025                   :  5921  (?phase=34)
```

El contacto se creó el 1-sep **a propósito y se deja puesto** — regla 22 del `CLAUDE.md` de
`reporting`: en prtest los datos de prueba se crean y **no se restauran**. Sin ese dato el defecto es
invisible: se probaron **doce** resultados de fase 2026 y **ninguno** tenía contacto.

---

## Lo que NO hay que tocar de paso

- ⚠️ **La recarga de sección descarta lo tecleado sin guardar.** Es real, pero es **preexistente y ya
  aceptado** (mismo efecto que la recarga del AI Review, `2026-09-01-verificacion-pendiente.md` §3).
  Un test suyo aquí deja el CI rojo y cuelga a esta historia un defecto que no es suyo.
- **La mitad de la nota gris ya funciona** — verificada en pantalla en las dos fases. El arreglo no
  debe alterarla.
