import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackagesNotificationComponent } from './innovation-packages-notification.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { FilterNotificationByPhasePipe } from './pipes/filter-notification-by-phase.pipe';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { LabelNamePipe } from '../../../../../../custom-fields/pr-select/label-name.pipe';

describe('InnovationPackagesNotificationComponent', () => {
  let component: InnovationPackagesNotificationComponent;
  let fixture: ComponentFixture<InnovationPackagesNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackagesNotificationComponent, PrSelectComponent, FilterNotificationByPhasePipe, FilterNotificationByInitiativePipe, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackagesNotificationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
