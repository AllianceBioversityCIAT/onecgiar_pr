import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';
import { KP_REPOSITORIES, RepositoryAdapter } from './repositories.config';

/**
 * Pre-change snapshot of `CgspaceDiscoveryMapper.toPage(cgspaceHalFixture)` captured from the
 * single-argument mapper (task `KPM-T-2` baseline, before the adapter parameter landed in
 * `KPM-T-3`). Captured verbatim via a throwaway jest run against the untouched mapper.ts —
 * not hand-typed. Used as the regression oracle: the parameterized mapper called with the
 * `cgspace` adapter MUST reproduce every field here, plus the new `repository` field.
 */
const CGSPACE_PRE_CHANGE_ITEMS = [
  {
    uuid: '679513e4-eeba-4a06-a017-015862e7b9b3',
    handle: '10568/74449',
    handleUrl: 'https://hdl.handle.net/10568/74449',
    itemUrl:
      'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3',
    title:
      'Effect of Lablab purpureus L. cover crop and imidazolinone resistant (IR) maize on weeds in drought prone areas, Kenya',
    type: 'Journal Article',
    year: 2015,
    authors: [
      'Mwangi, H.W.',
      'Kihurani, A.W.',
      'Wesonga, J.M.',
      'Ariga, E.S.',
      'Kanampiu, F.K.',
    ],
    affiliations: [
      'Kenya Agricultural Research Institute',
      'University of Agriculture Science and Technology, Kenya',
      'University of Nairobi',
      'International Institute of Tropical Agriculture',
    ],
    countries: ['Kenya'],
    doi: 'https://doi.org/10.1016/j.cropro.2015.02.013',
    uri: 'https://hdl.handle.net/10568/74449',
  },
  {
    uuid: '8914c5a5-2102-4eae-954d-3cfcce27246c',
    handle: '10947/4262',
    handleUrl: 'https://hdl.handle.net/10947/4262',
    itemUrl:
      'https://cgspace.cgiar.org/items/8914c5a5-2102-4eae-954d-3cfcce27246c',
    title: 'MAIZE cover letter to full proposal 2017-2022',
    type: 'Proposal',
    year: 2016,
    authors: ['CGIAR Research Program on Maize'],
    affiliations: ['CGIAR Research Program on Maize'],
    countries: [],
    doi: null,
    uri: 'https://hdl.handle.net/10947/4262',
  },
  {
    uuid: '5dcef492-2ed6-4453-9745-f2d66d87b501',
    handle: '10568/159697',
    handleUrl: 'https://hdl.handle.net/10568/159697',
    itemUrl:
      'https://cgspace.cgiar.org/items/5dcef492-2ed6-4453-9745-f2d66d87b501',
    title:
      'Expanding the benefits niche: a systems approach to crop-livestock integration for smallholder farmers',
    type: 'Presentation',
    year: 2024,
    authors: ['Omondi, John Okoth', 'Kyei-Boahen, Stephen'],
    affiliations: ['International Institute of Tropical Agriculture'],
    countries: ['Malawi'],
    doi: null,
    uri: 'https://hdl.handle.net/10568/159697',
  },
];

const CGSPACE_PRE_CHANGE_PAGE = {
  number: 0,
  size: 3,
  totalElements: 3,
  totalPages: 1,
};

