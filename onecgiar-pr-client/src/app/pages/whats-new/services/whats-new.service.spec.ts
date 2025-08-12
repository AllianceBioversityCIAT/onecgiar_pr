import { TestBed } from '@angular/core/testing';
import { WhatsNewService } from './whats-new.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { of, throwError } from 'rxjs';

describe('WhatsNewService', () => {
  let service: WhatsNewService;
  let resultsApiServiceMock: jest.Mocked<ResultsApiService>;

  beforeEach(() => {
    resultsApiServiceMock = {
      getNotionData: jest.fn(),
      getNotionPage: jest.fn(),
      getNotionBlockChildren: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [WhatsNewService, { provide: ResultsApiService, useValue: resultsApiServiceMock }]
    });

    service = TestBed.inject(WhatsNewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getWhatsNewPages', () => {
    it('should set notionData and loading state correctly on success', () => {
      const mockData = { results: [{ id: '1', title: 'Test Page' }] };
      resultsApiServiceMock.getNotionData.mockReturnValue(of(mockData));

      service.getWhatsNewPages();

      expect(service.notionData()).toEqual(mockData);
      expect(service.notionDataLoading()).toBe(false);
    });

    it('should handle error correctly', () => {
      const mockError = new Error('API Error');
      resultsApiServiceMock.getNotionData.mockReturnValue(throwError(() => mockError));

      service.getWhatsNewPages();

      expect(service.notionDataLoading()).toBe(false);
    });

    it('should sort results by ["Released date"]?.date?.start descending', () => {
      const mockData = {
        results: [
          {
            id: '1',
            properties: {
              'Released date': { date: { start: '2023-01-01' } }
            }
          },
          {
            id: '2',
            properties: {
              'Released date': { date: { start: '2024-01-01' } }
            }
          },
          {
            id: '3',
            properties: {
              'Released date': { date: { start: '2022-01-01' } }
            }
          }
        ]
      };
      resultsApiServiceMock.getNotionData.mockReturnValue(of(mockData));

      service.getWhatsNewPages();

      const sorted = service.notionData().results;
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });

    it('should treat missing Released date as 0 in sorting', () => {
      const mockData = {
        results: [
          {
            id: '1',
            properties: {
              'Released date': { date: { start: '2023-01-01' } }
            }
          },
          {
            id: '2',
            properties: {
              'Released date': { date: null }
            }
          },
          {
            id: '3',
            properties: {}
          },
          {
            id: '4',
            properties: {
              'Released date': { date: { start: '2024-01-01' } }
            }
          }
        ]
      };
      resultsApiServiceMock.getNotionData.mockReturnValue(of(mockData));

      service.getWhatsNewPages();

      const sorted = service.notionData().results;
      expect(sorted[0].id).toBe('4');
      expect(sorted[1].id).toBe('1');
      expect([sorted[2].id, sorted[3].id]).toEqual(expect.arrayContaining(['2', '3']));
    });
  });

  describe('getNotionBlockChildren', () => {
    const mockBlockId = 'test-block-id';

    it('should fetch page data first if activeNotionPageData is null', () => {
      const mockPageData = {
        id: 'page-id',
        cover: { type: 'external', external: { url: 'https://example.com' } },
        properties: { title: { title: [{ text: { content: 'Test Page' } }] } }
      };

      resultsApiServiceMock.getNotionPage.mockReturnValue(of(mockPageData));
      resultsApiServiceMock.getNotionBlockChildren.mockReturnValue(of({ results: [] }));

      service.getNotionBlockChildren(mockBlockId);

      expect(resultsApiServiceMock.getNotionPage).toHaveBeenCalledWith(mockBlockId);

      setTimeout(() => {
        expect(service.activeNotionPageData()).toEqual({
          headerInfo: {
            id: mockPageData.id,
            cover: mockPageData.cover,
            properties: mockPageData.properties
          }
        });
        expect(resultsApiServiceMock.getNotionBlockChildren).toHaveBeenCalledWith(mockBlockId);
        expect(service.notionDataLoading()).toBe(false);
      }, 0);
    });

    it('should handle page data error correctly', () => {
      const mockError = { error: true, status: 404, message: 'Page not found' };
      resultsApiServiceMock.getNotionPage.mockReturnValue(of(mockError));

      service.getNotionBlockChildren(mockBlockId);

      setTimeout(() => {
        expect(service.notionDataError()).toEqual(mockError);
        expect(service.notionDataLoading()).toBe(false);
      }, 0);
    });

    it('should directly fetch block children if activeNotionPageData already exists', () => {
      service.activeNotionPageData.set({
        headerInfo: {
          id: 'existing-page-id',
          cover: { type: 'external', external: { url: 'https://example.com' } },
          properties: { title: { title: [{ text: { content: 'Existing Page' } }] } }
        }
      });

      resultsApiServiceMock.getNotionBlockChildren.mockReturnValue(of({ results: [] }));

      service.getNotionBlockChildren(mockBlockId);

      expect(resultsApiServiceMock.getNotionPage).toHaveBeenCalled();
      expect(resultsApiServiceMock.getNotionBlockChildren).not.toHaveBeenCalledWith(mockBlockId);

      setTimeout(() => {
        expect(service.notionDataLoading()).toBe(false);
      }, 0);
    });
  });

  describe('getColor', () => {
    it('should return correct color codes for different color names', () => {
      expect(service.getColor('default')).toBe('#313131');
      expect(service.getColor('gray')).toBe('#414141');
      expect(service.getColor('brown')).toBe('#674133');
      expect(service.getColor('orange')).toBe('#7E4E29');
      expect(service.getColor('yellow')).toBe('#97703D');
      expect(service.getColor('green')).toBe('#2D6044');
      expect(service.getColor('blue')).toBe('#2F5168');
      expect(service.getColor('purple')).toBe('#53376C');
      expect(service.getColor('pink')).toBe('#69334C');
      expect(service.getColor('red')).toBe('#793C3B');
      expect(service.getColor('unknown')).toBe('#313131'); // Default case
    });
  });

  describe('processBlocksRecursively', () => {
    it('should process blocks without children correctly', () => {
      const mockBlocks = [
        { id: 'block1', type: 'paragraph', has_children: false },
        { id: 'block2', type: 'heading_1', has_children: false }
      ];

      const result = (service as any).processBlocksRecursively(mockBlocks, 0);

      result.subscribe(processedBlocks => {
        expect(processedBlocks).toEqual(mockBlocks);
      });
    });

    it('should process blocks with children correctly', () => {
      const mockParentBlock = {
        id: 'parent',
        type: 'paragraph',
        has_children: true
      };

      const mockChildBlocks = [
        { id: 'child1', type: 'paragraph', has_children: false },
        { id: 'child2', type: 'paragraph', has_children: false }
      ];

      resultsApiServiceMock.getNotionBlockChildren.mockReturnValue(of({ results: mockChildBlocks }));

      const result = (service as any).processBlocksRecursively([mockParentBlock], 0);

      result.subscribe(processedBlocks => {
        expect(processedBlocks[0].id).toBe('parent');
        expect(processedBlocks[0].children).toEqual(mockChildBlocks);
      });
    });

    it('should respect max recursion depth', () => {
      const mockBlock = {
        id: 'block',
        type: 'paragraph',
        has_children: true
      };

      const result = (service as any).processBlocksRecursively([mockBlock], 3);

      result.subscribe(processedBlocks => {
        expect(processedBlocks).toEqual([mockBlock]);
      });
    });

    it('should handle empty blocks array', () => {
      const result = (service as any).processBlocksRecursively([], 0);

      result.subscribe(processedBlocks => {
        expect(processedBlocks).toEqual([]);
      });
    });
  });
});
