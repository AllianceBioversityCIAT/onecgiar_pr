import { Injectable, signal } from '@angular/core';
import { Step } from '../../../result-ai-assistant.component';

@Injectable({
  providedIn: 'root'
})
export class AiLoadingStateService {
  steps = signal<Step[]>([
    { label: 'Uploading document', completed: false, inProgress: false, progress: 0 },
    { label: 'Reading content', completed: false, inProgress: false, progress: 0 },
    { label: 'Analyzing text', completed: false, inProgress: false, progress: 0 },
    { label: 'Finding relevant content', completed: false, inProgress: false, progress: 0 },
    { label: 'Generating response', completed: false, inProgress: false, progress: 0 }
  ]);

  activeIndex = signal<number>(0);

  startLoadingProgress(): void {
    let currentStep = 0;

    this.runStep(currentStep);
    this.activeIndex.set(currentStep);
    currentStep++;

    const stepInterval = setInterval(() => {
      if (currentStep < this.steps().length) {
        this.runStep(currentStep);
        this.activeIndex.set(currentStep);
        currentStep++;
      } else {
        clearInterval(stepInterval);
      }
    }, this.getRandomInterval());
  }

  runStep(index: number): void {
    const step = this.steps()[index];
    step.inProgress = true;
    step.progress = 0;

    this.updateStep(index, step);

    requestAnimationFrame(() => {
      setTimeout(() => this.startProgressAnimation(index, step), 500);
    });
  }

  private startProgressAnimation(index: number, step: Step): void {
    const duration = this.getRandomInterval();
    const interval = 50;
    const increment = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      if (step.progress < 100) {
        step.progress = Math.min(step.progress + increment, 100);
        this.updateStep(index, step);
      } else {
        clearInterval(progressTimer);
        this.finishStep(index, step);
      }
    }, interval);
  }

  private finishStep(index: number, step: Step): void {
    setTimeout(() => {
      step.inProgress = false;
      step.completed = true;
      this.updateStep(index, step);
    }, 100);
  }

  private updateStep(index: number, step: Step): void {
    this.steps.update(steps => {
      steps[index] = { ...step };
      return [...steps];
    });
  }

  getRandomInterval(): number {
    return Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
  }

  stopLoadingProgress(): void {
    this.steps.update(steps =>
      steps.map(step => ({
        ...step,
        completed: false,
        inProgress: false,
        progress: 0
      }))
    );
    this.activeIndex.set(0);
  }
}
