import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink, lucideCode } from '@ng-icons/lucide';
import { FooterService } from '../../shared/components/footer/footer.service';

interface IntegrationStep {
  number: number;
  title: string;
  description: string;
  codeSnippet?: string;
}

interface EnvironmentEndpoint {
  label: string;
  url: string;
}

@Component({
  selector: 'app-developers',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './developers.component.html',
  styleUrls: ['./developers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideExternalLink,
      lucideCode
    })
  ]
})
export class DevelopersComponent {
  private readonly footerSE = inject(FooterService, { optional: true });

  readonly supportEmail = 'PRMSTechSupport@cgiar.org';

  readonly testEndpoints: EnvironmentEndpoint[] = [
    {
      label: 'API reference (Swagger)',
      url: 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/'
    },
    {
      label: 'Single result ingest',
      url: 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/ingest'
    },
    {
      label: 'Bulk ingest',
      url: 'https://0w16ghmybe.execute-api.us-east-1.amazonaws.com/ingest'
    }
  ];

  readonly productionEndpoints: EnvironmentEndpoint[] = [
    {
      label: 'API reference (Swagger)',
      url: 'https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/docs'
    },
    {
      label: 'Single result ingest',
      url: 'https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com/ingest'
    },
    {
      label: 'Bulk ingest',
      url: 'https://b1a4fsvgni.execute-api.us-east-1.amazonaws.com/ingest'
    }
  ];

  // The authority on payload shape lives in Notion (public, no account needed); the Swagger
  // reference below is the try-it-out surface, not the contract.
  readonly officialDocsUrl =
    'https://cgiar-prms.notion.site/PRMS-Normalizer-Technical-Field-Documentation-287f271224788055a0d9c2bc23b1a06b';
  readonly swaggerDocsUrl = 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/';
  readonly webhooksDocUrl = 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com/docs/#/Webhooks';

  requestApiKey(): void {
    const subject = encodeURIComponent('PRMS API Key Request');
    const body = encodeURIComponent(
      'Hello PRMS Technical Team,\n\nI would like to request an API key for platform integration.\n\nPlatform name: \nEnvironment (Test / Production): \nContact person: \nOrganization / Center: \nDescription of use case: \n\nThank you!'
    );
    window.open(`mailto:${this.supportEmail}?subject=${subject}&body=${body}`, '_self');
  }

  contactSupport(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (this.footerSE) {
      this.footerSE.displayContactUs = true;
    } else {
      const subject = encodeURIComponent('PRMS API Inquiry');
      window.open(`mailto:${this.supportEmail}?subject=${subject}`, '_self');
    }
  }
}
