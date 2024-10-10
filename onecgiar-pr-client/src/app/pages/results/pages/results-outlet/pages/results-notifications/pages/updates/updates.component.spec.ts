import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdatesComponent } from './updates.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FilterNotificationByInitiativePipe } from '../../pipes/filter-notification-by-initiative.pipe';
import { NotificationItemModule } from '../../components/notification-item/notification-item.module';

describe('UpdatesComponent', () => {
  let component: UpdatesComponent;
  let fixture: ComponentFixture<UpdatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdatesComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule, NotificationItemModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
