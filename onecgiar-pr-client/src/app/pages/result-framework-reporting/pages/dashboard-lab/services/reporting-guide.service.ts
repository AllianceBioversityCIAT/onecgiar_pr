import { Injectable } from '@angular/core';
import { driver, DriveStep, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/** What the tutorials need to know about the screen they are about to explain. */
export interface GuideContext {
  hasMyPrograms: boolean;
  hasOtherPrograms: boolean;
  /** A program is open, so its blocks are on screen. */
  hasSelectedProgram: boolean;
  hasAows: boolean;
  hasCategories: boolean;
  hasCenters: boolean;
  /** An Area of Work is open, so the indicator list is on screen. */
  inAowView: boolean;
  hasIndicators: boolean;
}

export type TutorialId = 'basics' | 'planned' | 'emerging' | 'guided';

export interface Tutorial {
  id: TutorialId;
  title: string;
  summary: string;
  icon: string;
  length: string;
}

/** What a step is parked on, waiting for the user to actually do it. */
type Waiting = 'program' | 'aow' | null;

/**
 * The reporting tutorials.
 *
 * Not one tour but a small catalogue, because "how do I report?" has more than one
 * answer: the direct route through an Area of Work, the emerging route, and the
 * guided flow. Each is BUILT FROM THE SCREEN rather than hardcoded — driver.js
 * silently skips a step whose element is missing, which turns a tutorial into a
 * sequence of unexplained jumps for anyone whose account looks different (no
 * programs of their own, a program with no Areas of Work, no Center role).
 *
 * Steps that ask the user to DO something hide their "Next" and wait: the screen
 * calls `notify()` when it happens, and the remaining steps are rebuilt from the
 * new context, since the elements they describe did not exist a moment earlier.
 */
@Injectable({ providedIn: 'root' })
export class ReportingGuideService {
  private instance: Driver | null = null;
  private waitingFor: Waiting = null;
  private current: TutorialId = 'basics';
  /** Acting on a step re-renders the page and tears driver.js down; we resume. */
  private resumeAfter: Waiting = null;

  readonly catalogue: Tutorial[] = [
    {
      id: 'basics',
      title: 'How reporting works here',
      summary: 'The lay of the land: programs, planned indicators, emerging results and where each action lives.',
      icon: 'explore',
      length: '5 stops'
    },
    {
      id: 'planned',
      title: 'Report against a planned indicator',
      summary: 'From the program down to the exact indicator, including what you find inside an Area of Work.',
      icon: 'flag',
      length: '7 stops'
    },
    {
      id: 'emerging',
      title: 'Report an emerging result',
      summary: 'For results nobody planned: where the categories are and how they differ from the Theory of Change.',
      icon: 'bolt',
      length: '4 stops'
    },
    {
      id: 'guided',
      title: 'Use the guided flow',
      summary: 'When you are not sure which kind it is: one question at a time, every choice confirmed before it applies.',
      icon: 'auto_awesome',
      length: '3 stops'
    }
  ];

  start(id: TutorialId, ctx: GuideContext): void {
    this.current = id;
    this.resumeAfter = null;
    const steps = this.build(id, ctx);
    if (!steps.length) return;
    this.instance = this.createDriver(steps);
    this.instance.drive();
  }

  /** The screen telling the tutorial what the user just did. */
  notify(event: 'program-selected' | 'aow-opened', ctx: GuideContext): void {
    const expected: Waiting = event === 'program-selected' ? 'program' : 'aow';
    if (this.waitingFor !== expected && this.resumeAfter !== expected) return;

    this.waitingFor = null;
    this.resumeAfter = null;
    this.instance?.destroy();

    const steps = this.build(this.current, ctx);
    const marker = event === 'program-selected' ? 'after-program' : 'after-aow';
    const resumeAt = steps.findIndex(step => (step.popover as any)?.__resume === marker);
    this.instance = this.createDriver(steps);
    this.instance.drive(resumeAt >= 0 ? resumeAt : 0);
  }

  private createDriver(steps: DriveStep[]): Driver {
    return driver({
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Got it',
      overlayColor: '#1e202f',
      overlayOpacity: 0.68,
      stagePadding: 6,
      stageRadius: 14,
      popoverClass: 'pr-guide',
      allowClose: true,
      // Steps that ask for an action must let the user perform it.
      disableActiveInteraction: false,
      onDestroyed: () => {
        this.resumeAfter = this.waitingFor;
        this.instance = null;
        this.waitingFor = null;
      },
      onHighlightStarted: element => {
        const anchor = element?.getAttribute('data-guide') ?? '';
        this.waitingFor = anchor.endsWith('programs') ? 'program' : anchor === 'aow-action' ? 'aow' : null;
      },
      steps
    });
  }

  // -------------------------------------------------------------------------

  private build(id: TutorialId, ctx: GuideContext): DriveStep[] {
    switch (id) {
      case 'planned':
        return this.plannedTutorial(ctx);
      case 'emerging':
        return this.emergingTutorial(ctx);
      case 'guided':
        return this.guidedTutorial();
      default:
        return this.basicsTutorial(ctx);
    }
  }

  /** A step that asks the user to act: no "Next", only doing it or closing. */
  private actionStep(element: string, title: string, description: string): DriveStep {
    return { element, popover: { title, description, side: 'right', align: 'start', showButtons: ['close'] } };
  }

  private pickProgramStep(ctx: GuideContext): DriveStep | null {
    if (ctx.hasMyPrograms) {
      return this.actionStep(
        '[data-guide="my-programs"]',
        'Start with your program',
        'These are the Science Programs you belong to. Pick one now — the tutorial continues as soon as you do, using that program.'
      );
    }
    if (ctx.hasOtherPrograms) {
      return this.actionStep(
        '[data-guide="other-programs"]',
        'Start with a program',
        'You are not a member of any Science Program yet, so your own list is empty. Open "Other programs" and pick one — the tutorial continues as soon as you do.'
      );
    }
    return null;
  }

  // ---- 1. basics ----------------------------------------------------------
  private basicsTutorial(ctx: GuideContext): DriveStep[] {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'How reporting works here',
          description:
            'Every result belongs to a Science Program. You pick the program first, then say whether the result was planned in its Theory of Change or emerged along the way. This tour shows where each of those lives.'
        }
      }
    ];

    const pick = this.pickProgramStep(ctx);
    if (pick) steps.push(pick);

    if (ctx.hasSelectedProgram && ctx.hasAows) {
      steps.push({
        element: '[data-guide="planned"]',
        popover: {
          title: 'Results planned in the ToC',
          description: 'The Areas of Work of this program, each holding the indicators it committed to for the phase. Progress reported here counts toward those targets.',
          side: 'right',
          align: 'start',
          __resume: 'after-program'
        } as any
      });
    }

    if (ctx.hasSelectedProgram && ctx.hasCategories) {
      steps.push({
        element: '[data-guide="emerging"]',
        popover: {
          title: 'Emerging results',
          description: 'Results nobody planned. They still count — they are simply recorded outside the committed indicators.',
          side: 'left',
          align: 'start'
        }
      });
    }

    steps.push({
      element: '[data-guide="guided-entry"]',
      popover: {
        title: 'Not sure which one it is?',
        description: 'The guided flow asks whether the result was planned or emerging, explains the difference with examples, and walks you to the right place.',
        side: 'bottom'
      }
    });

    if (ctx.hasCenters) {
      steps.push({
        element: '[data-guide="centers"]',
        popover: {
          title: 'Reporting for a Center',
          description: 'You also hold a role in a CGIAR Center. Bilateral results are reported from here, separately from the Science Program flow.',
          side: 'left'
        }
      });
    }

    steps.push({
      popover: {
        title: "That's the lay of the land",
        description: 'The other tutorials walk each route end to end. You can reopen them any time from "Not sure how to report?".'
      }
    });

    return steps;
  }

  // ---- 2. planned: continues INSIDE the Area of Work -----------------------
  private plannedTutorial(ctx: GuideContext): DriveStep[] {
    const steps: DriveStep[] = [];

    if (!ctx.inAowView) {
      steps.push({
        popover: {
          title: 'Reporting against a planned indicator',
          description: 'A planned result contributes to an indicator your program already committed to. We will go from the program all the way down to that indicator.'
        }
      });

      const pick = this.pickProgramStep(ctx);
      if (pick) steps.push(pick);

      if (ctx.hasSelectedProgram && ctx.hasAows) {
        steps.push({
          element: '[data-guide="planned"]',
          popover: {
            title: 'Its Areas of Work',
            description: 'Each Area of Work groups a set of committed indicators. Your result belongs to exactly one of them.',
            side: 'right',
            align: 'start',
            __resume: 'after-program'
          } as any
        });
        steps.push(
          this.actionStep('[data-guide="aow-action"]', 'Open one', 'Open the Area of Work your result contributes to — the tutorial continues inside, on its indicator list.')
        );
      } else if (ctx.hasSelectedProgram) {
        steps.push({
          element: '[data-guide="planned"]',
          popover: {
            title: 'No Areas of Work yet',
            description: 'This program has no Areas of Work loaded, so it has no planned indicators to report against right now.',
            side: 'right',
            __resume: 'after-program'
          } as any
        });
      }

      return steps;
    }

    // ---- inside the Area of Work ----
    steps.push({
      element: '[data-guide="aow-header"]',
      popover: {
        title: 'Inside the Area of Work',
        description: 'Everything this Area of Work committed to, and how much has been reported so far. High-Level Outputs and Outcomes are separate tabs.',
        side: 'bottom',
        align: 'start',
        __resume: 'after-aow'
      } as any
    });

    steps.push({
      element: '[data-guide="aow-search"]',
      popover: {
        title: 'Find your indicator',
        description: 'Search by wording, or filter by typology and status. Long lists are the norm here — this is how you avoid scrolling through all of them.',
        side: 'bottom',
        align: 'start'
      }
    });

    if (ctx.hasIndicators) {
      steps.push({
        element: '[data-guide="aow-group"]',
        popover: {
          title: 'Grouped by High-Level Output',
          description: 'Indicators sit under the HLO they belong to. Collapse the groups that are not yours to shorten the list.',
          side: 'bottom',
          align: 'start'
        }
      });
      steps.push({
        element: '[data-guide="aow-indicator"]',
        popover: {
          title: 'Report against this one',
          description: 'Each row shows its target and what has been achieved. Hovering a row reveals its actions — that is where you report your result.',
          side: 'bottom',
          align: 'start'
        }
      });
    }

    steps.push({
      popover: {
        title: "That's the planned route",
        description: 'Program → Area of Work → indicator. The guided flow asks the same three questions one at a time if you prefer being walked through it.'
      }
    });

    return steps;
  }

  // ---- 3. emerging --------------------------------------------------------
  private emergingTutorial(ctx: GuideContext): DriveStep[] {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Reporting an emerging result',
          description:
            'Emerging results were never planned in the Theory of Change — a government adopting one of your tools, for instance. They still count; they are simply recorded outside the committed indicators.'
        }
      }
    ];

    const pick = this.pickProgramStep(ctx);
    if (pick) steps.push(pick);

    if (ctx.hasSelectedProgram && ctx.hasCategories) {
      steps.push({
        element: '[data-guide="emerging"]',
        popover: {
          title: 'Pick the category',
          description: 'Emerging results are filed by category — knowledge product, innovation development, capacity sharing, policy change. Pick the one that matches what happened.',
          side: 'left',
          align: 'start',
          __resume: 'after-program'
        } as any
      });
      steps.push({
        element: '[data-guide="emerging-action"]',
        popover: {
          title: 'Start it',
          description: 'This opens the guided flow with that category already chosen, so you only answer what is left.',
          side: 'top'
        }
      });
    }

    steps.push({
      popover: {
        title: "That's the emerging route",
        description: 'No Area of Work, no indicator — just the program and the category the result belongs to.'
      }
    });

    return steps;
  }

  // ---- 4. the guided flow -------------------------------------------------
  private guidedTutorial(): DriveStep[] {
    return [
      {
        popover: {
          title: 'The guided flow',
          description: 'For when you are not sure which kind of result you have, or where it belongs. It asks one question at a time and explains each choice.'
        }
      },
      {
        element: '[data-guide="guided-entry"]',
        popover: {
          title: 'Start from here',
          description: 'The flow opens full screen. It asks planned or emerging first — with an example of each — then the program, the Area of Work and the indicator.',
          side: 'bottom'
        }
      },
      {
        popover: {
          title: 'Nothing is decided by accident',
          description:
            'Selecting an option never applies it: a panel explains what the choice means and you confirm it. Every answer stays editable from the trail at the top until you finish.'
        }
      }
    ];
  }
}
