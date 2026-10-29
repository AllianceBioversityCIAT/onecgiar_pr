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

  describe('Submitter label (PF2-R-2, M3)', () => {
    const renderRows = (rows: any[]) => {
      component.indicatorDetailsService.indicatorData.set({ submission_status: '0', contributing_results: rows } as any);
      fixture.detectChanges();
      return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr')).map(tr => tr.querySelectorAll('td')[4] as HTMLElement);
    };

    it('renders "SP01 - Breeding" as text and title in the Submitter cell', () => {
      const [cell] = renderRows([{ result_id: '1', result_code: '10', result_submitter: 'SP01', result_submitter_name: 'Breeding' }]);
      expect(cell.textContent?.trim()).toBe('SP01 - Breeding');
      expect(cell.getAttribute('title')).toBe('SP01 - Breeding');
    });

    it('renders the code alone, with a code-only title, when the row has no name', () => {
      const [cell] = renderRows([{ result_id: '2', result_code: '11', result_submitter: 'SP01' }]);
      expect(cell.textContent?.trim()).toBe('SP01');
      expect(cell.getAttribute('title')).toBe('SP01');
    });

    it('builds "SP01 - Breeding" from result_submitter + result_submitter_name', () => {
      expect(component.submitterLabel({ result_submitter: 'SP01', result_submitter_name: 'Breeding' })).toBe('SP01 - Breeding');
    });

    it('builds the same label for a row added from the modal (submitter_name mapped)', () => {
      const added = { result_submitter: 'SP01', result_submitter_name: 'Breeding', is_added: true };
      expect(component.submitterLabel(added)).toBe('SP01 - Breeding');
    });

    it('shows the code only when the name is missing', () => {
      expect(component.submitterLabel({ result_submitter: 'SP01', result_submitter_name: null })).toBe('SP01');
      expect(component.submitterLabel({ result_submitter: 'SP01' })).toBe('SP01');
    });
  });
});
