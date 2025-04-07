import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewComponent } from './whats-new.component';
import { WhatsNewService } from './services/whats-new.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('WhatsNewComponent', () => {
  let component: WhatsNewComponent;
  let fixture: ComponentFixture<WhatsNewComponent>;
  let whatsNewService: WhatsNewService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WhatsNewComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [WhatsNewService]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewComponent);
    component = fixture.componentInstance;
    whatsNewService = TestBed.inject(WhatsNewService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject WhatsNewService', () => {
    expect(component.whatsNewService).toBeTruthy();
  });

  it('should call getWhatsNewPages on initialization', () => {
    const getWhatsNewPagesSpy = jest.spyOn(whatsNewService, 'getWhatsNewPages');
    component.ngOnInit();
    expect(getWhatsNewPagesSpy).toHaveBeenCalled();
  });
});
