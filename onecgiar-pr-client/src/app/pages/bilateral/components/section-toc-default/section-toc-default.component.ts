import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeftRight, lucideBuilding2, lucideCheck, lucideChevronDown, lucideChevronUp, lucideCircleCheck, lucideShapes, lucideTarget, lucideWorkflow } from '@ng-icons/lucide';
import { HlmButton } from '@spartan/button';
import { CentersService } from '../../../../shared/services/global/centers.service';

export interface ProjectDefaultIndicatorTarget {
  year: number;
  value: number | null;
  // Present when this target row is broken down by CGIAR center (toc_result_indicator_target_center);
  // absent/empty for a project- or indicator-general target. Ids are CLARISA institutionId, matching
  // CenterDto.institutionId (post-implementation audit, 2026-09-18).
  center_ids?: number[];
}

export interface ProjectDefaultIndicator {
  id: number | string;
  description?: string | null;
  type?: string | null;
  targets?: ProjectDefaultIndicatorTarget[];
}

export interface ProjectDefaultNode {
  toc_result_id: number | string;
  toc_level_id?: number | null;
  level_name?: string | null; // e.g. 'OUTPUT', 'OUTCOME', 'EOI'
  title?: string | null;
  indicators?: ProjectDefaultIndicator[];
}

export interface ProjectDefault {
  project_id: number;
  project_name?: string | null;
  nodes: ProjectDefaultNode[];
}

/** One summary stat card in the hub header — always derived from real `projectDefault` data, never invented. */
export interface ProjectDefaultStat {
  label: string;
  value: string;
  hint: string;
}

@Component({
  selector: 'app-section-toc-default',
  standalone: true,
  imports: [CommonModule, HlmButton, NgIcon],
  providers: [
    provideIcons({
      lucideWorkflow,
      lucideCircleCheck,
      lucideShapes,
      lucideTarget,
      lucideBuilding2,
      lucideChevronDown,
      lucideChevronUp,
      lucideCheck,
      lucideArrowLeftRight,
    }),
  ],
  templateUrl: './section-toc-default.component.html',
  styleUrl: './section-toc-default.component.scss',
})
export class SectionTocDefaultComponent {
  private readonly centersSE = inject(CentersService);

  readonly projectDefault = input<ProjectDefault | null>(null);
  readonly mode = input<'project_default' | 'custom' | string | null>(null);
  readonly readOnly = input<boolean>(false);

  readonly modeChange = output<'project_default' | 'custom'>();

  readonly isYesSelected = computed(() => this.mode() === 'project_default');
  readonly isNoSelected = computed(() => this.mode() === 'custom');

  /** Full node/indicator/target breakdown starts collapsed — the hub summary is the default view. */
  readonly showBreakdown = signal(false);

  readonly nodes = computed(() => this.projectDefault()?.nodes ?? []);
  readonly indicatorCount = computed(() =>
    this.nodes().reduce((total, node) => total + (node.indicators?.length ?? 0), 0),
  );

  /** Distinct CGIAR center institutionIds referenced by any target across all nodes/indicators. */
  private readonly centerIds = computed(() => {
    const ids = new Set<number>();
    for (const node of this.nodes()) {
      for (const indicator of node.indicators ?? []) {
        for (const target of indicator.targets ?? []) {
          for (const id of target.center_ids ?? []) {
            ids.add(id);
          }
        }
      }
    }
    return Array.from(ids);
  });

  readonly stats = computed<ProjectDefaultStat[]>(() => {
    const nodes = this.nodes();
    const levelCounts = new Map<string, number>();
    for (const node of nodes) {
      const level = node.level_name ?? 'Node';
      levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
    }
    const nodesHint = Array.from(levelCounts.entries())
      .map(([level, count]) => `${count} ${level}${count > 1 ? 's' : ''}`)
      .join(' · ');

    const centerIds = this.centerIds();
    const centerNames = this.centerAcronyms(centerIds);
    const centersHint =
      centerNames.length > 3 ? `${centerNames.slice(0, 3).join(', ')}, +${centerNames.length - 3} more` : centerNames.join(', ');

    return [
      { label: 'ToC nodes', value: `${nodes.length}`, hint: nodesHint || 'No nodes linked' },
      { label: 'Indicators', value: `${this.indicatorCount()}`, hint: 'Across every linked node' },
      { label: 'CGIAR centers', value: `${centerIds.length}`, hint: centersHint || 'No center breakdown available' },
    ];
  });

  onSelectMode(selected: 'project_default' | 'custom'): void {
    if (this.readOnly()) {
      return;
    }
    this.modeChange.emit(selected);
  }

  toggleBreakdown(): void {
    this.showBreakdown.update((v) => !v);
  }

  /** CLARISA center names for a target's `center_ids`, or '' when the target is not center-specific. */
  centerLabel(centerIds: number[] | undefined): string {
    if (!centerIds?.length) {
      return '';
    }
    return this.centerAcronyms(centerIds).join(', ');
  }

  private centerAcronyms(centerIds: number[]): string[] {
    const centers = this.centersSE.centersList ?? [];
    return centerIds.map((id) => centers.find((c) => c.institutionId === id)?.acronym ?? `Center #${id}`);
  }
}
