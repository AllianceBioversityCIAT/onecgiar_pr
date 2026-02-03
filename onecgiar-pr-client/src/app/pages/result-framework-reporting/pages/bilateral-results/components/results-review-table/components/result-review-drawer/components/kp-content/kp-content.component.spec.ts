import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { KpContentComponent } from './kp-content.component';

describe('KpContentComponent', () => {
  let component: KpContentComponent;
  let fixture: ComponentFixture<KpContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(KpContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
