import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NormalSelectorComponent } from './normal-selector.component';

describe('NormalSelectorComponent', () => {
  let component: NormalSelectorComponent;
  let fixture: ComponentFixture<NormalSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NormalSelectorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NormalSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
