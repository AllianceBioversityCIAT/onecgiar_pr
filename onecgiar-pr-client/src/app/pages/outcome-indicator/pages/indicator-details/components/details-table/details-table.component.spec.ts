import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsTableComponent } from './details-table.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IndicatorDetailsService } from '../../services/indicator-details.service';

describe('DetailsTableComponent', () => {
  let component: DetailsTableComponent;
  let fixture: ComponentFixture<DetailsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IndicatorDetailsService]
    }).compileComponents();

    fixture = TestBed.createComponent(DetailsTableComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open new page when openInNewPage is called', () => {
    const result_code = 'result123';
    const version_id = 'version123';
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    jest.spyOn(window, 'open');
    component.openInNewPage(result_code, version_id);
    expect(window.open).toHaveBeenCalledWith(url, '_blank');
  });

  it('should not remove indicator if submission status is 1', () => {
    const result = { is_added: true, result_id: 'result123' };
    jest.spyOn(component.indicatorDetailsService, 'indicatorData').mockReturnValue({ submission_status: '1' } as any);

    component.handleRemoveIndicator(result);
  });

  it('should remove indicator if it is added and submission status is not 1', () => {
    const result = { is_added: true, result_id: 'result123', id: 'result123' };
    const indicatorData = {
      submission_status: '0',
      contributing_results: [{ result_id: 'result123' }, { result_id: 'result456' }]
    };
    const indicatorResults = [
      { id: 'result123', is_added: true },
      { id: 'result456', is_added: true }
    ];
    component.indicatorDetailsService.indicatorData.set(indicatorData as any);
    jest.spyOn(component.indicatorDetailsService, 'indicatorResults').mockReturnValue(indicatorResults);

    component.handleRemoveIndicator(result);

    expect(component.indicatorDetailsService.indicatorData().contributing_results).toEqual([{ result_id: 'result456' }]);
    expect(indicatorResults[0].is_added).toBe(false);
  });

  it('should set result as inactive if it is not added', () => {
    const result = { is_added: false, is_active: true };
    jest.spyOn(component.indicatorDetailsService, 'indicatorData').mockReturnValue({ submission_status: '0' } as any);

    component.handleRemoveIndicator(result);

    expect(result.is_active).toBe(false);
  });
});
