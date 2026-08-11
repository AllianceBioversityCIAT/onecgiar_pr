import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ResultMetadataWindowComponent } from './result-metadata-window.component';
import { ResultMetadataListComponent } from './result-metadata-list.component';
import { ResultMetadataPanelService } from './result-metadata-panel.service';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';

describe('ResultMetadataWindowComponent', () => {
  let fixture: ComponentFixture<ResultMetadataWindowComponent>;
  let component: ResultMetadataWindowComponent;
  let panelSE: ResultMetadataPanelService;

  const apiMock = { resultsSE: { currentResultCode: 'AB-1234' } } as any;
  const dataControlMock = {
    currentResult: {
      status_name: 'Editing',
      result_level_name: 'Output',
      result_type_name: 'Innovation use',
      initiative_official_code: 'SP01',
      initiative_name: 'Multifunctional Landscapes',
      source_name: 'Pooled'
    },
    currentResultSignal: signal({})
  } as any;

  beforeEach(async () => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });

    await TestBed.configureTestingModule({
      imports: [ResultMetadataWindowComponent, ResultMetadataListComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: DataControlService, useValue: dataControlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultMetadataWindowComponent);
    component = fixture.componentInstance;
    panelSE = TestBed.inject(ResultMetadataPanelService);
  });

  it('renders nothing while the card is docked', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="result-metadata-window"]')).toBeNull();
  });

  it('renders the floating card with the six metadata fields once opened', () => {
    panelSE.open();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="result-metadata-window"]');
    expect(card).toBeTruthy();
    expect(card.querySelectorAll('dt').length).toBe(6);
    expect(card.textContent).toContain('AB-1234');
    expect(card.textContent).toContain('SP01 · Multifunctional Landscapes');
  });

  it('closing the card docks it back into the page', () => {
    panelSE.open();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="result-metadata-window-close"]').click();
    fixture.detectChanges();

    expect(panelSE.floating()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="result-metadata-window"]')).toBeNull();
  });

  it('writes the dropped position through to the service, clamped', () => {
    component.onDragEnded({ source: { getFreeDragPosition: () => ({ x: 400, y: 250 }) } } as any);
    expect(panelSE.position()).toEqual({ x: 400, y: 250 });

    component.onDragEnded({ source: { getFreeDragPosition: () => ({ x: 99999, y: 99999 }) } } as any);
    expect(panelSE.position().x).toBeLessThan(1400);
    expect(panelSE.position().y).toBeLessThan(900);
  });

  it('pulls the card back into view when the window shrinks', () => {
    component.onDragEnded({ source: { getFreeDragPosition: () => ({ x: 1000, y: 600 }) } } as any);

    Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
    component.onViewportResize();

    expect(panelSE.position()).toEqual({ x: 600 - 280 - 12, y: 500 - 210 - 12 });
  });

  it('leaves the card (and localStorage) alone when a resize does not push it out', () => {
    component.onDragEnded({ source: { getFreeDragPosition: () => ({ x: 200, y: 200 }) } } as any);
    const before = panelSE.position();
    const writes = jest.spyOn(Storage.prototype, 'setItem');

    // A window drag emits dozens of these; the card is nowhere near an edge, so none of them may
    // churn the signal or the persisted geometry.
    Object.defineProperty(window, 'innerWidth', { value: 1300, configurable: true });
    component.onViewportResize();
    component.onViewportResize();

    expect(writes).not.toHaveBeenCalled();
    // Same object identity: CDK re-applies the drag transform on every new input reference.
    expect(panelSE.position()).toBe(before);
    writes.mockRestore();
  });
});
