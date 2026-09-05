// @akili-spec changes/my-work-board (MWB-T-4, MWB-R-2, R-11)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyWorkColumnComponent } from './my-work-column.component';
import { MyWorkColumn } from '../../my-work.view-model';
import { ProgrammeResultRow } from '../../../programme-results/services/programme-results.service';

function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  return {
    id: 1,
    code: '4712',
    title: 'A result',
    category: 'Knowledge product',
    statusId: 1,
    statusName: 'Editing',
    resultTypeId: 6,
    createdBy: '',
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

function column(partial: Partial<MyWorkColumn> = {}): MyWorkColumn {
  return { key: 'editing', label: 'Editing', group: 'action', rows: [], ...partial };
}

describe('MyWorkColumnComponent', () => {
  let fixture: ComponentFixture<MyWorkColumnComponent>;
  let component: MyWorkColumnComponent;

  const build = async (inputs: { column: MyWorkColumn; rail?: boolean; collapsed?: boolean }) => {
    await TestBed.configureTestingModule({
      imports: [MyWorkColumnComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(MyWorkColumnComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('column', inputs.column);
    if (inputs.rail !== undefined) fixture.componentRef.setInput('rail', inputs.rail);
    if (inputs.collapsed !== undefined) fixture.componentRef.setInput('collapsed', inputs.collapsed);
    fixture.detectChanges();
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  describe('expanded (region) mode', () => {
    it('renders the header dot, label and count, and role=region + aria-labelledby', async () => {
      await build({ column: column({ key: 'pending', label: 'Pending review', rows: [row(), row({ code: '4701' })] }) });

      const section = root().querySelector('section') as HTMLElement;
      expect(section.getAttribute('role')).toBe('region');
      const labelledBy = section.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(root().querySelector(`#${labelledBy}`)?.textContent?.trim()).toBe('Pending review');
      expect(text()).toContain('2');
    });

    it('gives the list flex-1 min-h-0 overflow-y-auto so it scrolls inside itself (SAV contract)', async () => {
      await build({ column: column({ rows: [row()] }) });

      const list = root().querySelector('section > div:nth-child(2)') as HTMLElement;
      expect(list.className).toContain('flex-1');
      expect(list.className).toContain('min-h-0');
      expect(list.className).toContain('overflow-y-auto');
    });

    it('shows the per-column empty message when there are no rows', async () => {
      await build({ column: column({ label: 'Editing', rows: [] }) });

      expect(text()).toContain('Nothing in Editing yet.');
      expect(root().querySelectorAll('app-my-work-card').length).toBe(0);
    });

    it('shows the "k ready to submit" hint only for the Editing column with ready rows', async () => {
      await build({
        column: column({
          key: 'editing',
          rows: [row({ completeness: { complete: 5, total: 5, missing: [] } }), row({ code: '4701', completeness: { complete: 2, total: 5, missing: ['evidences'] } })]
        })
      });

      expect(text()).toContain('1 ready to submit');
    });

    it('does not show the ready hint on a non-Editing column', async () => {
      await build({ column: column({ key: 'submitted', label: 'Submitted', rows: [row({ completeness: { complete: 5, total: 5, missing: [] } })] }) });

      expect(text()).not.toContain('ready to submit');
    });
  });

  describe('rail (collapsed) mode', () => {
    it('renders a 44px aria-expanded button carrying the count and the vertical label', async () => {
      await build({ column: column({ key: 'approved', label: 'Approved', rows: [row(), row({ code: '2' }), row({ code: '3' }), row({ code: '4' }) ] }), rail: true, collapsed: true });

      const btn = root().querySelector('button') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.className).toContain('w-[44px]');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.textContent).toContain('4');
      expect(btn.textContent).toContain('Approved');
      expect(root().querySelector('section')).toBeNull();
    });

    it('reflects collapsed=false as aria-expanded=true', async () => {
      await build({ column: column(), rail: true, collapsed: false });

      expect((root().querySelector('button') as HTMLButtonElement).getAttribute('aria-expanded')).toBe('true');
    });

    it('emits toggle on click', async () => {
      await build({ column: column(), rail: true });
      const spy = jest.fn();
      component.expandToggle.subscribe(spy);

      (root().querySelector('button') as HTMLButtonElement).click();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
