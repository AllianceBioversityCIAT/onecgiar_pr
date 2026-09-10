import {
  fairBorderColor,
  fairInnerColor,
  mapKnowledgeProductBody,
  splitFairDimensions
} from './knowledge-product-metadata.mapper';
import { KnowledgeProductBody } from './knowledgeProductBody';

/**
 * The mapper is shared by the W1/W2 section and the bilateral one (P2-3384), so its branches are
 * covered here rather than through either component. Everything below is a decision the response
 * shape forces on the view: which repository the handle points at, whether a field is "Not
 * provided" or "Not available", and when Web of Science data is read at all.
 */
describe('knowledge-product-metadata.mapper', () => {
  const base = (over: Partial<KnowledgeProductBody> = {}): KnowledgeProductBody =>
    ({
      handle: '10568/1234',
      type: 'Report',
      authors: [{ name: 'Ada Lovelace' }],
      keywords: ['maize', 'yield'],
      agrovoc_keywords: ['soil'],
      warnings: [],
      fair_data: { total_score: 0.5, F: { score: 1 }, A: { score: 0 }, I: { score: 0.5 }, R: { score: 0.25 } },
      ...over
    }) as unknown as KnowledgeProductBody;

  describe('source and handle url', () => {
    it.each([
      ['CGSpace', 'https://cgspace.cgiar.org/handle/10568/1234'],
      ['MELSpace', 'https://repo.mel.cgiar.org/handle/10568/1234'],
      ['WorldFish DSpace', 'https://hdl.handle.net/10568/1234']
    ])('should build the %s url', (source, expected) => {
      const { mapped } = mapKnowledgeProductBody(base({ metadataCG: { source } as any }));

      expect(mapped.source).toBe(source);
      expect(mapped.handle).toBe(expected);
    });

    it('should leave the handle unset for an unknown repository rather than build a url that 404s', () => {
      const { mapped } = mapKnowledgeProductBody(base({ metadataCG: { source: 'Zenodo' } as any }));

      expect(mapped.source).toBe('Zenodo');
      expect(mapped.handle).toBeUndefined();
    });

    it('should fall back to the first metadata entry carrying a source', () => {
      const { mapped } = mapKnowledgeProductBody(base({ metadata: [{}, { source: 'MELSpace' }] as any }));

      expect(mapped.source).toBe('MELSpace');
    });

    it('should fall back to repo when no metadata carries a source', () => {
      const { mapped } = mapKnowledgeProductBody(base({ repo: 'CGSpace' } as any));

      expect(mapped.source).toBe('CGSpace');
    });

    it('should read Unknown when nothing names a source', () => {
      const { mapped } = mapKnowledgeProductBody(base());

      expect(mapped.source).toBe('Unknown');
    });
  });

  describe('Journal Article branches', () => {
    it('should read Web of Science metadata only when there is both a DOI and a WoS record', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({
          type: 'Journal Article',
          metadataCG: { doi: '10.1/x', is_peer_reviewed: true, is_isi: false, issue_year: 2025 } as any,
          metadataWOS: { is_peer_reviewed: true, is_isi: true, accessibility: true, issue_year: 2024 } as any
        })
      );

      expect(mapped.is_peer_reviewed_WOS).toBe('Yes');
      expect(mapped.is_isi_WOS).toBe('Yes');
      expect(mapped.accessibility_WOS).toBe('Open Access');
      expect(mapped.year_WOS).toBe(2024);
      // The repository fields are read in the same pass, never replaced by the WoS ones.
      expect(mapped.is_peer_reviewed_CG).toBe('Yes');
      expect(mapped.yearCG).toBe(2025);
    });

    it('should skip Web of Science when the DOI is missing, and still read the repository', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({
          type: 'Journal Article',
          metadataCG: { is_peer_reviewed: false, issue_year: 2025 } as any,
          metadataWOS: { is_peer_reviewed: true } as any
        })
      );

      expect(mapped.is_peer_reviewed_WOS).toBeUndefined();
      expect(mapped.is_peer_reviewed_CG).toBe('No');
    });

    it('should read a missing ISI status as "Not provided" so the inline guidance shows', () => {
      const { mapped } = mapKnowledgeProductBody(base({ type: 'journal article', metadataCG: {} as any }));

      expect(mapped.isJournalArticle).toBe(true);
      expect(mapped.is_isi_CG).toBe('Not provided');
      expect(mapped.accessibility_CG).toBe('Not provided');
    });
  });

  describe('accessibility precedence', () => {
    it('should let open_access win over the accessibility flag', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({ type: 'Journal Article', metadataCG: { open_access: 'Green Open Access', accessibility: false } as any })
      );

      expect(mapped.accessibility_CG).toBe('Green Open Access');
    });

    it.each([
      [true, 'Open Access'],
      [false, 'Limited Access']
    ])('should map accessibility %s to %s', (flag, expected) => {
      const { mapped } = mapKnowledgeProductBody(
        base({ type: 'Journal Article', metadataCG: { accessibility: flag } as any })
      );

      expect(mapped.accessibility_CG).toBe(expected);
    });

    it('should read a missing accessibility as "Not available" for a type that is not a Journal Article', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({ type: 'Report', cgspace_phase_year: 2026, metadataCG: { issue_year: 2026 } as any })
      );

      expect(mapped.accessibility_CG).toBe('Not available');
      expect(mapped.is_isi_CG).toBe('Not available');
    });
  });

  describe('non-Journal-Article phase gate', () => {
    it('should read the repository record when its issue year matches the reporting phase', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({ type: 'Report', cgspace_phase_year: 2026, metadataCG: { issue_year: 2026, is_peer_reviewed: true } as any })
      );

      expect(mapped.is_peer_reviewed_CG).toBe('Yes');
    });

    it('should leave the repository fields untouched when the record belongs to another year', () => {
      const { mapped } = mapKnowledgeProductBody(
        base({ type: 'Report', cgspace_phase_year: 2026, metadataCG: { issue_year: 2024, is_peer_reviewed: true } as any })
      );

      expect(mapped.is_peer_reviewed_CG).toBeUndefined();
      expect(mapped.accessibility_CG).toBeUndefined();
    });
  });

  describe('list fields', () => {
    it('should join keywords and map author names', () => {
      const { mapped } = mapKnowledgeProductBody(base());

      expect(mapped.keywords).toBe('maize; yield');
      expect(mapped.agrovoc_keywords).toBe('soil');
      expect(mapped.authors).toEqual(['Ada Lovelace']);
    });

    it('should produce empty strings when the keyword arrays are absent', () => {
      const { mapped } = mapKnowledgeProductBody(base({ keywords: undefined, agrovoc_keywords: undefined } as any));

      expect(mapped.keywords).toBe('');
      expect(mapped.agrovoc_keywords).toBe('');
    });
  });

  describe('FAIR dimensions', () => {
    it('should return one entry per dimension and drop the total score', () => {
      const { fairData } = mapKnowledgeProductBody(base());

      expect(fairData.map(d => d.key)).toEqual(['F', 'A', 'I', 'R']);
    });

    it('should tolerate a payload without fair_data instead of throwing', () => {
      expect(() => mapKnowledgeProductBody(base({ fair_data: undefined } as any))).not.toThrow();
      expect(mapKnowledgeProductBody(base({ fair_data: undefined } as any)).fairData).toEqual([]);
      expect(splitFairDimensions(null)).toEqual([]);
    });

    it('should colour the radials from red at 0 to green at 1', () => {
      expect(fairBorderColor(0)).not.toBe(fairBorderColor(1));
      expect(fairInnerColor(0.5)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
