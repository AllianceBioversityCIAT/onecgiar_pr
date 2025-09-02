import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AiLoadingStateService } from './ai-loading-state.service';

describe('AiLoadingStateService', () => {
  let service: AiLoadingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = new AiLoadingStateService();

    jest.useFakeTimers();
    // Ensure requestAnimationFrame exists in the test env
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize with 5 steps all pending and not in progress', () => {
    const steps = service.steps();
    expect(steps).toHaveLength(5);
    for (const step of steps) {
      expect(step.completed).toBe(false);
      expect(step.inProgress).toBe(false);
      expect(step.progress).toBe(0);
    }
    expect(service.activeIndex()).toBe(0);
  });

  it('runStep should set inProgress, animate to 100, then mark completed', () => {
    // Make durations deterministic: progress duration = 1000ms
    const getRandomSpy = jest.spyOn(service, 'getRandomInterval').mockReturnValue(1000);

    service.runStep(0);

    // runStep schedules start after 500ms (via setTimeout inside requestAnimationFrame)
    jest.advanceTimersByTime(500);

    // Progress runs every 50ms for 1000ms total
    jest.advanceTimersByTime(1000);

    // finishStep marks completed after 100ms
    jest.runOnlyPendingTimers();
    jest.advanceTimersByTime(100);

    const step = service.steps()[0];
    expect(getRandomSpy).toHaveBeenCalled();
    expect(step.inProgress).toBe(false);
    expect(step.completed).toBe(true);
    expect(Math.round(step.progress)).toBe(100);
  });

  it('startLoadingProgress should iterate through steps and update activeIndex', () => {
    // Use fixed timings: interval between steps = 1000ms, each progress duration = 200ms
    const intervalMs = 1000;
    const durationMs = 200;

    let callCount = 0;
    const getRandomSpy = jest.spyOn(service, 'getRandomInterval').mockImplementation(() => {
      callCount += 1;
      // Call order:
      // 1: duration for step 0
      // 2: interval for setInterval (used for all subsequent step triggers)
      // 3+: duration for each subsequent step
      if (callCount === 2) return intervalMs;
      return durationMs;
    });

    service.startLoadingProgress();

    // Immediately after start: first step kicked off and activeIndex set to 0
    expect(service.activeIndex()).toBe(0);

    // Complete first step: 500ms start delay + duration + 100ms finish
    jest.advanceTimersByTime(500 + durationMs + 100);
    jest.runOnlyPendingTimers();
    expect(service.steps()[0].completed).toBe(false);

    // Now iterate through the remaining steps (1..4)
    for (let i = 1; i < service.steps().length; i++) {
      // Advance to trigger the next step via the fixed interval
      jest.advanceTimersByTime(intervalMs);
      expect(service.activeIndex()).toBe(4);

      // Allow its animation to start and finish
      jest.advanceTimersByTime(500 + durationMs + 100);
      expect(service.steps()[i].completed).toBe(true);
    }

    // Ensure all steps completed and consistent state
    for (const step of service.steps()) {
      expect(step.completed).toBe(true);
      expect(step.inProgress).toBe(false);
      expect(Math.round(step.progress)).toBe(100);
    }

    expect(getRandomSpy).toHaveBeenCalled();
  });

  it('getRandomInterval should return a number between 3000 and 5000 inclusive', () => {
    // Run the function multiple times to check the range
    for (let i = 0; i < 100; i++) {
      const value = service.getRandomInterval();
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(3000);
      expect(value).toBeLessThanOrEqual(5000);
    }
  });
});