describe('CgspaceDiscoveryMapper', () => {
  let mapper: CgspaceDiscoveryMapper;
  let cgspaceHal: any;
  let melspaceHal: any;
  let worldfishHal: any;

  const cgspaceAdapter = KP_REPOSITORIES.cgspace;
  const melspaceAdapter = KP_REPOSITORIES.melspace;
  const worldfishAdapter = KP_REPOSITORIES.worldfish;

  beforeAll(() => {
    const fixturesDir = path.resolve(__dirname, 'fixtures');
    cgspaceHal = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, 'cgspace-search.hal.json'),
        'utf8',
      ),
    );
    melspaceHal = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, 'melspace-search.hal.json'),
        'utf8',
      ),
    );
    worldfishHal = JSON.parse(
      fs.readFileSync(
        path.join(fixturesDir, 'worldfish-search.hal.json'),
        'utf8',
      ),
    );
  });

  beforeEach(() => {
    mapper = new CgspaceDiscoveryMapper();
  });

  describe('toPage — CGSpace regression (byte-identical to pre-change snapshot)', () => {
    it('reproduces the pre-change field values, plus the new repository field, for every item', () => {
      const result = mapper.toPage(cgspaceHal, cgspaceAdapter);

      expect(result.page).toEqual(CGSPACE_PRE_CHANGE_PAGE);
      expect(result.items).toHaveLength(CGSPACE_PRE_CHANGE_ITEMS.length);
      expect(result.items).toEqual(
        CGSPACE_PRE_CHANGE_ITEMS.map((item) => ({
          ...item,
          repository: 'cgspace',
        })),
      );
    });
  });

  describe('toPage — MELSpace fixture (KPM-AC-13)', () => {
    it('maps MEL field names: dc.type, dcterms.available, dc.creator + dc.contributor, cg.identifier.doi, repo.mel.cgiar.org item host', () => {
      const result = mapper.toPage(melspaceHal, melspaceAdapter);

      expect(result.items).toHaveLength(5);

      const item0 = result.items[0];
      expect(item0.uuid).toBe('ff1dcfdf-1045-42e6-b552-347dd45f7f1f');
      expect(item0.handle).toBe('20.500.11766/8067');
      expect(item0.handleUrl).toBe('https://hdl.handle.net/20.500.11766/8067');
      expect(item0.itemUrl).toBe(
        'https://repo.mel.cgiar.org/items/ff1dcfdf-1045-42e6-b552-347dd45f7f1f',
      );
      expect(
        item0.itemUrl.startsWith('https://repo.mel.cgiar.org/items/'),
      ).toBe(true);
      expect(item0.title).toBe(
        'Role of Sustainable Wheat Production to Ensure Food Security in the CWANA region',
      );
      // type from dc.type (not dcterms.type — CGSpace's key)
      expect(item0.type).toBe('Journal Article');
      // year from dcterms.available ('2017-08-31' -> first 4 digits)
      expect(item0.year).toBe(2017);
      // authors = dc.creator concat dc.contributor, ordered, de-duplicated
      expect(item0.authors).toEqual([
        'Tadesse, Wuletaw',
        'Halila, Habib',
        'Jamal, Majd',
        'El-Hanafi, Samira',
        'Gizaw Assefa, Solomon',
        'Oweis, Theib',
        'Baum, Michael',
      ]);
      expect(item0.authors).toContain('Halila, Habib'); // a dc.contributor value
      // affiliation from cg.contributor.center (MEL's key, not cg.contributor.affiliation)
      expect(item0.affiliations).toEqual([
        'International Center for Agricultural Research in the Dry Areas - ICARDA',
      ]);
      // doi from cg.identifier.doi
      expect(item0.doi).toBe(
        'https://doi.org/10.18006/2017.5(spl-1-safsaw).s15.s32',
      );
      expect(item0.uri).toBe('https://hdl.handle.net/20.500.11766/8067');
      // handleUrl always hdl.handle.net regardless of repository
      expect(item0.handleUrl.startsWith('https://hdl.handle.net/')).toBe(true);
      expect(item0.repository).toBe('melspace');
      // no cg.coverage.country on item0 -> []
      expect(item0.countries).toEqual([]);
    });

    it('reads a country from cg.coverage.country on a later MEL item', () => {
      const result = mapper.toPage(melspaceHal, melspaceAdapter);
      const item2 = result.items[2];
      expect(item2.countries).toEqual(['NP']);
    });
  });

  describe('toPage — WorldFish fixture (KPM-AC-13)', () => {
    it('maps WorldFish field names: dc.date.issued, dc.identifier.doi, digitalarchive.worldfishcenter.org item host', () => {
      const result = mapper.toPage(worldfishHal, worldfishAdapter);

      expect(result.items).toHaveLength(5);

      // item[1] carries a DOI in this fixture
      const item1 = result.items[1];
      expect(item1.uuid).toBe('85172763-6efc-48a8-8d6b-212b859be972');
      expect(item1.handle).toBe('20.500.12348/5495');
      expect(item1.handleUrl).toBe('https://hdl.handle.net/20.500.12348/5495');
      expect(item1.itemUrl).toBe(
        'https://digitalarchive.worldfishcenter.org/items/85172763-6efc-48a8-8d6b-212b859be972',
      );
      expect(
        item1.itemUrl.startsWith(
          'https://digitalarchive.worldfishcenter.org/items/',
        ),
      ).toBe(true);
      expect(item1.title).toBe('Small fish consumption in rural Myanmar');
      expect(item1.type).toBe('Journal Article');
      // year from dc.date.issued ('2023')
      expect(item1.year).toBe(2023);
      // authors from dc.creator only (WorldFish adapter declares no dc.contributor field)
      expect(item1.authors).toEqual([
        'Rizaldo, Q.',
        'Khaing, W.W.',
        'Belton, B.',
      ]);
      // affiliation from cg.contributor.affiliation (WorldFish's key)
      expect(item1.affiliations).toEqual([
        'Michigan State University',
        'WorldFish',
        'University of Manitoba',
      ]);
      // doi from dc.identifier.doi (WorldFish's key, not cg.identifier.doi)
      expect(item1.doi).toBe('https://dx.doi.org/10.1007/s40152-023-00304-6');
      expect(item1.uri).toBe('https://hdl.handle.net/20.500.12348/5495');
      expect(item1.countries).toEqual(['Myanmar']);
      expect(item1.repository).toBe('worldfish');
    });

    it('maps a WorldFish item without a DOI to null', () => {
      const result = mapper.toPage(worldfishHal, worldfishAdapter);
      const item0 = result.items[0];
      expect(item0.doi).toBeNull();
    });
  });

  describe('toItem — authors de-duplication across adapter.fields.authors[]', () => {
    it('concatenates ordered author fields and drops an exact duplicate value', () => {
      const node = {
        _embedded: {
          indexableObject: {
            uuid: 'dedup-uuid',
            handle: '20.500.11766/1',
            metadata: {
              'dc.creator': [
                { value: 'Same, Author' },
                { value: 'First, Only' },
              ],
              'dc.contributor': [
                { value: 'Same, Author' },
                { value: 'Second, Only' },
              ],
            },
          },
        },
      };

      const item = mapper.toItem(node, melspaceAdapter);

      expect(item.authors).toEqual([
        'Same, Author',
        'First, Only',
        'Second, Only',
      ]);
    });
  });

  describe('toItem — affiliation absent on the adapter', () => {
    it('emits [] when the adapter declares no affiliation field', () => {
      const adapterWithoutAffiliation: RepositoryAdapter = {
        ...melspaceAdapter,
        fields: {
          ...melspaceAdapter.fields,
          affiliation: undefined,
        },
      };

      const node = {
        _embedded: {
          indexableObject: {
            uuid: 'no-affiliation-uuid',
            handle: '20.500.11766/2',
            metadata: {
              'cg.contributor.center': [{ value: 'Should be ignored' }],
            },
          },
        },
      };

      const item = mapper.toItem(node, adapterWithoutAffiliation);
      expect(item.affiliations).toEqual([]);
    });
  });

  describe('toItem — safe handling with an adapter', () => {
    it('safely handles empty indexableObject and missing metadata', () => {
      const item = mapper.toItem({}, cgspaceAdapter);
      expect(item).toEqual({
        uuid: '',
        handle: '',
        handleUrl: '',
        itemUrl: '',
        title: '',
        type: '',
        year: null,
        authors: [],
        affiliations: [],
        countries: [],
        doi: null,
        uri: '',
        repository: 'cgspace',
      });
    });

    it('builds itemUrl from the adapter itemHost and handleUrl always from hdl.handle.net', () => {
      const item = mapper.toItem(
        {
          _embedded: {
            indexableObject: {
              uuid: 'test-uuid-456',
              handle: '10568/99999',
              metadata: {
                'dc.title': [{ value: 'Test Title' }],
              },
            },
          },
        },
        worldfishAdapter,
      );

      expect(item.handleUrl).toBe('https://hdl.handle.net/10568/99999');
      expect(item.itemUrl).toBe(
        'https://digitalarchive.worldfishcenter.org/items/test-uuid-456',
      );
      expect(item.repository).toBe('worldfish');
    });
  });

  describe('toPage — empty/malformed HAL responses', () => {
    it('returns an empty page for null or empty HAL responses', () => {
      const emptyResult = mapper.toPage(null, cgspaceAdapter);
      expect(emptyResult).toEqual({
        items: [],
        page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
      });

      const malformedResult = mapper.toPage({}, cgspaceAdapter);
      expect(malformedResult).toEqual({
        items: [],
        page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
      });
    });
  });

  describe('parseYear', () => {
    it('parses 4-digit years from various date strings', () => {
      expect(mapper.parseYear('2015-06')).toBe(2015);
      expect(mapper.parseYear('2023')).toBe(2023);
      expect(mapper.parseYear('2024-11-13T21:39:50Z')).toBe(2024);
      expect(mapper.parseYear(' 2026-01-01 ')).toBe(2026);
    });

    it('returns null for missing, empty, or unparseable date values', () => {
      expect(mapper.parseYear(null)).toBeNull();
      expect(mapper.parseYear(undefined)).toBeNull();
      expect(mapper.parseYear('')).toBeNull();
      expect(mapper.parseYear('   ')).toBeNull();
      expect(mapper.parseYear('invalid-date')).toBeNull();
      expect(mapper.parseYear('20')).toBeNull();
      expect(mapper.parseYear(1234 as any)).toBeNull();
    });
  });
});
