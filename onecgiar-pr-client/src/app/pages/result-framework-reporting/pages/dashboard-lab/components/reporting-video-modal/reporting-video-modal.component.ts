import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type VideoGuideTab = 'video' | 'result-types' | 'features' | 'steps';

export interface VideoChapter {
  id: string;
  timestamp: number; // in seconds
  timeLabel: string;
  title: string;
  description: string;
  icon: string;
}

export interface ResultTypeGuide {
  typeId: number;
  name: string;
  code: string;
  category: 'output' | 'outcome';
  badgeClass: string;
  icon: string;
  headline: string;
  formDynamics: string;
  keyFields: string[];
}

@Component({
  selector: 'app-reporting-video-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporting-video-modal.component.html',
  styleUrls: ['./reporting-video-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportingVideoModalComponent {
  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;

  readonly programName = input<string>('Science Program');
  readonly programCode = input<string>('');
  readonly cycleYear = input<number | string | null>(2026);

  readonly closed = output<void>();

  readonly activeTab = signal<VideoGuideTab>('video');
  readonly currentChapterId = signal<string>('aow-hlo');
  readonly isPlaying = signal<boolean>(false);

  readonly chapters: VideoChapter[] = [
    {
      id: 'aow-hlo',
      timestamp: 0,
      timeLabel: '00:00',
      title: '1. Overview & Results Structure',
      description: 'Navigate Areas of Work (AoWs), High-Level Outputs (HLOs), and review targets vs. achieved progress.',
      icon: 'folder_open'
    },
    {
      id: 'indicator-selection',
      timestamp: 16,
      timeLabel: '00:16',
      title: '2. AoWs & Indicator KPIs',
      description: 'Expand AoWs and HLOs to see granular indicators, target values, progress bars, and the Report action.',
      icon: 'touch_app'
    },
    {
      id: 'search-filters',
      timestamp: 33,
      timeLabel: '00:33',
      title: '3. Instant Search & Filters',
      description: 'Type keywords (e.g. "ciat") or use typology chips to filter 400+ indicators in real-time.',
      icon: 'search'
    },
    {
      id: 'reporting-drawer',
      timestamp: 49,
      timeLabel: '00:49',
      title: '4. Report Result & Repository Linking',
      description: 'Click "Report" to open the drawer. Search CGSpace, MELSpace & WorldFish to link publications.',
      icon: 'menu_book'
    },
    {
      id: 'favorites-views',
      timestamp: 79,
      timeLabel: '01:19',
      title: '5. Pin Indicators to Favorites',
      description: 'Click the star icon to save indicators for quick one-click filtering throughout your reporting cycle.',
      icon: 'star'
    },
    {
      id: 'dynamic-form',
      timestamp: 106,
      timeLabel: '01:46',
      title: '6. Dynamic Result Typologies',
      description: 'Learn how reporting forms customize fields automatically for each of the 6 result types.',
      icon: 'dynamic_form'
    }
  ];

  readonly resultTypes: ResultTypeGuide[] = [
    {
      typeId: 6,
      name: 'Knowledge Product',
      code: 'KP',
      category: 'output',
      badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
      icon: 'menu_book',
      headline: 'Articles, books, datasets, and reports linked via CGSpace or DOI.',
      formDynamics: 'Integrates directly with CGSpace repository search. Entering a handle or title auto-fills publication metadata, journal name, year, and author details.',
      keyFields: ['CGSpace handle / DOI', 'Publication title & authors', 'Peer-review status', 'Open access link']
    },
    {
      typeId: 7,
      name: 'Innovation Development',
      code: 'INNOV-DEV',
      category: 'output',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: 'lightbulb',
      headline: 'New technological, social, or organizational solutions under development.',
      formDynamics: 'Focuses on maturity tracking. The form requests the Innovation Readiness Level (IRL 1–9), typology of innovation, and contributing centers.',
      keyFields: ['Innovation Readiness Level (1-9)', 'Innovation typology', 'Lead developer', 'Participating centers']
    },
    {
      typeId: 1,
      name: 'Policy Change',
      code: 'POLICY',
      category: 'outcome',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: 'gavel',
      headline: 'Policy, legal, regulatory or budget changes influenced by CGIAR research.',
      formDynamics: 'Adapts to policy stages: Stage 1 (Research informing policy), Stage 2 (Official adoption/draft), or Stage 3 (Implemented policy with budget).',
      keyFields: ['Policy title & description', 'Stage of policy process', 'Policy owner institution', 'Geographic scope']
    },
    {
      typeId: 5,
      name: 'Capacity Sharing for Dev.',
      code: 'CAP-DEV',
      category: 'output',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: 'school',
      headline: 'Training, degree programs, and organizational capacity development.',
      formDynamics: 'Collects structured beneficiary counts disaggregated by gender (female, male, non-binary) and partner institutions capacitated.',
      keyFields: ['Training duration (short/long)', 'Trainee count (by gender)', 'Institutions capacitated', 'Training topic']
    },
    {
      typeId: 2,
      name: 'Innovation Use',
      code: 'INNOV-USE',
      category: 'outcome',
      badgeClass: 'bg-green-100 text-green-800 border-green-200',
      icon: 'trending_up',
      headline: 'Adoption and application of innovations by farmers, partners, and institutions.',
      formDynamics: 'Measures uptake reach: number of beneficiaries reached, gender/youth disaggregation, and scaling partners facilitating adoption.',
      keyFields: ['Beneficiaries reached', 'Disaggregation (youth/gender)', 'Adoption organizations', 'Linked innovations']
    },
    {
      typeId: 8,
      name: 'Other Output / Outcome',
      code: 'OTHER',
      category: 'output',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: 'inventory_2',
      headline: 'Research deliverables and intermediate outcomes not classified above.',
      formDynamics: 'A streamlined standard form capturing title, narrative summary, contributing partners, and verifiable evidence links.',
      keyFields: ['Deliverable title', 'Narrative description', 'Contributing partners', 'Evidence URLs']
    }
  ];

  readonly activeChapter = computed(() => {
    return this.chapters.find(c => c.id === this.currentChapterId()) ?? this.chapters[0];
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  setTab(tab: VideoGuideTab): void {
    this.activeTab.set(tab);
  }

  playVideo(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) {
      video.play().catch(() => {});
      this.isPlaying.set(true);
    }
  }

  seekToChapter(chapter: VideoChapter): void {
    this.currentChapterId.set(chapter.id);
    const video = this.videoPlayerRef?.nativeElement;
    if (video) {
      video.currentTime = chapter.timestamp;
      video.play().catch(() => {});
      this.isPlaying.set(true);
    }
  }

  onVideoPlay(): void {
    this.isPlaying.set(true);
  }

  onVideoPause(): void {
    this.isPlaying.set(false);
  }

  close(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (video) {
      try {
        video.pause();
      } catch {
        // Video may already be paused or unloaded in testing environments
      }
    }
    this.closed.emit();
  }
}
