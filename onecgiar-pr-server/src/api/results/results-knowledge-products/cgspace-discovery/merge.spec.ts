import { interleave, normalizeDoi, normalizeTitle, dedupe } from './merge';
import { CgspaceItemDto } from './dto/cgspace-item.dto';
import { ALL_REPOSITORIES, KpRepository } from './repositories.config';

/**
 * `KPM-T-5` — merge (round-robin) and dedup (DOI -> title|type|year) as pure functions.
 * Scenarios per `requirements.md` KPM-R-4 (ordering), KPM-R-5 (all four clauses), KPM-AC-5,
 * KPM-AC-6; keys per `design.md` §5. Every pair below varies case/prefix/punctuation explicitly
 * (never two items from the same object literal) so normalization is actually exercised.
 */

function makeItem(
  overrides: Partial<CgspaceItemDto> & { repository: KpRepository },
): CgspaceItemDto {
  return {
    uuid: overrides.uuid ?? `uuid-${overrides.repository}-${Math.random()}`,
    handle: overrides.handle ?? '20.500.11766/12345',
    handleUrl:
      overrides.handleUrl ?? 'https://hdl.handle.net/20.500.11766/12345',
    itemUrl:
      overrides.itemUrl ?? `https://example.org/items/${overrides.repository}`,
    title: overrides.title ?? 'Untitled',
    type: overrides.type ?? 'Journal Article',
    year: overrides.year ?? 2025,
    authors: overrides.authors ?? ['Jane Doe'],
    affiliations: overrides.affiliations ?? [],
    countries: overrides.countries ?? [],
    doi: overrides.doi ?? null,
    uri: overrides.uri ?? 'https://example.org/uri',
    repository: overrides.repository,
    alsoIn: overrides.alsoIn,
  };
}

describe('normalizeDoi', () => {
  it('strips the https://doi.org/ prefix and lowercases the value', () => {
    expect(normalizeDoi('https://doi.org/10.1000/ABC')).toBe('10.1000/abc');
  });

  it('strips the http://dx.doi.org/ prefix', () => {
    expect(normalizeDoi('http://dx.doi.org/10.1000/AbC')).toBe('10.1000/abc');
  });

  it('strips the doi: prefix', () => {
    expect(normalizeDoi('doi:10.1000/ABC')).toBe('10.1000/abc');
  });

  it('returns null for a bare DOI unchanged in case only', () => {
    expect(normalizeDoi('10.1000/abc')).toBe('10.1000/abc');
  });

  it('returns null for null/undefined/empty input', () => {
    expect(normalizeDoi(null)).toBeNull();
    expect(normalizeDoi(undefined)).toBeNull();
    expect(normalizeDoi('')).toBeNull();
    expect(normalizeDoi('   ')).toBeNull();
  });
});

describe('normalizeTitle', () => {
  it('collapses case, diacritics, punctuation and whitespace to the same key', () => {
    const a = normalizeTitle('Maize yields: a review');
    const b = normalizeTitle('MAIZE YIELDS  —  A REVIEW');
    expect(a).toBe(b);
    expect(a).toBe('maize yields a review');
  });

  it('strips diacritics via NFKD', () => {
    expect(normalizeTitle('Étude sur le café')).toBe('etude sur le cafe');
  });
});

describe('interleave', () => {
  it('round-robins across sources of different sizes, skipping exhausted ones', () => {
    const a = ['a1', 'a2', 'a3'];
    const b = ['b1', 'b2'];
    const c = ['c1'];
    expect(interleave([a, b, c])).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
  });

  it('preserves each source order and selection order with no query re-scoring', () => {
    expect(interleave([[], ['x1', 'x2']])).toEqual(['x1', 'x2']);
  });
});

