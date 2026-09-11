# P25 — Tipología ToC ↔ tipo de resultado y validación de mapeos

> Documento técnico: [p25-toc-result-type-rules.md](./p25-toc-result-type-rules.md)

---

## 1. Correspondencia tipología ToC → tipo de resultado

PRMS infiere el tipo de resultado si el campo **tipología del indicador ToC** (`type_value`) **contiene** el texto indicado:

| Tipología del indicador ToC (contiene…) | Tipo de resultado |
|----------------------------------------|-------------------|
| `Number of knowledge products` | Knowledge product |
| `Number of innovations` | Innovation development |
| `Number of people trained` | Capacity sharing for development |
| `Number of Policy` | Policy change |
| `Innovation Use` | Innovation use |

**Ejemplos que hacen match:**

| `type_value` en catálogo ToC | Tipo asignado |
|------------------------------|---------------|
| `Number of knowledge products` | Knowledge product |
| `Number of innovations (innovation development)` | Innovation development |
| `Number of people trained (capacity sharing for development)` | Capacity sharing for development |

**Tipos de resultado sin patrón** (no se infiere tipología; no se filtra el catálogo ToC por tipo):

| Tipo de resultado |
|-------------------|
| Other output |
| Other outcome |
| Capacity change |
| Impact contribution |

**Indicador custom:** `type_value` contiene `custom` → no se valida coherencia de tipos.

**Indicador neutro:** tipología que no coincide con ningún patrón estándar (o vacía) → disponible para cualquier tipo estándar en mapeos planned.

---

## 2. Cómo se controla el mapeo (tres capas)

### Capa A — Qué nodos e indicadores puedes **seleccionar** (filtro de lista)

Solo aplica al cargar el catálogo ToC en **Contributors & Partners** cuando el resultado es **planned** y su tipo tiene patrón (tabla §1).

| Condición | ¿Filtro por tipología? |
|-----------|------------------------|
| Planned + tipo estándar (KP, Innovation development, etc.) | **Sí** |
| Unplanned | **No** |
| Planned + Other output / Other outcome / Capacity change / Impact contribution | **No** |
| Nodo o indicador **ya mapeado** a este resultado | **Siempre visible** |

**Nodo visible** si tiene al menos un indicador que coincide con el tipo del resultado, o es neutro (sin indicadores de otros tipos estándar), o ya estaba mapeado.

**Indicador seleccionable** si su tipología coincide con el tipo del resultado, o es neutro/vacía, o ya estaba guardado en el mapeo.

**No se puede elegir** un indicador cuya tipología corresponde claramente a **otro** tipo estándar (salvo que ya estuviera mapeado).

---

### Capa B — Validación al **guardar** el mapeo (API)

Al crear desde Result Framework Reporting o al guardar indicadores ToC:

| Se valida | No se valida |
|-----------|--------------|
| El indicador existe en catálogo ToC | Que tipología del indicador = tipo del resultado |
| El indicador pertenece al nodo ToC (`toc_result_id`) enviado | |
| `number_target` numérico si se envía | |

---

### Capa C — Validación al **submit** del resultado (green check P25)

Funciones MySQL `validation_toc_P25` y `validation_contributor_partner_P25`.

**No comprueban** que tipología del indicador y tipo de resultado coincidan.

#### `validation_contributor_partner_P25` — parte ToC

| Planned | Requisito para pasar |
|---------|---------------------|
| **No** | Narrativa de progreso ToC válida |
| **Sí** | Por cada fila de mapeo activa: narrativa válida + nodo ToC seleccionado + indicador seleccionado + `number_target > 0` |

#### `validation_toc_P25` — estructura del mapeo

| Requisito |
|-----------|
| `planned_result` definido en cada mapeo ToC activo |
| Iniciativa líder: exactamente un mapeo con nodo ToC |
| Cada iniciativa contribuyente: su propio mapeo ToC con nodo |

---

## 3. Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde se exige que KP solo mapee a KPIs de knowledge products? | En el **filtro de lista** (planned + tipo estándar), no en submit |
| ¿El submit falla si tipología ≠ tipo de resultado? | **No** |
| ¿Unplanned tiene filtro de tipología? | **No** |
| ¿Other output/outcome tienen filtro? | **No** |
| ¿Indicadores neutros o custom en planned? | **Sí**, seleccionables |
| ¿Qué exige submit en planned? | Nodo + indicador + meta > 0 + narrativa |

---

## Historial

| Fecha | Descripción |
|-------|-------------|
| 2026-06-25 | Versión enfocada: correspondencia tipología ↔ tipo y validación de mapeos. |
