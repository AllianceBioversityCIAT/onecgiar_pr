# Tasks — Bilateral Knowledge Product: pool-funding parity

Status: done (pending Jenkins build after push)

- [x] **KPP-T-1** `isKnowledgeProduct` computed on `BilateralCreationService` (KPP-DD-1). DoD: spec for 6, "6", other types, null.
- [x] **KPP-T-2** GI Title/Description read-only and not required for a KP; MDS items optional (KPP-R-1..4, 8). DoD: component + real-tracker specs.
- [x] **KPP-T-3** `submitKnowledgeProduct` in the UI service (KPP-DD-4). DoD: one POST + one PATCH on two quick calls, no dialog state.
- [x] **KPP-T-4** Confirmation dialog + service + copy (KPP-R-6, KPP-DD-5). DoD: dialog spec.
- [x] **KPP-T-5** Creator: KP branch in `submitResult`, hide AI card and note, skip `loadLatest` (KPP-R-5, 7, 9). DoD: creator specs for KP and non-KP.
- [x] **KPP-T-6** Gate: Jest (touched specs), `ng lint`, `npm run build:dev` on the VPS.
