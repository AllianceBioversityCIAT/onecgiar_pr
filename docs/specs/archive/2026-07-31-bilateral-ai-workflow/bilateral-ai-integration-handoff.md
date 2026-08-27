# Bilateral AI — Integration Handoff (PRMS ↔ Text Mining)

> **Scope:** solo el contrato de integración entre PRMS y el servicio de AI / text mining.  
> **No cubre:** UI wizard manual, Section 5 MDS del form, AI Review traffic-light (Phase 4), bulk Excel.  
> **Related:** `docs/specs/bilateral-ai-workflow/bilateral-spec.md` (spec amplio QA-AI), Epic [P2-2965](https://cgiarmel.atlassian.net/browse/P2-2965), mining tickets Dani (P2-3158+).  
> **Status:** draft — pending alignment session with Daniela Gómez  
> **Last updated:** 2026-07-16

---

## 1. Purpose

Definir con claridad:

1. Qué esperamos del equipo de AI (Daniela Gómez).
2. Un **contrato estable** request/response.
3. Qué manda PRMS.
4. Qué responde mining.
5. Qué **persiste PRMS** (ownership interno; no es responsabilidad de AI).

Principio: **mining = evidencia → candidatos**. **PRMS = orquestación, job, Drafts, proyecto/programa, promote.**

---

## 2. Ownership split

| Responsable | Entrega |
|---|---|
| **Daniela / AI services** | Auth, validaciones de límites, extracción multisource, response de candidatos + MDS extraído (sin ToC), errores tipados, OpenAPI |
| **PRMS (backend + frontend bilateral)** | Upload a S3 / job, cola/orquestación, crear Drafts, `DraftEvidence`, notificaciones, promote Draft→Editing, UI “My Draft Results”, sellado de proyecto/programa |

```
Daniela:  evidencia (+ hints)  →  candidatos AI
PRMS:     candidatos           →  Draft → Editing → Pending Review
```

---

## 3. Qué esperamos de Daniela

### 3.1 Servicio listo para consumo backend

- Endpoint documentado (p.ej. `POST /prms/text-mining`).
- Auth estable (p.ej. CLARISA `X-API-Key`); sin exponer secrets al browser.
- PRMS **nunca** llama al mining desde el frontend.

### 3.2 Validaciones de entrada (alineadas al modelo)

Deben estar **definidas, aplicadas en el servicio y documentadas**. PRMS las refleja en UI (mensajes / disable upload).

| Límite | Qué fijar |
|---|---|
| Máx. sources / documentos por request | número |
| Tipos MIME / extensiones | PDF, DOCX, … |
| Peso máx. por archivo / total | MB |
| Máx. páginas PDF | número o rechazo claro |
| Free text | máx. chars |
| Audio | duración, formatos, tamaño; comportamiento si Transcribe no está |
| Errores | `400` / `413` / `415` / `503` + `code` + `message` usable en UI |

Los límites no son solo infra: deben cuadrar con lo que el **modelo** puede procesar bien.

### 3.3 Comportamiento ante fallo

Acordar y documentar: **all-or-nothing** vs parcial (hoy tickets mining apuntan a fallar el request si una fuente falla).

### 3.4 Entregables de alineación

- OpenAPI / ejemplo real request + response.
- Ejemplo de candidate para al menos 1–2 tipos (p.ej. Capacity Sharing, Innovation Development).
- Sync vs async (timeout, job_id + poll, o PRMS orquesta 202 + cola propia).

---

## 4. Contrato estable (mínimo a fijar)

| Tema | Decisión |
|---|---|
| Endpoint + versión | p.ej. path + `api-version` / `Accept` |
| Auth | header + scope |
| Sync vs async | a acordar |
| Idempotencia | `client_request_id` opcional |
| Fallo | all-or-nothing vs parcial |
| ToC | **fuera de scope** de extracción |

---

## 5. Qué manda PRMS → mining

Solo lo necesario para extraer. Preferible **S3 keys / URLs firmadas**, no corpora enormes en el body.

| Campo | Obligatorio | Notas |
|---|---|---|
| `keys` / `files` / `text` / `audio_keys` | al menos un grupo no vacío | multisource |
| `bucketName` | si hay paths S3 / upload | free-text-only puede no requerirlo |
| `center` (id o acronym) | recomendado | contexto |
| `project_id` | recomendado | Reporting Project ya elegido |
| `program_code` (o initiative id) | **hint opcional** | ver §7 — no es fuente de verdad |
| `result_type_hints[]` | opcional | acotar extracción |
| `user_id` | opcional | solo telemetría / interactions |

PRMS **no** espera que mining cree el resultado en BD ni asigne status Draft.

---

## 6. Qué responde mining → PRMS

Shape conceptual (nombres finales a acordar):

```json
{
  "request_id": "…",
  "status": "success | failed",
  "sources_processed": [
    {
      "source_id": "…",
      "source_type": "document | text | audio",
      "ok": true,
      "pages_or_duration": null,
      "error": null
    }
  ],
  "candidates": [
    {
      "candidate_id": "…",
      "confidence": 0.0,
      "suggested_result_type_id": null,
      "suggested_result_level_id": null,
      "extracted_mds": {
        "title": null,
        "description": null,
        "geography": null,
        "contributors": null,
        "type_specific": {}
      },
      "provenance": [{ "source_id": "…", "excerpt_refs": [] }],
      "warnings": []
    }
  ],
  "limits_applied": {},
  "error": { "code": null, "message": null, "failing_source_id": null }
}
```

### Reglas del response

- **Sin ToC** en `extracted_mds`.
- Definir escala de `confidence` (0–1 vs 0–100).
- 0 candidates: ¿`success` vacío o error de negocio?
- Warnings tipados (confidential, low content, too old, etc.) si el servicio filtra o solo avisa.

---

## 7. Proyecto → programa: ownership PRMS (crítico)

Al seleccionar el **Reporting Project** en el wizard, el usuario queda ligado a un **programa** (Primary Contributing del W3 Registry / mapping). Eso **no lo inventa ni lo extrae** la IA.

### Decisión

| Enfoque | Usar |
|---|---|
| Fuente de verdad | Wizard + snapshot en **job PRMS** al iniciar el proceso |
| Envío a mining | Solo **hint opcional** (`program_code`) para acotar extracción |
| Response mining | **No** se usa para persistir programa (echo solo trazabilidad, si existe) |
| Creación de Drafts | Sellar `project_id` + programa **desde el job** |

Así se evita que el modelo cambie o invente el programa, y los Drafts quedan alineados al wizard aunque el mining falle a medias.

---

## 8. Qué almacena PRMS (interno — no es de Daniela)

Mencionado en el handoff para claridad de fronteras.

| Persistencia | Contenido |
|---|---|
| **Job** (p.ej. `BilateralAiJob`) | Quién, cuándo, status, `request_id` externo, error; snapshot wizard: `project_id`, `program_code` / initiative, center |
| **Draft link** (p.ej. `BilateralAiDraft`) | `result_id` (Draft), `candidate_id`, `confidence` |
| **DraftEvidence** | `s3_key`, tipo DOC / VOICE / TEXT, `is_formal_evidence` (default false) |
| **Snapshot útil** | JSON `extracted_mds` + provenance (badges “AI suggested”, auditoría) |
| **No guardar** | Corpus completo del PDF, audio crudo, API keys, secrets |

### Evidencia formal (recordatorio de producto)

- Documentos (PDF/DOCX/…) = candidatos a evidencia formal.
- Voice note + text context = **solo contexto AI**, nunca evidencia formal.
- Al promote Draft → Editing, el usuario marca qué docs pasan a evidencia formal.

### Status (producto)

- Draft (nuevo, p.ej. `8`) solo en ruta AI, antes de revisión usuario.
- Promote → Editing (`1`) → Pending Review (`5`) → Approved / Rejected.
- W3 no usa Quality Assessed / Submitted del flujo pooled.

---

## 9. Flujo resumido (integración)

```
1. Usuario elige proyecto + programa (+ level/type si aplica al flujo AI)
2. Usuario sube files / text / audio
3. PRMS: valida UI → S3 → crea Job (con snapshot proyecto/programa) → llama mining
4. Mining: valida límites → extrae → responde candidates
5. PRMS: crea Drafts sellados desde Job + DraftEvidence + guarda snapshot MDS
6. Notifica (in-app + email) → My Draft Results
7. Usuario promote (elige evidencia formal) → Editing → completa → submit
```

---

## 10. Checklist de sesión con Daniela

- [ ] Tabla de **límites** (docs, MB, páginas, audio, text) + códigos de error  
- [ ] **Request** final (obligatorios / opcionales)  
- [ ] **Response** de un candidate real (1–2 tipos)  
- [ ] Sync vs async  
- [ ] Fallo parcial vs total  
- [ ] Quién filtra confidential / too-old / low-content (ella vs solo warning)  
- [ ] Confirmación: programa = hint; persistencia = PRMS job  
- [ ] Auth + entorno (dev/test) para prueba de integración  

---

## 11. Open questions (integración)

| ID | Pregunta | Owner | Status |
|---|---|---|---|
| AI-OQ-1 | ¿Límites exactos (páginas, MB, audio)? | Daniela / AI | Open |
| AI-OQ-2 | ¿Mining bilateral-ready para tipos W3? | Daniela / Delgado | Open |
| AI-OQ-3 | Sync vs async / quién posee la cola | Daniela / PRMS backend | Open |
| AI-OQ-4 | Escala confidence + umbral mínimo para mostrar candidate | Daniela / Product | Open |
| AI-OQ-5 | ¿Echo de `program_code` en response solo para trace? | PRMS | Prefer: no required |

---

## 12. Communication log

| Date | Channel | Note |
|---|---|---|
| 2026-07-16 | Slack DM Daniela Gómez | Handoff inicial: expectativas, request/response, persistencia PRMS |
| 2026-07-16 | Slack thread | Aclaración: proyecto→programa ownership en job PRMS; mining solo hint |

---

## 13. Out of scope (este documento)

- Implementación del form manual / Section 5.  
- AI Review traffic-light post-Editing (Phase 4 del spec amplio).  
- Bulk Excel.  
- Prompt engineering detallado / Bedrock internals (salvo límites que afectan el contrato).  
- Cambios a results-review drawer de Science Program.
