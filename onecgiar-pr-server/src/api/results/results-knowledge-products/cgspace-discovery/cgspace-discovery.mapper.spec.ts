import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { CgspaceDiscoveryMapper } from './cgspace-discovery.mapper';

describe('CgspaceDiscoveryMapper', () => {
  let mapper: CgspaceDiscoveryMapper;
  let halFixture: any;

  beforeAll(() => {
    const fixturePath = path.resolve(
      __dirname,
      'fixtures/cgspace-search.hal.json',
    );
    halFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  });

  beforeEach(() => {
    mapper = new CgspaceDiscoveryMapper();
  });

  describe('toPage', () => {
    it('should map the recorded CGSpace HAL search fixture correctly', () => {
      const result = mapper.toPage(halFixture);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(3);
      expect(result.page).toEqual({
        number: 0,
        size: 3,
        totalElements: 3,
        totalPages: 1,
      });

      // Item 0: has DOI and Country
      const item0 = result.items[0];
      expect(item0.uuid).toBe('679513e4-eeba-4a06-a017-015862e7b9b3');
      expect(item0.handle).toBe('10568/74449');
      expect(item0.handleUrl).toBe('https://hdl.handle.net/10568/74449');
      expect(item0.itemUrl).toBe(
        'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3',
      );
      expect(item0.title).toBe(
        'Effect of Lablab purpureus L. cover crop and imidazolinone resistant (IR) maize on weeds in drought prone areas, Kenya',
      );
      expect(item0.type).toBe('Journal Article');
      expect(item0.year).toBe(2015);
      expect(item0.authors).toEqual([
        'Mwangi, H.W.',
        'Kihurani, A.W.',
        'Wesonga, J.M.',
        'Ariga, E.S.',
        'Kanampiu, F.K.',
      ]);
      expect(item0.affiliations).toEqual([
        'Kenya Agricultural Research Institute',
        'University of Agriculture Science and Technology, Kenya',
        'University of Nairobi',
        'International Institute of Tropical Agriculture',
      ]);
      expect(item0.doi).toBe('https://doi.org/10.1016/j.cropro.2015.02.013');
      expect(item0.countries).toEqual(['Kenya']);
      expect(item0.uri).toBe('https://hdl.handle.net/10568/74449');

      // Item 1: legacy 10947/4262 handle, maps to doi: null and countries: []
      const item1 = result.items[1];
      expect(item1.uuid).toBe('8914c5a5-2102-4eae-954d-3cfcce27246c');
      expect(item1.handle).toBe('10947/4262');
      expect(item1.handleUrl).toBe('https://hdl.handle.net/10947/4262');
      expect(item1.itemUrl).toBe(
        'https://cgspace.cgiar.org/items/8914c5a5-2102-4eae-954d-3cfcce27246c',
      );
      expect(item1.title).toBe('MAIZE cover letter to full proposal 2017-2022');
      expect(item1.type).toBe('Proposal');
      expect(item1.year).toBe(2016);
      expect(item1.authors).toEqual(['CGIAR Research Program on Maize']);
      expect(item1.affiliations).toEqual(['CGIAR Research Program on Maize']);
      expect(item1.doi).toBeNull();
      expect(item1.countries).toEqual([]);
      expect(item1.uri).toBe('https://hdl.handle.net/10947/4262');

      // Item 2: has country Malawi, no DOI
      const item2 = result.items[2];
      expect(item2.uuid).toBe('5dcef492-2ed6-4453-9745-f2d66d87b501');
      expect(item2.handle).toBe('10568/159697');
      expect(item2.handleUrl).toBe('https://hdl.handle.net/10568/159697');
      expect(item2.itemUrl).toBe(
        'https://cgspace.cgiar.org/items/5dcef492-2ed6-4453-9745-f2d66d87b501',
      );
      expect(item2.type).toBe('Presentation');
      expect(item2.year).toBe(2024);
      expect(item2.countries).toEqual(['Malawi']);
      expect(item2.doi).toBeNull();
    });

    it('should return an empty page for null or empty HAL responses', () => {
      const emptyResult = mapper.toPage(null);
      expect(emptyResult).toEqual({
        items: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      });

      const malformedResult = mapper.toPage({});
      expect(malformedResult).toEqual({
        items: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      });

      const emptySearchResult = mapper.toPage({
        _embedded: {
          searchResult: {
            _embedded: { objects: [] },
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
          },
        },
      });
      expect(emptySearchResult).toEqual({
        items: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      });
    });

    it('should handle missing page metadata in HAL response', () => {
      const responseWithoutPage = {
        _embedded: {
          searchResult: {
            _embedded: {
              objects: [
                {
                  _embedded: {
                    indexableObject: {
                      uuid: 'abc-123',
                      handle: '10568/1',
                      metadata: {},
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const result = mapper.toPage(responseWithoutPage);
      expect(result.items).toHaveLength(1);
      expect(result.page).toEqual({
        number: 0,
        size: 1,
        totalElements: 1,
        totalPages: 1,
      });
    });
  });

  describe('toItem', () => {
    it('should safely handle empty indexableObject and missing metadata', () => {
      const item = mapper.toItem({});
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
      });
    });

    it('should correctly format handleUrl and itemUrl when uuid and handle are provided', () => {
      const item = mapper.toItem({
        _embedded: {
          indexableObject: {
            uuid: 'test-uuid-456',
            handle: '10568/99999',
            metadata: {
              'dc.title': [{ value: 'Test Title' }],
            },
          },
        },
      });

      expect(item.handleUrl).toBe('https://hdl.handle.net/10568/99999');
      expect(item.itemUrl).toBe(
        'https://cgspace.cgiar.org/items/test-uuid-456',
      );
      expect(item.title).toBe('Test Title');
    });
  });

  describe('parseYear', () => {
    it('should parse 4-digit years from various date strings', () => {
      expect(mapper.parseYear('2015-06')).toBe(2015);
      expect(mapper.parseYear('2023')).toBe(2023);
      expect(mapper.parseYear('2024-11-13T21:39:50Z')).toBe(2024);
      expect(mapper.parseYear(' 2026-01-01 ')).toBe(2026);
    });

    it('should return null for missing, empty, or unparseable date values', () => {
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