describe('dedupe', () => {
  it('KPM-AC-5: DOI variants collapse to one card, CGSpace badge, "Also in MELSpace"', () => {
    const cgspace = makeItem({
      repository: 'cgspace',
      title: 'Maize yields under drought',
      doi: '10.1000/abc',
      handle: '10568/1111',
      handleUrl: 'https://hdl.handle.net/10568/1111',
      itemUrl: 'https://cgspace.cgiar.org/items/cg-1',
    });
    const melspace = makeItem({
      repository: 'melspace',
      title: 'Maize Yields Under Drought (revised)',
      doi: 'https://doi.org/10.1000/ABC',
      handle: '20.500.11766/2222',
      handleUrl: 'https://hdl.handle.net/20.500.11766/2222',
      itemUrl: 'https://repo.mel.cgiar.org/items/mel-1',
    });

    const merged = interleave([[cgspace], [melspace]]);
    const { items, dedupedCount } = dedupe(merged, ALL_REPOSITORIES);

    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(1);
    expect(items[0].repository).toBe('cgspace');
    expect(items[0].itemUrl).toBe('https://cgspace.cgiar.org/items/cg-1');
    expect(items[0].alsoIn).toHaveLength(1);
    expect(items[0].alsoIn?.[0]).toEqual({
      repository: 'melspace',
      handle: '20.500.11766/2222',
      handleUrl: 'https://hdl.handle.net/20.500.11766/2222',
      itemUrl: 'https://repo.mel.cgiar.org/items/mel-1',
    });
  });

  it('KPM-AC-6: equal normalized title and type but different years do NOT collapse', () => {
    const first = makeItem({
      repository: 'cgspace',
      title: 'Soil health indicators: a synthesis',
      type: 'Report',
      year: 2025,
      doi: null,
    });
    const second = makeItem({
      repository: 'melspace',
      title: 'SOIL HEALTH INDICATORS — A SYNTHESIS',
      type: 'report',
      year: 2026,
      doi: null,
    });

    const { items, dedupedCount } = dedupe([first, second], ALL_REPOSITORIES);
    expect(items).toHaveLength(2);
    expect(dedupedCount).toBe(0);
  });

  it('same title, both DOIs present and different, must NOT collapse (DOI mismatch blocks title match)', () => {
    const first = makeItem({
      repository: 'cgspace',
      title: 'Fish value chains in coastal communities',
      type: 'Brief',
      year: 2024,
      doi: '10.1000/first',
    });
    const second = makeItem({
      repository: 'worldfish',
      title: 'fish value chains in coastal communities',
      type: 'Brief',
      year: 2024,
      doi: '10.2000/second',
    });

    const { items, dedupedCount } = dedupe([first, second], ALL_REPOSITORIES);
    expect(items).toHaveLength(2);
    expect(dedupedCount).toBe(0);
  });

  it('a DOI-less item sharing the title with two different-DOI items must NOT bridge them onto one card', () => {
    const cgspace = makeItem({
      repository: 'cgspace',
      title: 'Fish value chains in coastal communities',
      type: 'Brief',
      year: 2024,
      doi: '10.1000/first',
    });
    const melspace = makeItem({
      repository: 'melspace',
      title: 'FISH VALUE CHAINS IN COASTAL COMMUNITIES',
      type: 'brief',
      year: 2024,
      doi: null,
    });
    const worldfish = makeItem({
      repository: 'worldfish',
      title: 'Fish Value Chains In Coastal Communities',
      type: 'Brief',
      year: 2024,
      doi: 'https://doi.org/10.2000/SECOND',
    });

    const { items, dedupedCount } = dedupe(
      [cgspace, melspace, worldfish],
      ALL_REPOSITORIES,
    );

    expect(items.length).toBeGreaterThanOrEqual(2);
    const cgspaceSurvivor = items.find((item) => item.repository === 'cgspace');
    expect(cgspaceSurvivor).toBeDefined();
    expect(
      cgspaceSurvivor?.alsoIn?.some((a) => a.itemUrl === worldfish.itemUrl),
    ).not.toBe(true);
    // No card may carry both DOIs — that would mean A and C collapsed via B.
    for (const item of items) {
      const carriesFirst =
        item.doi === cgspace.doi ||
        (item.alsoIn ?? []).some((a) => a.itemUrl === cgspace.itemUrl);
      const carriesSecond =
        item.doi === worldfish.doi ||
        (item.alsoIn ?? []).some((a) => a.itemUrl === worldfish.itemUrl);
      expect(carriesFirst && carriesSecond).toBe(false);
    }
    expect(dedupedCount).toBe(0);
  });

  it('a DOI-less item joins the single DOI group sharing its title/type/year', () => {
    const cgspace = makeItem({
      repository: 'cgspace',
      title: 'Rice pest management practices',
      type: 'Report',
      year: 2022,
      doi: '10.1000/abc',
    });
    const melspace = makeItem({
      repository: 'melspace',
      title: 'RICE PEST MANAGEMENT PRACTICES',
      type: 'report',
      year: 2022,
      doi: null,
    });

    const { items, dedupedCount } = dedupe(
      [cgspace, melspace],
      ALL_REPOSITORIES,
    );

    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(1);
    expect(items[0].repository).toBe('cgspace');
    expect(items[0].alsoIn).toHaveLength(1);
    expect(items[0].alsoIn?.[0].repository).toBe('melspace');
  });

  it('no DOI, same normalized title/type/year collapses to one card', () => {
    const first = makeItem({
      repository: 'melspace',
      title: 'Gender norms and aquaculture adoption',
      type: 'Working Paper',
      year: 2023,
      doi: null,
    });
    const second = makeItem({
      repository: 'worldfish',
      title: 'GENDER NORMS AND AQUACULTURE ADOPTION.',
      type: 'working paper',
      year: 2023,
      doi: null,
    });

    const { items, dedupedCount } = dedupe([first, second], ALL_REPOSITORIES);
    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(1);
  });

  it('priority: MELSpace first in selection order but CGSpace survives (priority wins over position)', () => {
    const melFirst = makeItem({
      repository: 'melspace',
      title: 'Livestock feed innovations in East Africa',
      doi: 'doi:10.3000/feed',
    });
    const cgspaceSecond = makeItem({
      repository: 'cgspace',
      title: 'LIVESTOCK FEED INNOVATIONS IN EAST AFRICA',
      doi: 'https://doi.org/10.3000/FEED',
    });

    const merged = interleave([[melFirst], [cgspaceSecond]]);
    const { items, dedupedCount } = dedupe(merged, ALL_REPOSITORIES);

    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(1);
    expect(items[0].repository).toBe('cgspace');
    expect(items[0].alsoIn?.[0].repository).toBe('melspace');
  });

  it('does not mutate its inputs and leaves per-source totals untouched', () => {
    const first = makeItem({
      repository: 'cgspace',
      title: 'Untouched item A',
    });
    const second = makeItem({
      repository: 'melspace',
      title: 'Untouched item B',
    });
    const items = [first, second];
    const snapshot = JSON.parse(JSON.stringify(items));

    dedupe(items, ALL_REPOSITORIES);

    expect(items).toEqual(snapshot);
  });

  it('three-way collapse: the same DOI in all three repositories yields one survivor with two alsoIn entries', () => {
    const cgspace = makeItem({
      repository: 'cgspace',
      title: 'Climate-smart aquaculture practices',
      doi: '10.4000/climate',
      itemUrl: 'https://cgspace.cgiar.org/items/cg-2',
    });
    const melspace = makeItem({
      repository: 'melspace',
      title: 'Climate Smart Aquaculture Practices',
      doi: 'doi:10.4000/CLIMATE',
      itemUrl: 'https://repo.mel.cgiar.org/items/mel-2',
    });
    const worldfish = makeItem({
      repository: 'worldfish',
      title: 'CLIMATE-SMART AQUACULTURE PRACTICES',
      doi: 'http://dx.doi.org/10.4000/Climate',
      itemUrl: 'https://digitalarchive.worldfishcenter.org/items/wf-2',
    });

    const merged = interleave([[cgspace], [melspace], [worldfish]]);
    const { items, dedupedCount } = dedupe(merged, ALL_REPOSITORIES);

    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(2);
    expect(items[0].repository).toBe('cgspace');
    expect(items[0].alsoIn).toHaveLength(2);
    expect(items[0].alsoIn?.map((a) => a.repository).sort()).toEqual([
      'melspace',
      'worldfish',
    ]);
  });

  it('a DOI match wins even when title and year differ (DOI wins over a title mismatch)', () => {
    const cgspace = makeItem({
      repository: 'cgspace',
      title: 'Original working title',
      year: 2020,
      doi: '10.5000/wins',
    });
    const melspace = makeItem({
      repository: 'melspace',
      title: 'Completely different published title',
      year: 2024,
      doi: 'https://doi.org/10.5000/WINS',
    });

    const { items, dedupedCount } = dedupe(
      [cgspace, melspace],
      ALL_REPOSITORIES,
    );
    expect(items).toHaveLength(1);
    expect(dedupedCount).toBe(1);
    expect(items[0].repository).toBe('cgspace');
  });

  it('treats a missing repository as lowest priority and never throws', () => {
    const noRepo = makeItem({
      repository: undefined as unknown as KpRepository,
      doi: '10.6000/x',
    });
    delete (noRepo as Partial<CgspaceItemDto>).repository;
    const cgspace = makeItem({ repository: 'cgspace', doi: 'doi:10.6000/X' });

    expect(() => dedupe([noRepo, cgspace], ALL_REPOSITORIES)).not.toThrow();
    const { items } = dedupe([noRepo, cgspace], ALL_REPOSITORIES);
    expect(items).toHaveLength(1);
    expect(items[0].repository).toBe('cgspace');
  });
});
