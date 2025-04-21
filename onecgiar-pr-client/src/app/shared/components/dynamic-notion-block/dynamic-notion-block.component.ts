import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { WhatsNewService } from '../../../pages/whats-new/services/whats-new.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-notion-block',
  standalone: true,
  imports: [FormsModule, CheckboxModule, RouterModule, CommonModule],
  templateUrl: './dynamic-notion-block.component.html',
  styleUrl: './dynamic-notion-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicNotionBlockComponent {
  @Input() block: any;
  whatsNewService = inject(WhatsNewService);
  isExpanded = signal<boolean>(false);

  constructor(private router: Router) {}

  navigateToChildPage(id: string) {
    this.router.navigate(['/whats-new/details', id]);
  }

  toggleExpand() {
    this.isExpanded.update(current => !current);
  }

  joinText(text: any[]) {
    if (!text || !text.length) return '';

    // Process text items
    const processedText = text.map(item => {
      // Handle text with different formatting
      let formattedText = item.plain_text;

      // Apply all annotations in sequence
      if (item.annotations) {
        // Apply bold formatting if needed
        if (item.annotations.bold) {
          formattedText = `<span class="text-semibold">${formattedText}</span>`;
        }

        // Apply italic formatting if needed
        if (item.annotations.italic) {
          formattedText = `<em>${formattedText}</em>`;
        }

        // Apply underline formatting if needed
        if (item.annotations.underline) {
          formattedText = `<u>${formattedText}</u>`;
        }

        // Apply strikethrough formatting if needed
        if (item.annotations.strikethrough) {
          formattedText = `<s>${formattedText}</s>`;
        }

        if (item.annotations.code) {
          formattedText = `<code class="notion-code">${formattedText}</code>`;
        }
      }

      // Handle links - apply after other formatting
      if (item.href) {
        if (item.mention) {
          formattedText = `<a href="${item.href}" target="_blank" rel="noopener noreferrer" class="notion-link">${item.href}</a>`;
        } else {
          formattedText = `<a href="${item.href}" target="_blank" rel="noopener noreferrer" class="notion-link">${formattedText}</a>`;
        }
      }

      return formattedText;
    });

    // Join the processed text items
    return processedText.join('');
  }
}
