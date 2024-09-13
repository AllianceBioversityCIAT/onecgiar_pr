import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdatesComponent } from './updates.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FilterNotificationByInitiativePipe } from '../../pipes/filter-notification-by-initiative.pipe';

describe('UpdatesComponent', () => {
  let component: UpdatesComponent;
  let fixture: ComponentFixture<UpdatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdatesComponent, FilterNotificationByInitiativePipe],
      imports: [HttpClientTestingModule, CustomFieldsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
