import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AIAssistantResult } from '../../../../../../../../shared/interfaces/AIAssistantResult';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { EXPANDED_ITEM_DETAILS, getIndicatorTypeIcon, INDICATOR_TYPE_ICONS } from '../../../../../../../../shared/constants/result-ai.constants';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { TextareaModule } from 'primeng/textarea';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';

@Component({
  selector: 'app-result-ai-item',
  templateUrl: './result-ai-item.component.html',
  styleUrl: './result-ai-item.component.scss',
  imports: [CommonModule, ButtonModule, TooltipModule, FormsModule, CustomFieldsModule, TextareaModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultAiItemComponent {
  createResultManagementService = inject(CreateResultManagementService);
  api = inject(ApiService);
  customizedAlertsFeSE = inject(CustomizedAlertsFeService);

  @Input() item!: AIAssistantResult;
  @Input() hideButtons = false;
  @Input() isLastItem = false;
  @Input() isFirstItem = false;
  @ViewChild('titleInput') titleInput!: ElementRef;
  @ViewChild('titleText') titleText!: ElementRef;
  @ViewChild('editTitleContainer') editTitleContainer!: ElementRef;

  isCreated = signal(false);
  isCreating = signal(false);

  isEditingTitle = signal(false);
  private _tempTitle = '';

  get tempTitle(): string {
    return this._tempTitle;
  }

  set tempTitle(value: string) {
    this._tempTitle = value;
    this.autoGrow();
  }

  expandedItemDetails = EXPANDED_ITEM_DETAILS;
  indicatorTypeIcon = INDICATOR_TYPE_ICONS;

  constructor(private readonly router: Router) {}

  getIndicatorTypeIcon(type: string) {
    return getIndicatorTypeIcon(type);
  }

  toggleExpand(item: AIAssistantResult) {
    this.createResultManagementService.expandedItem.set(this.createResultManagementService.expandedItem() === item ? null : item);
  }

  discardResult(item: AIAssistantResult) {
    this.createResultManagementService.items.update(items => items.filter(i => i !== item));
  }

  createResult(item: AIAssistantResult) {
    if (this.isEditingTitle()) {
      this.finishEditingTitle();
    }

    this.isCreating.set(true);

    setTimeout(() => {
      this.customizedAlertsFeSE.show({
        id: 'create-result',
        title: `Result created successfully ${item.title}`,
        description: '',
        status: 'success',
        closeIn: 500
      });
      this.isCreated.set(true);
      this.isCreating.set(false);
    }, 1000);
  }

  openResult(item: AIAssistantResult) {
    const url = `/result/${item.result_official_code}/general-information`;
    window.open(url, '_blank');
  }

  isAIAssistantResult(item: AIAssistantResult): item is AIAssistantResult {
    return 'training_type' in item;
  }

  autoGrow() {
    if (this.titleInput?.nativeElement) {
      this.titleInput.nativeElement.style.height = 'auto';
      this.titleInput.nativeElement.style.height = this.titleInput.nativeElement.scrollHeight + 'px';
    }
  }

  startEditingTitle() {
    this._tempTitle = this.item.title;
    this.isEditingTitle.set(true);

    setTimeout(() => {
      this.autoGrow();
      this.titleInput?.nativeElement?.focus();
    });
  }

  finishEditingTitle() {
    this.item.title = this._tempTitle;
    this.isEditingTitle.set(false);
  }

  cancelEditingTitle() {
    this.isEditingTitle.set(false);
  }

  getOrganizationType(item: AIAssistantResult): string[] {
    return Array.isArray(item.organization_type) ? item.organization_type : [];
  }

  getOrganizations(item: AIAssistantResult): string[] {
    return Array.isArray(item.organizations) ? item.organizations : [];
  }

  getInnovationActorsDetailed(
    item: AIAssistantResult
  ): import('../../../../../../../../shared/interfaces/AIAssistantResult').InnovationActorDetailed[] {
    return Array.isArray(item.innovation_actors_detailed) ? item.innovation_actors_detailed : [];
  }
}
