import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveChangesJustificationDialogComponent } from './save-changes-justification-dialog.component';

describe('SaveChangesJustificationDialogComponent', () => {
  let component: SaveChangesJustificationDialogComponent;
  let fixture: ComponentFixture<SaveChangesJustificationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveChangesJustificationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveChangesJustificationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
