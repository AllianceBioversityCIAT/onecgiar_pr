import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveButtonComponent } from './save-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaveButtonService } from './save-button.service';

describe('SaveButtonComponent', () => {
  let component: SaveButtonComponent;
  let fixture: ComponentFixture<SaveButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SaveButtonComponent],
      imports: [HttpClientTestingModule],
      providers: []
    }).compileComponents();

    fixture = TestBed.createComponent(SaveButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('re-entry guard', () => {
    let saveButtonSE: SaveButtonService;
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      saveButtonSE = TestBed.inject(SaveButtonService);
      saveButtonSE.isSaving.set(false);
      emitSpy = jest.spyOn(component.clickSave, 'emit');
    });

    it('should emit once per click while idle', () => {
      component.onClickSave();
      component.onClickSave();

      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    it('should refuse a second save while one is in flight', () => {
      saveButtonSE.showSaveSpinner();

      component.onClickSave();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should accept a save again once the request settles, including after an error', () => {
      saveButtonSE.showSaveSpinner();
      component.onClickSave();
      expect(emitSpy).not.toHaveBeenCalled();

      // hideSaveSpinner() is what both the success and the error branch of every *Pipe call.
      saveButtonSE.hideSaveSpinner();
      component.onClickSave();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit while the consumer holds [disabled]', () => {
      component.disabled = true;

      component.onClickSave();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
