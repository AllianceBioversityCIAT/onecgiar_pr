// @akili-spec changes/my-work-board (MWB-T-4, MWB-T-7, MWB-R-4, R-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MyWorkCardComponent } from './my-work-card.component';
import { ProgrammeResultRow } from '../../../programme-results/services/programme-results.service';

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

  const build = async (inputs: { row: ProgrammeResultRow; inEditingColumn?: boolean }) => {
    await TestBed.configureTestingModule({
      imports: [MyWorkCardComponent],
      providers: [provideRouter([])]
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
});
