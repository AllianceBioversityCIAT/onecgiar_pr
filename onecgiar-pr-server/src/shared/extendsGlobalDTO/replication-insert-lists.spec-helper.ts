// @akili-spec bugfix/p2-3228-lead-center-replication
/**
 * Shared parser for phase-replication `insertQuery` strings built by `createQueries`
 * (`GetQueryConfigurationsInterface` / `ReplicableRepository`, see `replicable-repository.ts`).
 *
 * Extracted from the P2-3663 regression test (`result.repository.spec.ts`) and parameterised by
 * table name and source alias so the same alignment check serves `results_center` (alias `rc`),
 * `results_by_institution` (alias `rbi`) and `` `result` `` (alias `r2`) alike
 * (design.md DD-3, `docs/specs/bugfix/p2-3228-lead-center-replication/design.md`).
 *
 * `insertLists` returns the INSERT's column list and its SELECT's value list, each collapsed to
 * one entry per written column, in the same order as they appear in the SQL — so callers can
 * assert column-to-value alignment (defect class D2, requirements.md §8): an INSERT whose column
 * list and SELECT list drift apart still compiles and still runs, it just writes every value into
 * the wrong column. Asserting only that a column name appears somewhere (`toContain`) would pass
 * on exactly that bug — the position check is the point.
 *
 * This file intentionally does NOT end in `.spec.ts`, so Jest does not collect it as a test suite.
 */
export function insertLists(
  insertQuery: string,
  table: string,
  alias: string,
): { columns: string[]; values: string[] } {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tablePattern = `\`?${escapedTable}\`?`;
  const re = new RegExp(
    `insert into ${tablePattern} \\(\\s*([\\s\\S]*?)\\s*\\)\\s*select\\s*([\\s\\S]*?)\\s*from ${tablePattern} ${alias}`,
    'i',
  );
  const match = re.exec(insertQuery);
  if (!match) {
    throw new Error(
      `replication INSERT for \`${table}\` no longer matches the expected shape`,
    );
  }

  const columns = match[1]
    .split(/[\n,]/)
    .map((entry) => entry.trim().replace(/^,/, '').trim())
    .filter(Boolean);

  // `${...}` expressions span several lines; join them until their delimiters balance out.
  const values: string[] = [];
  let buffer = '';
  for (const line of match[2]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    buffer = buffer ? `${buffer} ${line}` : line;
    const balanced =
      (buffer.match(/\(/g) ?? []).length ===
        (buffer.match(/\)/g) ?? []).length &&
      (buffer.match(/\{/g) ?? []).length === (buffer.match(/\}/g) ?? []).length;
    if (balanced) {
      values.push(buffer.replace(/,$/, '').trim());
      buffer = '';
    }
  }
  if (buffer) values.push(buffer.trim());

  return { columns, values };
}

/**
 * Alignment check reused across the three replication tables (VER-R-1/2/3): every INSERT column
 * must equal the alias of the value written into the same position. A column with no matching
 * value (or an extra value) is caught upstream by comparing `columns.length` to `values.length`.
 */
export function misalignedColumns(
  columns: string[],
  values: string[],
  alias: string,
): string[] {
  return columns.filter((column, i) => {
    const value = values[i] ?? '';
    const asIndex = value.toLowerCase().lastIndexOf(' as ');
    const extractedAlias =
      asIndex > -1
        ? value.slice(asIndex + 4).trim()
        : value.replace(`${alias}.`, '').trim();
    return extractedAlias !== column;
  });
}
