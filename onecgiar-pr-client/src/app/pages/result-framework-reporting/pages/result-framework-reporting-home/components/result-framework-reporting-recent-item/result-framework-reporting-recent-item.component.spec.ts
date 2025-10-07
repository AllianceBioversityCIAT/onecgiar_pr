import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingRecentItemComponent } from './result-framework-reporting-recent-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RecentActivity } from '../../../../../../shared/interfaces/recentActivity.interface';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

describe('ResultFrameworkReportingRecentItemComponent', () => {
  let component: ResultFrameworkReportingRecentItemComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingRecentItemComponent>;

  const mockRecentActivity: RecentActivity = {
    id: 1,
    resultId: 123,
    resultCode: 'R12345',
    resultTitle: 'Test Result Title',
    initiativeId: 456,
    initiativeName: 'Test Initiative',
    initiativeOfficialCode: 'TI001',
    eventType: 'update',
    message: 'Result was updated',
    emitterId: 789,
    emitterName: 'Test User',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    phase: 'active'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      providers: [],
      imports: [ResultFrameworkReportingRecentItemComponent, HttpClientTestingModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingRecentItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getResultUrl', () => {
    it('should return correct URL when item has resultCode', () => {
      // Arrange
      component.item = mockRecentActivity;
      const expectedUrl = '/result/result-detail/R12345/general-information';

      // Act
      const result = component.getResultUrl();

      // Assert
      expect(result).toBe(expectedUrl);
    });

    it('should return URL with undefined when item is undefined', () => {
      // Arrange
      component.item = undefined;
      const expectedUrl = '/result/result-detail/undefined/general-information';

      // Act
      const result = component.getResultUrl();

      // Assert
      expect(result).toBe(expectedUrl);
    });

    it('should return URL with undefined when item has no resultCode', () => {
      // Arrange
      component.item = { ...mockRecentActivity, resultCode: undefined as any };
      const expectedUrl = '/result/result-detail/undefined/general-information';

      // Act
      const result = component.getResultUrl();

      // Assert
      expect(result).toBe(expectedUrl);
    });

    it('should log the item when called', () => {
      // Arrange
      component.item = mockRecentActivity;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      component.getResultUrl();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(mockRecentActivity);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('getTooltipText', () => {
    it('should return correct tooltip text when item has resultCode and resultTitle', () => {
      // Arrange
      component.item = mockRecentActivity;
      const expectedTooltip = 'View result: R12345 - Test Result Title';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });

    it('should return tooltip with undefined values when item is undefined', () => {
      // Arrange
      component.item = undefined;
      const expectedTooltip = 'View result: undefined - undefined';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });

    it('should return tooltip with undefined values when item has no resultCode and resultTitle', () => {
      // Arrange
      component.item = {
        ...mockRecentActivity,
        resultCode: undefined as any,
        resultTitle: undefined as any
      };
      const expectedTooltip = 'View result: undefined - undefined';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });

    it('should return tooltip with partial data when only resultCode is available', () => {
      // Arrange
      component.item = {
        ...mockRecentActivity,
        resultTitle: undefined as any
      };
      const expectedTooltip = 'View result: R12345 - undefined';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });

    it('should return tooltip with partial data when only resultTitle is available', () => {
      // Arrange
      component.item = {
        ...mockRecentActivity,
        resultCode: undefined as any
      };
      const expectedTooltip = 'View result: undefined - Test Result Title';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });

    it('should handle empty string values correctly', () => {
      // Arrange
      component.item = {
        ...mockRecentActivity,
        resultCode: '',
        resultTitle: ''
      };
      const expectedTooltip = 'View result:  - ';

      // Act
      const result = component.getTooltipText();

      // Assert
      expect(result).toBe(expectedTooltip);
    });
  });
});
