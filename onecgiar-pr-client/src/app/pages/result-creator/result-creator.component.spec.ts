import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultCreatorComponent } from './result-creator.component';

describe('ResultCreatorComponent', () => {
  let component: ResultCreatorComponent;
  let fixture: ComponentFixture<ResultCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultCreatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
