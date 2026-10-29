import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { UpdateIpsrResultModalComponent } from './update-ipsr-result-modal.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { InnovationPackageListFilterPipe } from '../innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { PrTableComponent, PrSortIconComponent, PrSortableColumnDirective, PrTableHeaderDirective, PrTableBodyDirective } from 'src/app/shared/components/pr-table';
import { IpsrToUpdateFilterPipe } from './ipsr-to-update-filter.pipe';

describe('UpdateIpsrResultModalComponent', () => {
  let component: UpdateIpsrResultModalComponent;
  let fixture: ComponentFixture<UpdateIpsrResultModalComponent>;
  let apiService: ApiService;
  let retrieveModalService: RetrieveModalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateIpsrResultModalComponent, InnovationPackageListFilterPipe, PrFieldHeaderComponent, IpsrToUpdateFilterPipe],
      providers: [ApiService, IpsrDataControlService, RetrieveModalService],
      imports: [HttpClientModule, FormsModule, RouterTestingModule, PrTableComponent, PrSortIconComponent, PrSortableColumnDirective, PrTableHeaderDirective, PrTableBodyDirective],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateIpsrResultModalComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    retrieveModalService = TestBed.inject(RetrieveModalService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update retrieve modal title on onPressAction', () => {
    const result = { title: 'Test Title', id: 1 };
    component.onPressAction(result);
    expect(retrieveModalService.title).toBe(result.title);
  });

  it('should update currentResultId on onPressAction', () => {
    const result = { title: 'Test Title', id: 1 };
    component.onPressAction(result);
    expect(apiService.resultsSE.currentResultId).toBe(result.id);
  });

  it('should update currentResult on onPressAction', () => {
    const result = { title: 'Test Title', id: 1 };
    component.onPressAction(result);
    expect(apiService.dataControlSE.currentResult).toBe(result);
  });

  it('should set chagePhaseModal to true on onPressAction', () => {
    const result = { title: 'Test Title', id: 1 };
    component.onPressAction(result);
    expect(apiService.dataControlSE.chagePhaseModal).toBe(true);
  });

  it('submitterLabel builds `CODE - Name` and falls back to the code (PF2 M1)', () => {
    expect(component.submitterLabel({ official_code: 'SP05', submitter_name: 'Better Diets' })).toBe('SP05 - Better Diets');
    expect(component.submitterLabel({ official_code: 'SP05' })).toBe('SP05');
    expect(component.columnOrder.find(c => c.title === 'Submitter').attr).toBe('official_code');
  });

  describe('Submitter cell render (PF2 M1)', () => {
    const cells = (rows: any[]) => {
      // the row filter pipe keeps only older-phase rows, and non-admins only their own initiatives
      apiService.dataControlSE.IPSRCurrentPhase = { phaseYear: 2025 } as any;
      apiService.rolesSE.isAdmin = true;
      TestBed.inject(IpsrDataControlService).ipsrResultList = rows.map(r => ({ phase_year: 2024, ...r }));
      fixture.detectChanges();
      return Array.from(fixture.nativeElement.querySelectorAll('td.official_code .sp-label-text')) as HTMLElement[];
    };

    it('renders `SP05 - Better Diets` with a title equal to it', () => {
      const [cell] = cells([{ result_code: 1, official_code: 'SP05', submitter_name: 'Better Diets' }]);
      expect(cell.textContent.trim()).toBe('SP05 - Better Diets');
      expect(cell.getAttribute('title')).toBe('SP05 - Better Diets');
    });

    it('renders only the code for a row with no name', () => {
      const [cell] = cells([{ result_code: 2, official_code: 'SP05' }]);
      expect(cell.textContent.trim()).toBe('SP05');
    });
  });
});
