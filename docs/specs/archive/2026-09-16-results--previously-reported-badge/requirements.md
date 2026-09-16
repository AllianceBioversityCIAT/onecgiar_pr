# Previously Reported Result Badge — Requirements

## 1. Module / Feature

- **Module:** `results` / `ipsr`
- **Sub-feature:** `previously-reported-badge`
- **Owner:** Results Center & IPSR reporting teams
- **Status:** `approved`
- **Depth:** `Lite`

---

## 2. Context

In the OneCGIAR reporting cycle, submitters and coordinators often carry over or update results and innovation packages from previous reporting phases into the active phase via the "Update result" workflow (`is_replicated = 1`). Currently, within the platform tables (Results Center and Innovation Packages list), there is no visible indicator distinguishing a freshly originated result from one carried over from an earlier phase.

Adding a clear, accessible badge ("Previously reported") next to the result title in both tables enables immediate recognition of replicated results across all result types.

Cites: PRD §G1, §US-1, TRD §3.1 (Results Center), §3.2 (IPSR).

---

## 3. In Scope / Out of Scope

### In Scope
- **RES-IPSR-R-1**: Return `is_replicated` from backend endpoints:
  - `ResultRepository.AllResultsByRoleUserAndInitiativeFiltered` (Results Center)
  - `IpsrRepository.getAllInnovationPackages` & `getAllInnovationPackagesFiltered` (IPSR)
- **RES-IPSR-R-2**: Render a "Previously reported" badge adjacent to the result title in Results Center table (`results-list.component.html`) for any result where `is_replicated` is truthy.
- **RES-IPSR-R-3**: Render a "Previously reported" badge adjacent to the result title in Innovation Packages table (`innovation-package-custom-table.component.html`) for any package where `is_replicated` is truthy.
- **RES-IPSR-R-4**: Use approved design tokens (`--pr-color-primary-100` background, `--pr-color-primary-700` ink) and standard tooltip for the badge.

### Out of Scope
- Changing the replication logic or `is_replicated` database schema (already existing in MySQL).
- Changing detail page headers (`app-result-header` already has full metadata via ⓘ popover and Annual Updating block).
- New filter dropdowns or table query filters for `is_replicated` (future enhancement if requested).

---

## 4. Requirements & Scenarios

### REQ-1: Query Projection of `is_replicated`
- **Given** a caller queries `AllResultsByRoleUserAndInitiativeFiltered` or `getAllInnovationPackages`
- **When** the result row was replicated from an earlier phase (`is_replicated = 1`)
- **Then** the row payload includes `is_replicated: 1` (or `true`).
- **When** the result was created directly in the current phase (`is_replicated = 0` or `null`)
- **Then** `is_replicated` is `0` (or `false`/`null`).

### REQ-2: Results Center List Badge
- **Given** the Results Center table renders a row with `subResult.is_replicated == 1`
- **When** the title column (`column.attr === 'title'`) is displayed
- **Then** a pill badge reading "Previously reported" is visible before the title text with tooltip "Previously reported in an earlier phase".
- **And** rows with `is_replicated == 0` do not show the badge.

### REQ-3: Innovation Packages List Badge
- **Given** the Innovation Packages table renders a row with `subResult.is_replicated == 1`
- **When** the title column (`column.attr === 'title'`) is displayed
- **Then** a badge reading "Previously reported" is visible before the title text.
- **And** packages with `is_replicated == 0` do not show the badge.
