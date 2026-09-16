import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HideChromeOnScrollDirective } from './hide-chrome-on-scroll.directive';
import { ScrollChromeService } from '../services/scroll-chrome.service';

describe('HideChromeOnScrollDirective', () => {
  let host: HTMLDivElement;
  let directive: HideChromeOnScrollDirective;
  let chrome: ScrollChromeService;
  let nowMs: number;

  const scrollTo = (top: number) => {
    host.scrollTop = top;
    directive.onScroll();
  };

  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
    nowMs = 10_000;
    jest.spyOn(performance, 'now').mockImplementation(() => nowMs);

    host = document.createElement('div');
    document.body.appendChild(host);

    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(host) }]
    });
    chrome = TestBed.inject(ScrollChromeService);
    chrome.reset();
    directive = TestBed.runInInjectionContext(() => new HideChromeOnScrollDirective());
  });

  afterEach(() => {
    host.remove();
    jest.restoreAllMocks();
  });

  it('folds the chrome when the user reads downwards', () => {
    scrollTo(100);
    expect(chrome.hidden()).toBe(true);
  });

  it('leaves the chrome alone while a dropdown inside the page has focus', () => {
    host.innerHTML = '<div class="custom_select"><a class="field" tabindex="0"><input type="checkbox" /></a></div>';
    host.querySelector('input').focus();

    scrollTo(100);
    expect(chrome.hidden()).toBe(false);

    // Once the list closes, the position it left behind is the baseline: no jump is replayed.
    (document.activeElement as HTMLElement).blur();
    nowMs += 1000;
    scrollTo(105);
    expect(chrome.hidden()).toBe(false);
  });

  it('still folds when focus is in a field that is not a dropdown', () => {
    host.innerHTML = '<input type="text" />';
    host.querySelector('input').focus();

    scrollTo(100);
    expect(chrome.hidden()).toBe(true);
  });
});
