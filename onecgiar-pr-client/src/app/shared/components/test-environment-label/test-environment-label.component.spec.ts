import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestEnvironmentLabelComponent } from './test-environment-label.component';

describe('TestEnvironmentLabelComponent', () => {
  let component: TestEnvironmentLabelComponent;
  let fixture: ComponentFixture<TestEnvironmentLabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestEnvironmentLabelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestEnvironmentLabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
