import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { UpdateIpsrResultModalComponent } from './update-ipsr-result-modal.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { InnovationPackageListFilterPipe } from '../innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
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
      imports: [HttpClientModule, TableModule, DialogModule]
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
});
