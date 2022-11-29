import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoDataTextComponent } from './no-data-text.component';

describe('NoDataTextComponent', () => {
  let component: NoDataTextComponent;
  let fixture: ComponentFixture<NoDataTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NoDataTextComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoDataTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
