import { ResultByInitiativesRepository } from './resultByInitiatives.repository';

/**
 * P2-3652, defect class D4 ("mock drift", requirements.md §9): `getOwnerInitiativeByResult` is the
 * row-shape contract `versioning.service.ts` depends on to route a W3/Bilateral carry-forward into
 * `versionProcessV2`. Before this fix, `versioning.service.spec.ts:109` mocked a row shaped
 * `{ inititiative_id: 100 }` — a shape this query cannot produce — and 413 green tests certified a
 * branch production never entered. This is the substitute gate for that class: it pins the columns
 * the SELECT actually projects, read from the query string the repository issues, not from a
 * hand-built row.
 *
 * Disqualifier (design.md §10): this is a presence assertion over SQL text. It proves the columns
 * are *named* in the statement; it does not prove MySQL returns them, and it cannot catch a renamed
 * database column — that class is the accepted risk recorded in requirements.md §9, covered
 * operationally by the prtest deploy. This test does not prove the query works.
 *
 * Trap: `inititiative_id` (the load-bearing typo) genuinely appears in this SQL, inside the JOIN
 * predicate (`... on ci.id = rbi.inititiative_id ...`). The claim under test is narrower than "the
 * string `inititiative_id` is absent from the query" — it is "the SELECT list does not project
 * `inititiative_id` into the result row." That claim is asserted against the substring between
 * `select` and the first standalone `from` keyword only, never against the whole statement.
 */
describe('ResultByInitiativesRepository.getOwnerInitiativeByResult — SELECT must match what callers read', () => {
  function makeRepository() {
    const repository: any = Object.create(
      ResultByInitiativesRepository.prototype,
    );
    repository.query = jest.fn().mockResolvedValue([]);
    repository._handlersError = { returnErrorRepository: jest.fn() };
    return repository;
  }

  // Isolates the SELECT list from the rest of the statement (JOIN predicate included) so the
  // "no inititiative_id" claim below can be scoped correctly. `\bfrom\b` does not match inside
  // `from_toc` (a real selected column): the boundary after "from" fails because "_" is a word
  // character, so only the standalone FROM keyword matches.
  function selectListOf(sql: string): string {
    const match = sql.match(/select([\s\S]*?)\bfrom\b/i);
    if (!match) {
      throw new Error('Could not locate a SELECT ... FROM clause in the query');
    }
    return match[1];
  }

  // Column name -> the text its projection is expected to appear as in the SELECT list.
  // `initiative_name` is projected as an alias (`ci.name as initiative_name`), not as a
  // `ci.`-prefixed column, so its expected text differs from the rest.
  const SELECTED_COLUMNS: Array<[string, string]> = [
    ['id', 'ci.id'],
    ['official_code', 'ci.official_code'],
    ['initiative_name', 'as initiative_name'],
    ['short_name', 'ci.short_name'],
    ['initiative_role_id', 'rbi.initiative_role_id'],
    ['from_toc', 'rbi.from_toc'],
    ['is_active', 'rbi.is_active'],
  ];

  it.each(SELECTED_COLUMNS)(
    'projects %s into the result row',
    async (_column, expectedText) => {
      const repository = makeRepository();

      await repository.getOwnerInitiativeByResult(8375);

      const [sql] = repository.query.mock.calls[0];
      expect(selectListOf(sql)).toContain(expectedText);
    },
  );

  it('does NOT project inititiative_id into the result row (it only appears in the JOIN predicate)', async () => {
    const repository = makeRepository();

    await repository.getOwnerInitiativeByResult(8375);

    const [sql] = repository.query.mock.calls[0];
    // Sanity check on the trap itself: the identifier is genuinely present in the SQL...
    expect(sql).toContain('inititiative_id');
    // ...but the SELECT list — the part that determines the shape of the returned row — does not
    // project it. This is the assertion the routing bug in `versioning.service.ts` depended on.
    expect(selectListOf(sql)).not.toContain('inititiative_id');
  });

  it('reads the row for the requested result, primary (role 1) active initiative only', async () => {
    const repository = makeRepository();

    await repository.getOwnerInitiativeByResult(8375);

    const [sql, params] = repository.query.mock.calls[0];
    expect(sql).toContain('rbi.result_id = ?');
    expect(sql).toContain('rbi.initiative_role_id = 1');
    expect(sql).toContain('rbi.is_active > 0');
    expect(params).toEqual([8375]);
  });
});
