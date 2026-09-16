# Previously Reported Result Badge — Tasks

## Tasks

- [x] **Task 1: Project `is_replicated` in server list queries**
  - Add `r.is_replicated,` to `AllResultsByRoleUserAndInitiativeFiltered` in `onecgiar-pr-server/src/api/results/result.repository.ts`.
  - Add `r.is_replicated,` to `getAllInnovationPackages` and `getAllInnovationPackagesFiltered` in `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts`.
  - Verify with `result.repository.spec.ts` and `ipsr.repository.spec.ts`.

- [x] **Task 2: Implement "Previously reported" badge in Results Center table**
  - In `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html`, add `<span class="rc-badge-replicated" ...>Previously reported</span>` when `subResult?.is_replicated`.
  - In `results-list.component.scss`, add `.rc-badge-replicated` styling matching brand tokens.
  - Update/add test in `results-list.component.spec.ts`.

- [x] **Task 3: Implement "Previously reported" badge in Innovation Packages table**
  - In `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/innovation-package-custom-table/innovation-package-custom-table.component.html`, add `<div class="new_tag prev-reported" ...>Previously reported</div>` when `column.attr === 'title' && subResult?.is_replicated`.
  - In `innovation-package-custom-table.component.scss`, add `.new_tag.prev-reported` styling.
  - Update/add test in `innovation-package-custom-table.component.spec.ts`.

- [x] **Task 4: Full verification**
  - Run server jest tests.
  - Run client jest tests.
  - Run lint on touched packages.
