import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsNewPageDetailsLoadingComponent } from './whats-new-page-details-loading.component';

describe('WhatsNewPageDetailsLoadingComponent', () => {
  let component: WhatsNewPageDetailsLoadingComponent;
  let fixture: ComponentFixture<WhatsNewPageDetailsLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsNewPageDetailsLoadingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewPageDetailsLoadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
