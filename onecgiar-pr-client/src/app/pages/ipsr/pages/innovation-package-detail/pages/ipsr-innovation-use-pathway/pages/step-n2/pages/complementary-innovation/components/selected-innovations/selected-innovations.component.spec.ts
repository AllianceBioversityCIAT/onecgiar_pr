import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SelectedInnovationsComponent } from './selected-innovations.component';

describe('SelectedInnovationsComponent (P2-3840)', () => {
  let fixture: ComponentFixture<SelectedInnovationsComponent>;
  let component: SelectedInnovationsComponent;
  const q = (sel: string) => fixture.nativeElement.querySelectorAll(sel) as NodeListOf<HTMLElement>;

  const created = { result_id: '1', result_code: '9651', title: 'New complementary', result_type_id: 11, initiative_official_code: 'SP13' };
  const development = { result_id: '2', result_code: '9398', title: 'Innovation development', result_type_id: 7, initiative_official_code: 'SP03' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedInnovationsComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(SelectedInnovationsComponent);
    component = fixture.componentInstance;
  });

  const render = async (items: any[], readOnly = false) => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('readOnly', readOnly);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('shows the empty state and a zero counter when nothing is selected', async () => {
    await render([]);
    expect(q('[data-testid="selected-innovation"]').length).toBe(0);
    expect(q('[data-testid="selected-innovations-empty"]').length).toBe(1);
    expect(q('[data-testid="selected-counter"]')[0].textContent.trim()).toBe('0 selected');
  });

  it('renders one card per selected item with code, title and lead', async () => {
    await render([created, development]);
    const cards = q('[data-testid="selected-innovation"]');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('9651');
    expect(cards[0].textContent).toContain('New complementary');
    expect(cards[0].textContent).toContain('SP13');
    expect(q('[data-testid="selected-counter"]')[0].textContent.trim()).toBe('2 selected');
  });

  it('keeps the old icon rule: edit for a created entry, view for an Innovation Development or a read-only user', () => {
    expect(component.isViewOnly(created)).toBe(false);
    expect(component.isViewOnly(development)).toBe(true);
    component.readOnly = true;
    expect(component.isViewOnly(created)).toBe(true);
  });

  it('emits the clicked item on open and on remove', async () => {
    await render([created]);
    const opened = jest.fn();
    const removed = jest.fn();
    component.openEvent.subscribe(opened);
    component.removeEvent.subscribe(removed);
    q('[data-testid="selected-innovation-open"]')[0].click();
    q('[data-testid="selected-innovation-remove"]')[0].click();
    expect(opened).toHaveBeenCalledWith(created);
    expect(removed).toHaveBeenCalledWith(created);
  });

  it('hides the remove button for a read-only user', async () => {
    await render([created], true);
    expect(q('[data-testid="selected-innovation-open"]').length).toBe(1);
    expect(q('[data-testid="selected-innovation-remove"]').length).toBe(0);
  });
});
