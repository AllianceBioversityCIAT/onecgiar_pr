import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-alert-status',
    templateUrl: './alert-status.component.html',
    styleUrls: ['./alert-status.component.scss'],
    standalone: false
})
export class AlertStatusComponent {
  @Input() status: 'info' | 'warning' | 'success' | 'error' = 'info';
  @Input() description: string = '';
  @Input() inlineStyles?: string = '';
  /**
   * Overrides the glyph the status would pick. The mockup marks every AI note with the sparkle
   * (`auto_awesome`) rather than a generic ⓘ — the icon is what tells the reader, before any
   * text, that the paragraph is about the assistant. Same glyph the AI review button uses.
   */
  @Input() icon?: string;

  private readonly statusIcons: Record<string, string> = {
    info: 'info',
    warning: 'warning',
    success: 'check',
    error: 'error'
  };

  get iconName(): string {
    return this.icon ?? this.statusIcons[this.status] ?? 'info';
  }
}
