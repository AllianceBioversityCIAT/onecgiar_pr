import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorFactSheetComponent } from './tor-fact-sheet.component';

describe('TorFactSheetComponent', () => {
  let component: TorFactSheetComponent;
  let fixture: ComponentFixture<TorFactSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorFactSheetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorFactSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
