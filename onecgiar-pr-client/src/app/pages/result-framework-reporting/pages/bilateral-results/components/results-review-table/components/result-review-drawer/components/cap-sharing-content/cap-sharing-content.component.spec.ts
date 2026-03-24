import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CapSharingContentComponent } from './cap-sharing-content.component';

describe('CapSharingContentComponent', () => {
  let component: CapSharingContentComponent;
  let fixture: ComponentFixture<CapSharingContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapSharingContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CapSharingContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
