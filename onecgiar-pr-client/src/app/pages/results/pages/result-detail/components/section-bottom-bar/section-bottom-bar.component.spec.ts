import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { SectionBottomBarComponent } from './section-bottom-bar.component';
import { ResultSectionsService } from '../result-sections-sidebar/result-sections.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { SectionBottomBarSlotService } from './section-bottom-bar-slot.service';

describe('SectionBottomBarComponent', () => {
  let fixture: ComponentFixture<SectionBottomBarComponent>;
  let component: SectionBottomBarComponent;
  let router: Router;
  let sectionsMock: any;
  /** Url que el caso en curso simula; el mock del servicio deriva la posición de aquí. */
  let currentUrl = '/result/result-detail/1234/partners?phase=7';
  let saveMock: any;
  let dataControlMock: any;
  let rolesMock: any;
  /**
   * Green check de la seccion abierta. P2-3542: es la señal AUTORITATIVA de completitud — la
   * misma que pinta el rail y habilita Submit —, asi que los casos la fijan explicitamente en vez
   * de deducirla del scan del DOM.
   */
  let sectionIsDone = true;

  const SECTIONS = [
    { path: 'general-information', prName: 'General information' },
    { path: 'partners', prName: 'Partners' },
    { path: 'evidences', prName: 'Evidence' }
  ];

  const html = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => html().querySelector(sel) as HTMLElement;

  const build = async (url = '/result/result-detail/1234/partners?phase=7') => {
    currentUrl = url;
    buildSectionsMock();
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

  /**
   * `ResultSectionsService` es el dueño de "qué sección está abierta": el componente ya no lo
   * calcula desde el Router, lo lee de ahí, así que el mock tiene que publicarlo. Se deriva de la
   * misma url que fija cada `build(...)`, de modo que los casos siguen expresando lo mismo
   * (sección 2 de 3, una ruta fuera de la lista, los extremos).
   */
  const buildSectionsMock = () => {
    const path = currentUrl.split('?')[0].split('/').filter(Boolean).pop() ?? '';
    const index = SECTIONS.findIndex(sec => sec.path === path);
    sectionsMock = {
      sections: signal(SECTIONS),
      currentIndex: signal(index),
      navigableCount: signal(SECTIONS.length),
      currentPosition: signal(index + 1),
      hasCurrentSection: signal(index >= 0),
      currentSectionIsDone: signal(sectionIsDone),
      sectionLink: (s: any) => `/result/result-detail/1234/${s.path}`,
      sectionQueryParams: () => ({ phase: 7 })
    };
  };

  beforeEach(() => {
    currentUrl = '/result/result-detail/1234/partners?phase=7';
    buildSectionsMock();
    saveMock = { isSaving: signal(false) };
    dataControlMock = { fieldFeedbackList: signal<string[]>([]) };
    rolesMock = { readOnly: false };
    sectionIsDone = true;
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
      sectionIsDone = false;
      dataControlMock.fieldFeedbackList = signal(['Result title', 'Description']);
      await build();

      expect(q('[data-testid="section-bottom-bar-complete"]')).toBeNull();
      expect(q('[data-testid="section-bottom-bar-pending"]').textContent).toContain('2 fields missing');
    });

    it('keeps the count singular for one field', async () => {
      sectionIsDone = false;
      dataControlMock.fieldFeedbackList = signal(['Result title']);
      await build();

      expect(q('[data-testid="section-bottom-bar-pending"]').textContent).toContain('1 field missing');
    });

    it('names the missing fields when clicked, and closes again', async () => {
      sectionIsDone = false;
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

    /**
     * P2-3542. El caso que reporto QA: la barra decia "Section complete" mientras el rail estaba
     * rojo, porque decidia sola escaneando el DOM. El scan solo ve lo renderizado — el tab ToC
     * activo, y nada de lo que la funcion de validacion exige sin campo en pantalla (partner
     * contribuyente, centro contribuyente) —, asi que el green check tiene que ganar.
     */
    it('trusts the green check over the DOM scan when the scan found nothing (P2-3542)', async () => {
      sectionIsDone = false;
      dataControlMock.fieldFeedbackList = signal<string[]>([]);
      await build();

      expect(q('[data-testid="section-bottom-bar-complete"]')).toBeNull();
      expect(q('[data-testid="section-bottom-bar-pending"]').textContent).toContain('Section incomplete');
    });

    it('explains the gap instead of naming zero fields (P2-3542)', async () => {
      sectionIsDone = false;
      dataControlMock.fieldFeedbackList = signal<string[]>([]);
      await build();

      q('[data-testid="section-bottom-bar-pending"]').click();
      fixture.detectChanges();

      expect(html().querySelectorAll('#sbb-pending-list li')).toHaveLength(0);
      expect(q('#sbb-pending-list').textContent).toContain('pending requirements');
    });

    it('stays complete when the green check passes, whatever the DOM scan says (P2-3542)', async () => {
      sectionIsDone = true;
      dataControlMock.fieldFeedbackList = signal(['Result title']);
      await build();

      expect(q('[data-testid="section-bottom-bar-complete"]').textContent).toContain('Section complete');
      expect(q('[data-testid="section-bottom-bar-pending"]')).toBeNull();
    });

    /**
     * La barra se reusa en IPSR y en el result creator, fuera de la lista de secciones de
     * result-detail: alli no hay green check de seccion que leer y el scan del DOM sigue siendo
     * lo unico disponible.
     */
    it('falls back to the DOM scan on a route outside the section list', async () => {
      sectionIsDone = false;
      dataControlMock.fieldFeedbackList = signal<string[]>([]);
      await build('/result/result-detail/1234/something-else');

      expect(q('[data-testid="section-bottom-bar-complete"]').textContent).toContain('Section complete');
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

    it('provides the syncSlot element for teleporting the sync button', async () => {
      await build();
      TestBed.flushEffects();
      const slotSE = TestBed.inject(SectionBottomBarSlotService);
      expect(slotSE.syncSlot()).toBeTruthy();
      expect(slotSE.syncSlot()?.classList.contains('sbb-sync-slot')).toBe(true);
    });
  });
});
