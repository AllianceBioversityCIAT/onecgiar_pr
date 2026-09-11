// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-R-4, R-6)
// @akili-spec changes/delete-result-action (DEL-T-3, DEL-R-2, DEL-AC-6, DEL-AC-7)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { MyWorkCardComponent } from './my-work-card.component';
import { ProgrammeResultRow } from '../../../programme-results/services/programme-results.service';
import { SmartNavigationService } from '../../../../../../shared/services/smart-navigation.service';
import { ResultDeletionService } from '../../../../services/result-deletion.service';
import { PrToastService } from '../../../../../../shared/components/pr-toast';

function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  return {
    id: 4712,
    code: '4712',
    title: 'Farmer-led seed multiplication guide for drought-tolerant sorghum',
    category: 'Knowledge product',
    statusId: 1,
    statusName: 'Editing',
    resultTypeId: 6,
    createdBy: 'Guest Tester',
    created: '2025-08-12T00:00:00.000Z',
    origin: 'W1/W2',
    center: '',
    updated: '',
    indicator: '',
    section: '',
    versionId: '36',
    phaseName: 'Reporting 2026',
    phaseYear: 2026,
    submitterCode: 'SP01',
    raw: {},
    ...partial
  };
}

describe('MyWorkCardComponent', () => {
  let fixture: ComponentFixture<MyWorkCardComponent>;
  let component: MyWorkCardComponent;
  let mockDeletionService: { getDeleteEligibility: jest.Mock; deleteWithConfirmation: jest.Mock };
  let mockToastService: { add: jest.Mock };
  let mockClipboard: { copy: jest.Mock };

  beforeEach(() => {
    mockDeletionService = {
      getDeleteEligibility: jest.fn().mockReturnValue({ visible: false, disabled: false, tooltip: '' }),
      deleteWithConfirmation: jest.fn()
    };
    mockToastService = {
      add: jest.fn()
    };
    mockClipboard = {
      copy: jest.fn().mockReturnValue(true)
    };
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach(container => container.remove());
  });

  const build = async (inputs: { row: ProgrammeResultRow; inEditingColumn?: boolean }) => {
    await TestBed.configureTestingModule({
      imports: [MyWorkCardComponent],
      providers: [
        provideRouter([]),
        { provide: ResultDeletionService, useValue: mockDeletionService },
        { provide: PrToastService, useValue: mockToastService },
        { provide: Clipboard, useValue: mockClipboard }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MyWorkCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('row', inputs.row);
    fixture.componentRef.setInput('inEditingColumn', inputs.inEditingColumn ?? false);
    fixture.detectChanges();
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  it('does not render any draggable attribute anywhere on the card (MWB-DD-6)', async () => {
    await build({ row: row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] } }), inEditingColumn: true });

    expect(root().querySelectorAll('[draggable]').length).toBe(0);
  });

  describe('editing variant', () => {
    it('shows n of m sections, a bar and the missing labels in server order', async () => {
      await build({
        row: row({ completeness: { complete: 2, total: 5, missing: ['geographic-location', 'contributor-partners', 'knowledge-product-info'] } }),
        inEditingColumn: true
      });

      expect(component.variant()).toBe('editing');
      expect(text()).toContain('2 of 5 sections');
      expect(text()).toContain('Missing: Geographic location · Contributing partners · Knowledge product');
      const bar = root().querySelector('.h-\\[4px\\] > div') as HTMLElement;
      expect(bar.style.width).toBe('40%');
    });

    it('drops an unknown section key from the missing list instead of rendering the raw key', async () => {
      await build({
        row: row({ completeness: { complete: 3, total: 5, missing: ['not-a-real-section', 'geographic-location'] } }),
        inEditingColumn: true
      });

      expect(component.missingLabels()).toEqual(['Geographic location']);
      expect(text()).not.toContain('not-a-real-section');
    });

    it('renders a primary Continue button that navigates to the first missing section with the phase', async () => {
      await build({
        row: row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] }, versionId: '36' }),
        inEditingColumn: true
      });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      const btn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('Continue')) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      btn.click();

      expect(navSpy).toHaveBeenCalledWith(['/result', 'result-detail', '4712', 'geographic-location'], { queryParams: { phase: 36 } });
    });

    it('persists My Results as the result-detail Back origin before Continue navigates', async () => {
      await build({
        row: row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] }, versionId: '36' }),
        inEditingColumn: true
      });
      const remember = jest.spyOn(TestBed.inject(SmartNavigationService), 'rememberResultDetailOrigin');
      jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      const btn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('Continue')) as HTMLButtonElement;
      btn.click();

      expect(remember).toHaveBeenCalled();
    });
  });

  describe('ready variant (n === m, total > 0)', () => {
    it('shows the green bar and the secondary Review and submit button, no missing list', async () => {
      await build({ row: row({ completeness: { complete: 5, total: 5, missing: [] } }), inEditingColumn: true });

      expect(component.variant()).toBe('ready');
      expect(text()).toContain('5 of 5 sections');
      expect(text()).toContain('ready to submit');
      expect(text()).toContain('Review and submit');
      expect(text()).not.toContain('Missing:');
    });
  });

  describe('unknown variant', () => {
    it('renders "Open to check completeness" and no bar when completeness is null', async () => {
      await build({ row: row({ completeness: null }), inEditingColumn: true });

      expect(component.variant()).toBe('unknown');
      expect(text()).toContain('Open to check completeness');
      expect(root().querySelector('.h-\\[4px\\]')).toBeNull();
    });

    it('treats total === 0 as unknown, never as ready (MWB-T-1 forward pointer)', async () => {
      await build({ row: row({ completeness: { complete: 0, total: 0, missing: [] } }), inEditingColumn: true });

      expect(component.variant()).toBe('unknown');
      expect(text()).toContain('Open to check completeness');
      expect(text()).not.toContain('ready to submit');
    });

    it('still offers a primary Continue button (lands on general-information via the empty-missing fallback)', async () => {
      await build({ row: row({ completeness: null }), inEditingColumn: true });

      const btn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('Continue')) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(component.continueRoute()).toBe('general-information');
    });
  });

  describe('waiting/closed variant (outside the Editing column)', () => {
    it('shows the created line and a plain Open link, no completeness and no primary button', async () => {
      await build({ row: row({ statusId: 3, statusName: 'Submitted', completeness: null }), inEditingColumn: false });

      expect(component.variant()).toBe('waiting-closed');
      expect(text()).toContain('Created');
      expect(text()).not.toContain('Open to check completeness');

      const link = root().querySelector('a');
      expect(link?.textContent?.trim()).toBe('Open');
    });

    it('persists My Results as the result-detail Back origin when Open is clicked', async () => {
      await build({ row: row({ statusId: 3, statusName: 'Submitted', completeness: null }), inEditingColumn: false });
      const remember = jest.spyOn(TestBed.inject(SmartNavigationService), 'rememberResultDetailOrigin');

      root().querySelector('a')?.click();

      expect(remember).toHaveBeenCalled();
    });

    it('never renders a primary (gradient) button outside Editing', async () => {
      await build({ row: row({ statusId: 6, statusName: 'Approved' }), inEditingColumn: false });

      const gradientButtons = Array.from(root().querySelectorAll('button')).filter(b => b.className.includes('bg-gradient-to-r'));
      expect(gradientButtons.length).toBe(0);
    });
  });

  it('renders the real statusName on the chip even for a merged status (MWB-R-2)', async () => {
    await build({ row: row({ statusId: 8, statusName: 'Draft' }), inEditingColumn: true });

    expect(text()).toContain('Draft');
  });

  // `MWB-T-7` (5): presence-only — the real "does it honour prefers-reduced-motion" behaviour is a
  // CSS media query, not something jsdom evaluates; this only guards the class stays on the markup.
  it('carries motion-reduce:transition-none on the hover-animated card and its actions (MWB-T-7)', async () => {
    await build({ row: row({ completeness: { complete: 2, total: 5, missing: ['geographic-location'] } }), inEditingColumn: true });

    const article = root().querySelector('article') as HTMLElement;
    expect(article.className).toContain('motion-reduce:transition-none');
    const continueBtn = Array.from(root().querySelectorAll('button')).find(b => b.textContent?.includes('Continue')) as HTMLButtonElement;
    expect(continueBtn.className).toContain('motion-reduce:transition-none');
  });

  // ── Context menu and Delete action (DEL-T-3, DEL-R-2, DEL-AC-6, DEL-AC-7, D4, D5) ──────
  describe('context menu and delete action (DEL-T-3, DEL-R-2, DEL-AC-6, DEL-AC-7)', () => {
    const openMenu = () => {
      const trigger = root().querySelector('button[aria-label="More actions"]') as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();
    };

    const overlayItems = () => Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]'));

    it('renders the kebab menu trigger and opens CDK Connected Overlay in .cdk-overlay-container on body (D4)', async () => {
      await build({ row: row() });

      const trigger = root().querySelector('button[aria-label="More actions"]') as HTMLButtonElement;
      expect(trigger).toBeTruthy();
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      openMenu();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const menu = document.querySelector('.cdk-overlay-container [role="menu"]');
      expect(menu).toBeTruthy();
      expect(menu!.className).toContain('pr-row-menu');
    });

    it('offers Download PDF with correct report href and closes menu on click', async () => {
      await build({ row: row({ code: '4712', versionId: '36' }) });
      openMenu();

      const pdfItem = overlayItems().find(item => item.textContent?.includes('Download PDF')) as HTMLAnchorElement;
      expect(pdfItem).toBeTruthy();
      expect(pdfItem.getAttribute('href')).toBe('/reports/result-details/4712?phase=36');
      expect(pdfItem.getAttribute('target')).toBe('_blank');

      pdfItem.click();
      fixture.detectChanges();

      expect(component.isMenuOpen()).toBe(false);
    });

    it('offers Copy link and copies absolute URL with toast notification on click', async () => {
      await build({ row: row({ code: '4712', versionId: '36' }) });
      openMenu();

      const copyItem = overlayItems().find(item => item.textContent?.includes('Copy link')) as HTMLButtonElement;
      expect(copyItem).toBeTruthy();

      copyItem.click();
      fixture.detectChanges();

      expect(mockClipboard.copy).toHaveBeenCalledWith(expect.stringContaining('/result/result-detail/4712/general-information?phase=36'));
      expect(mockToastService.add).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'success',
        summary: 'Result link copied'
      }));
      expect(component.isMenuOpen()).toBe(false);
    });

    it('hides Delete when deleteEligibility visible is false', async () => {
      mockDeletionService.getDeleteEligibility.mockReturnValue({
        visible: false,
        disabled: false,
        tooltip: ''
      });
      await build({ row: row() });
      openMenu();

      const deleteItem = overlayItems().find(item => item.textContent?.includes('Delete'));
      expect(deleteItem).toBeUndefined();
    });

    it('renders enabled Delete item when eligible', async () => {
      mockDeletionService.getDeleteEligibility.mockReturnValue({
        visible: true,
        disabled: false,
        tooltip: ''
      });
      await build({ row: row() });
      openMenu();

      const deleteItem = overlayItems().find(item => item.textContent?.includes('Delete')) as HTMLButtonElement;
      expect(deleteItem).toBeTruthy();
      expect(deleteItem.disabled).toBe(false);
      expect(deleteItem.className).toContain('text-[var(--pr-color-red-600)]');
      expect(deleteItem.querySelector('.pi-trash')).toBeTruthy();
    });

    it('renders disabled Delete button with QAed / non-lead tooltip', async () => {
      const qaedTooltip = 'You are not allowed to perform this action because the result is in the status "QAed".';
      mockDeletionService.getDeleteEligibility.mockReturnValue({
        visible: true,
        disabled: true,
        tooltip: qaedTooltip
      });
      await build({ row: row() });
      openMenu();

      const deleteItem = overlayItems().find(item => item.textContent?.includes('Delete')) as HTMLButtonElement;
      expect(deleteItem).toBeTruthy();
      expect(deleteItem.disabled).toBe(true);
      expect(deleteItem.className).toContain('cursor-not-allowed');
      expect(deleteItem.getAttribute('title')).toBe(qaedTooltip);
    });

    it('calls deleteWithConfirmation and emits deleted output on success (DEL-R-4, DEL-AC-7, D5)', async () => {
      const testRow = row();
      mockDeletionService.getDeleteEligibility.mockReturnValue({
        visible: true,
        disabled: false,
        tooltip: ''
      });
      mockDeletionService.deleteWithConfirmation.mockImplementation((targetRow, options) => {
        options?.onSuccess?.();
      });
      await build({ row: testRow });

      const deletedSpy = jest.fn();
      component.deleted.subscribe(deletedSpy);

      openMenu();

      const deleteItem = overlayItems().find(item => item.textContent?.includes('Delete')) as HTMLButtonElement;
      deleteItem.click();
      fixture.detectChanges();

      expect(mockDeletionService.deleteWithConfirmation).toHaveBeenCalledWith(testRow, expect.objectContaining({
        onSuccess: expect.any(Function)
      }));
      expect(deletedSpy).toHaveBeenCalledWith(testRow);
      expect(component.isMenuOpen()).toBe(false);
    });

    it('does not trigger deleteWithConfirmation when clicking disabled Delete item', async () => {
      mockDeletionService.getDeleteEligibility.mockReturnValue({
        visible: true,
        disabled: true,
        tooltip: 'Disabled'
      });
      await build({ row: row() });
      openMenu();

      const deleteItem = overlayItems().find(item => item.textContent?.includes('Delete')) as HTMLButtonElement;
      deleteItem.click();

      expect(mockDeletionService.deleteWithConfirmation).not.toHaveBeenCalled();
    });
  });
});

