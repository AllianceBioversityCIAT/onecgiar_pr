import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { SectionBottomBarComponent } from './section-bottom-bar.component';
import { ResultSectionsService } from '../result-sections-sidebar/result-sections.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';

describe('SectionBottomBarComponent', () => {
  let fixture: ComponentFixture<SectionBottomBarComponent>;
  let component: SectionBottomBarComponent;
  let router: Router;
  let sectionsMock: any;
  let saveMock: any;
  let dataControlMock: any;
  let rolesMock: any;

  const SECTIONS = [
    { path: 'general-information', prName: 'General information' },
    { path: 'partners', prName: 'Partners' },
    { path: 'evidences', prName: 'Evidence' }
  ];

  const html = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => html().querySelector(sel) as HTMLElement;

  const build = async (url = '/result/result-detail/1234/partners?phase=7') => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SectionBottomBarComponent],
      providers: [
        provideRouter([]),
        { provide: ResultSectionsService, useValue: sectionsMock },
        { provide: SaveButtonService, useValue: saveMock },
        { provide: DataControlService, useValue: dataControlMock },
        { provide: RolesService, useValue: rolesMock }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'url', 'get').mockReturnValue(url);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(SectionBottomBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    sectionsMock = {
      sections: signal(SECTIONS),
      sectionLink: (s: any) => `/result/result-detail/1234/${s.path}`,
      sectionQueryParams: () => ({ phase: 7 })
    };
    saveMock = { isSaving: signal(false) };
    dataControlMock = { fieldFeedbackList: signal<string[]>([]) };
    rolesMock = { readOnly: false };
  });

  describe('position', () => {
    it('reads the position from the route, 1-based', async () => {
      await build();

      expect(q('[data-testid="section-bottom-bar-position"]').textContent.trim()).toBe('Section 2 of 3');
    });

    it('hides the position on a route that is not one of the sections', async () => {
      await build('/result/result-detail/1234/something-else');

      expect(q('[data-testid="section-bottom-bar-position"]')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('disables Back on the first section', async () => {
      await build('/result/result-detail/1234/general-information');

      expect((q('[data-testid="section-bottom-bar-back"]') as HTMLButtonElement).disabled).toBe(true);
      expect((q('[data-testid="section-bottom-bar-next"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('disables Next on the last section', async () => {
      await build('/result/result-detail/1234/evidences');

      expect((q('[data-testid="section-bottom-bar-next"]') as HTMLButtonElement).disabled).toBe(true);
      expect((q('[data-testid="section-bottom-bar-back"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('navigates to the next section keeping the phase', async () => {
      await build();
      q('[data-testid="section-bottom-bar-next"]').click();

      expect(router.navigate).toHaveBeenCalledWith(['/result/result-detail/1234/evidences'], { queryParams: { phase: 7 } });
    });

    it('navigates to the previous section', async () => {
      await build();
      q('[data-testid="section-bottom-bar-back"]').click();

      expect(router.navigate).toHaveBeenCalledWith(['/result/result-detail/1234/general-information'], { queryParams: { phase: 7 } });
    });

    it('does not navigate past the ends', async () => {
      await build('/result/result-detail/1234/evidences');
      component.goNext();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('completion status', () => {
    it('says the section is complete when nothing is missing', async () => {
      await build();

      expect(q('[data-testid="section-bottom-bar-complete"]').textContent).toContain('Section complete');
      expect(q('[data-testid="section-bottom-bar-pending"]')).toBeNull();
    });

    it('counts the missing fields instead', async () => {
      dataControlMock.fieldFeedbackList = signal(['Result title', 'Description']);
      await build();

      expect(q('[data-testid="section-bottom-bar-complete"]')).toBeNull();
      expect(q('[data-testid="section-bottom-bar-pending"]').textContent).toContain('2 fields missing');
    });

    it('keeps the count singular for one field', async () => {
      dataControlMock.fieldFeedbackList = signal(['Result title']);
      await build();

      expect(q('[data-testid="section-bottom-bar-pending"]').textContent).toContain('1 field missing');
    });

    it('names the missing fields when clicked, and closes again', async () => {
      dataControlMock.fieldFeedbackList = signal(['Result title', 'Description']);
      await build();

      expect(q('#sbb-pending-list')).toBeNull();

      q('[data-testid="section-bottom-bar-pending"]').click();
      fixture.detectChanges();
      const items = Array.from(html().querySelectorAll('#sbb-pending-list li')).map(li => li.textContent.trim());
      expect(items).toEqual(['Result title', 'Description']);

      component.closePending();
      fixture.detectChanges();
      expect(q('#sbb-pending-list')).toBeNull();
    });
  });

  describe('save', () => {
    it('emits on click', async () => {
      await build();
      const spy = jest.fn();
      component.clickSave.subscribe(spy);

      q('[data-testid="section-bottom-bar-save"]').click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not emit while a save is in flight', async () => {
      saveMock.isSaving = signal(true);
      await build();
      const spy = jest.fn();
      component.clickSave.subscribe(spy);

      component.onClickSave();
      expect(spy).not.toHaveBeenCalled();
      expect(q('[data-testid="section-bottom-bar-save"]').textContent.trim()).toBe('Saving…');
    });

    // The guard lives in the component, not only in CSS — a styling regression must not make a
    // vetoed save reachable.
    it('does not emit when the consumer vetoed it', async () => {
      await build();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      const spy = jest.fn();
      component.clickSave.subscribe(spy);

      component.onClickSave();
      expect(spy).not.toHaveBeenCalled();
    });

    it('shows the default Save draft label', async () => {
      await build();

      expect(q('[data-testid="section-bottom-bar-save"]').textContent.trim()).toBe('Save draft');
    });

    it('hides Save for a read-only user', async () => {
      rolesMock.readOnly = true;
      await build();

      expect(q('[data-testid="section-bottom-bar-save"]')).toBeNull();
    });

    it('keeps Save for a read-only user the section marked editable', async () => {
      rolesMock.readOnly = true;
      await build();
      // setInput (not a plain assignment) is what marks an OnPush view dirty.
      fixture.componentRef.setInput('editable', true);
      fixture.detectChanges();

      expect(component.canSave).toBe(true);
      expect(q('[data-testid="section-bottom-bar-save"]')).toBeTruthy();
    });
  });
});
