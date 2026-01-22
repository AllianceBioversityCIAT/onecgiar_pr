import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PolicyChangeContentComponent } from './policy-change-content.component';

describe('PolicyChangeContentComponent', () => {
  let component: PolicyChangeContentComponent;
  let fixture: ComponentFixture<PolicyChangeContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyChangeContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyChangeContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
