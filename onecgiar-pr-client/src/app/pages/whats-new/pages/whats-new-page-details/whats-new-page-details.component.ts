import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WhatsNewService } from '../../services/whats-new.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-whats-new-page-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whats-new-page-details.component.html',
  styleUrls: ['./whats-new-page-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPageDetailsComponent implements OnInit {
  notionPageId = signal<string>('');
  whatsNewService = inject(WhatsNewService);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.notionPageId.set(params['id']);
    });

    this.whatsNewService.getNotionBlockChildren(this.notionPageId());
  }

  joinText(text: any[]) {
    if (!text || !text.length) return '';

    // Process text items
    const processedText = text.map(item => {
      // Handle links
      if (item.href) {
        return `<a href="${item.href}">${item.plain_text}</a>`;
      }

      // Handle text with different formatting
      let formattedText = item.plain_text;

      // Apply bold formatting if needed
      if (item.annotations?.bold) {
        formattedText = `<span class="text-semibold">${formattedText}</span>`;
      }

      // Apply italic formatting if needed
      if (item.annotations?.italic) {
        formattedText = `<em>${formattedText}</em>`;
      }

      // Apply underline formatting if needed
      if (item.annotations?.underline) {
        formattedText = `<u>${formattedText}</u>`;
      }

      return formattedText;
    });

    // Join the processed text items
    return processedText.join('');
  }
}
