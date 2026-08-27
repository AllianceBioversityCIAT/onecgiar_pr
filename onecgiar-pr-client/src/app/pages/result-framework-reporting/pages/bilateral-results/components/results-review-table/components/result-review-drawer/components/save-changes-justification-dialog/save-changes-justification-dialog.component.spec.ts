import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveChangesJustificationDialogComponent } from './save-changes-justification-dialog.component';

describe('SaveChangesJustificationDialogComponent', () => {
  let component: SaveChangesJustificationDialogComponent;
  let fixture: ComponentFixture<SaveChangesJustificationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SaveChangesJustificationDialogComponent] })
      .overrideComponent(SaveChangesJustificationDialogComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(SaveChangesJustificationDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create with its defaults', () => {
    expect(component).toBeTruthy();
    expect(component.visible).toBe(false);
    expect(component.resultCode).toBe('');
    expect(component.isSaving).toBe(false);
    expect(component.justification).toBe('');
  });

  describe('onCancel', () => {
    it('does nothing while saving', () => {
      const visibleSpy = jest.spyOn(component.visibleChange, 'emit');
      const cancelSpy = jest.spyOn(component.cancelEvent, 'emit');
      component.isSaving = true;
      component.onCancel();
      expect(visibleSpy).not.toHaveBeenCalled();
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('closes and notifies when idle', () => {
      const visibleSpy = jest.spyOn(component.visibleChange, 'emit');
      const cancelSpy = jest.spyOn(component.cancelEvent, 'emit');
      component.onCancel();
      expect(visibleSpy).toHaveBeenCalledWith(false);
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('onConfirm', () => {
    it('ignores a blank justification', () => {
      const spy = jest.spyOn(component.confirm, 'emit');
      component.justification = '   ';
      component.onConfirm();
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits the justification', () => {
      const spy = jest.spyOn(component.confirm, 'emit');
      component.justification = 'because';
      component.onConfirm();
      expect(spy).toHaveBeenCalledWith('because');
    });
  });
});
