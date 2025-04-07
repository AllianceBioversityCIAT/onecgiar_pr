import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewPageDetailsComponent } from './whats-new-page-details.component';
import { ActivatedRoute } from '@angular/router';
import { WhatsNewService } from '../../services/whats-new.service';
import { CommonModule } from '@angular/common';
import { DynamicNotionBlockComponent } from '../../../../shared/components/dynamic-notion-block/dynamic-notion-block.component';
import { TooltipModule } from 'primeng/tooltip';
import { of, Subject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';

jest.useFakeTimers();

describe('WhatsNewPageDetailsComponent', () => {
  let component: WhatsNewPageDetailsComponent;
  let fixture: ComponentFixture<WhatsNewPageDetailsComponent>;
  let whatsNewService: WhatsNewService;
  let mockWhatsNewService: jest.Mocked<WhatsNewService>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let paramsSubject: Subject<any>;

  beforeEach(async () => {
    paramsSubject = new Subject<any>();

    mockWhatsNewService = {
      getNotionBlockChildren: jest.fn(),
      activeNotionPageData: jest.fn().mockReturnValue({ blocks: [] }),
      notionDataLoading: jest.fn().mockReturnValue(false),
      notionDataError: jest.fn().mockReturnValue(null)
    } as any;

    mockActivatedRoute = {
      params: paramsSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, DynamicNotionBlockComponent, TooltipModule, HttpClientTestingModule],
      providers: [
        { provide: WhatsNewService, useValue: mockWhatsNewService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        ResultsApiService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewPageDetailsComponent);
    component = fixture.componentInstance;
    whatsNewService = TestBed.inject(WhatsNewService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should subscribe to route params and set notionPageId', () => {
      const testId = 'test-page-id';

      paramsSubject.next({ id: testId });

      expect(component.notionPageId()).toBe(testId);
    });

    it('should call getNotionBlockChildren when id is provided', () => {
      const testId = 'test-page-id';

      paramsSubject.next({ id: testId });

      expect(mockWhatsNewService.getNotionBlockChildren).toHaveBeenCalledWith(testId);
    });

    it('should not call getNotionBlockChildren when id is not provided', () => {
      paramsSubject.next({});

      expect(mockWhatsNewService.getNotionBlockChildren).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from paramsSubscription', () => {
      const unsubscribeSpy = jest.spyOn(component['paramsSubscription'], 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('getConsecutiveNumberedItems', () => {
    it('should return an empty array when no blocks are available', () => {
      mockWhatsNewService.activeNotionPageData.mockReturnValue({ blocks: null });

      const result = component.getConsecutiveNumberedItems(0);

      expect(result).toEqual([]);
    });

    it('should return an empty array when blocks is an empty array', () => {
      mockWhatsNewService.activeNotionPageData.mockReturnValue({ blocks: [] });

      const result = component.getConsecutiveNumberedItems(0);

      expect(result).toEqual([]);
    });

    it('should return consecutive numbered list items starting from the given index', () => {
      const mockBlocks = [
        { id: '1', type: 'paragraph' },
        { id: '2', type: 'numbered_list_item' },
        { id: '3', type: 'numbered_list_item' },
        { id: '4', type: 'numbered_list_item' },
        { id: '5', type: 'paragraph' }
      ];

      mockWhatsNewService.activeNotionPageData.mockReturnValue({ blocks: mockBlocks });

      const result = component.getConsecutiveNumberedItems(1);

      expect(result).toEqual([
        { id: '2', type: 'numbered_list_item' },
        { id: '3', type: 'numbered_list_item' },
        { id: '4', type: 'numbered_list_item' }
      ]);
    });

    it('should return an empty array when starting index is out of bounds', () => {
      const mockBlocks = [
        { id: '1', type: 'paragraph' },
        { id: '2', type: 'numbered_list_item' }
      ];

      mockWhatsNewService.activeNotionPageData.mockReturnValue({ blocks: mockBlocks });

      const result = component.getConsecutiveNumberedItems(5);

      expect(result).toEqual([]);
    });

    it('should return an empty array when starting index is not a numbered list item', () => {
      const mockBlocks = [
        { id: '1', type: 'paragraph' },
        { id: '2', type: 'numbered_list_item' },
        { id: '3', type: 'numbered_list_item' }
      ];

      mockWhatsNewService.activeNotionPageData.mockReturnValue({ blocks: mockBlocks });

      const result = component.getConsecutiveNumberedItems(0);

      expect(result).toEqual([]);
    });
  });
});
