import { TestBed } from '@angular/core/testing';
import { METADATA_PANEL_HEIGHT, METADATA_PANEL_WIDTH, ResultMetadataPanelService } from './result-metadata-panel.service';

const KEY = 'pr-result-metadata-panel';

/** jsdom reports 1024×768 by default; these tests pin it so the clamp maths is deterministic. */
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
};

const build = () => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ResultMetadataPanelService);
};

describe('ResultMetadataPanelService', () => {
  beforeEach(() => {
    localStorage.clear();
    setViewport(1400, 900);
  });

  it('starts docked, at a default position inside the viewport', () => {
    const service = build();
    expect(service.floating()).toBe(false);
    expect(service.position()).toEqual({ x: 1400 - METADATA_PANEL_WIDTH - 24, y: 96 });
  });

  it('open / close / toggle flip the docked state and persist it', () => {
    const service = build();

    service.open();
    expect(service.floating()).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY) as string).floating).toBe(true);

    service.close();
    expect(service.floating()).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY) as string).floating).toBe(false);

    service.toggle();
    expect(service.floating()).toBe(true);
    service.toggle();
    expect(service.floating()).toBe(false);
  });

  it('clamps a dropped position against the viewport', () => {
    const service = build();

    // Dragged past the right/bottom edges.
    service.setPosition({ x: 99999, y: 99999 });
    expect(service.position()).toEqual({ x: 1400 - METADATA_PANEL_WIDTH - 12, y: 900 - METADATA_PANEL_HEIGHT - 12 });

    // Dragged past the top/left edges.
    service.setPosition({ x: -500, y: -500 });
    expect(service.position()).toEqual({ x: 12, y: 12 });
  });

  it('tolerates a position with missing coordinates', () => {
    const service = build();
    service.setPosition({} as any);
    expect(service.position()).toEqual({ x: 12, y: 12 });
  });

  it('round-trips the position through localStorage', () => {
    const first = build();
    first.setPosition({ x: 300, y: 200 });
    first.open();

    const second = build();
    expect(second.position()).toEqual({ x: 300, y: 200 });
    expect(second.floating()).toBe(true);
  });

  it('re-clamps a stored position that no longer fits the viewport', () => {
    // Saved on a wide monitor…
    setViewport(2560, 1440);
    build().setPosition({ x: 2200, y: 1200 });

    // …restored on a laptop: without the clamp on READ the card would be off-screen for good.
    setViewport(1200, 700);
    const service = build();
    expect(service.position()).toEqual({ x: 1200 - METADATA_PANEL_WIDTH - 12, y: 700 - METADATA_PANEL_HEIGHT - 12 });
  });

  it('falls back to the default when the stored value is malformed', () => {
    localStorage.setItem(KEY, '{not json');
    expect(build().position()).toEqual({ x: 1400 - METADATA_PANEL_WIDTH - 24, y: 96 });

    localStorage.setItem(KEY, JSON.stringify({ floating: true, position: { x: 'left' } }));
    const service = build();
    expect(service.floating()).toBe(true);
    expect(service.position()).toEqual({ x: 1400 - METADATA_PANEL_WIDTH - 24, y: 96 });
  });

  it('stays session-only when localStorage refuses to write', () => {
    const service = build();
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => service.setPosition({ x: 100, y: 100 })).not.toThrow();
    expect(service.position()).toEqual({ x: 100, y: 100 });

    setItem.mockRestore();
  });
});
