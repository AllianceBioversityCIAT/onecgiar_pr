import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Observable, Subscription } from 'rxjs';
import { QualityAssuranceService } from './quality-assurance.service';

export const QA_SP_RELOAD_MESSAGE_TYPE = 'qa-sp:reload-required';
export const QA_SP_GENERIC_ERROR = 'Quality Assurance could not be opened. Please try again.';

/**
 * P2-3911 — embeds the Science Program view of the new QA platform.
 *
 * Every (re)load asks the Reporting back for a NEW one-time code (`GET api/qa/sp-link`) and points
 * the iframe at `{qaUrl}/sp?code=…`; codes are never cached or reused (they work once and last 60 s).
 * When the QA page reports `qa-sp:reload-required`, the view reloads automatically once per user
 * action and then shows a Reload button, so a QA outage cannot loop.
 *
 * State is signal-backed (P2-3322): delayed writes must schedule their own render under zoneless
 * change detection.
 */
@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default
})
export class QualityAssuranceComponent implements OnInit, OnDestroy {
  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public sanitizer: DomSanitizer,
    private qaSE: QualityAssuranceService
  ) {}

  allInitiatives = [];
  official_code = null;
  qaUrl = environment.qaUrl;
  readonly qaOrigin = QualityAssuranceComponent.originOf(environment.qaUrl);

  readonly showIframe = signal<boolean>(false);
  readonly sanitizedUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showReloadButton = signal<boolean>(false);

  /** One automatic reload per user action (program change or Reload click). */
  private autoReloadUsed = false;
  private linkSubscription: Subscription | null = null;
  private readonly onMessage = (event: MessageEvent) => this.handleQaMessage(event);

  static originOf(url: string): string | null {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }

  ngOnInit(): void {
    this.api.rolesSE.validateReadOnly();
    this.api.dataControlSE.detailSectionTitle('Quality Assurance');
    window.addEventListener('message', this.onMessage);

    new Observable((observer: any) => {
      observer.next();
      this.qaSE.$qaFirstInitObserver = observer;
    }).subscribe(() => {
      this.api.dataControlSE.getCurrentPhases().subscribe(() => {
        this.GET_AllInitiatives();
      });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.linkSubscription?.unsubscribe();
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) {
      this.official_code = this.api.dataControlSE.myInitiativesListReportingByPortfolio[0]?.official_code;
      if (this.official_code) this.selectOptionEvent(this.official_code);
      return;
    }

    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe(({ response }) => {
      this.allInitiatives = response;
      this.official_code = this.allInitiatives[0]?.official_code;
      if (this.official_code) this.selectOptionEvent(this.official_code);
    });
  }

  /** User picked a program: a new user action, so the automatic reload is available again. */
  selectOptionEvent(option) {
    this.official_code = option;
    this.autoReloadUsed = false;
    this.loadIframe();
  }

  /** Reload button: also a user action. */
  reload() {
    this.autoReloadUsed = false;
    this.loadIframe();
  }

  /** Asks for a NEW code and points the iframe at it. Never reuses a previous code. */
  loadIframe() {
    this.linkSubscription?.unsubscribe();
    this.showIframe.set(false);
    this.sanitizedUrl.set(null);
    this.errorMessage.set(null);
    this.showReloadButton.set(false);

    if (!this.official_code) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.linkSubscription = this.api.resultsSE.GET_QaSpLink(this.official_code).subscribe({
      next: ({ response }) => {
        this.loading.set(false);
        const code = response?.code;
        if (!code) {
          this.fail(QA_SP_GENERIC_ERROR);
          return;
        }
        this.sanitizedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`${this.qaUrl}/sp?code=${encodeURIComponent(code)}`));
        this.showIframe.set(true);
      },
      error: err => {
        this.loading.set(false);
        this.fail(QualityAssuranceComponent.errorText(err));
      }
    });
  }

  handleQaMessage(event: MessageEvent) {
    if (!this.qaOrigin || event.origin !== this.qaOrigin) return;
    if (event.data?.type !== QA_SP_RELOAD_MESSAGE_TYPE) return;

    if (!this.autoReloadUsed) {
      this.autoReloadUsed = true;
      this.loadIframe();
      return;
    }
    this.showReloadButton.set(true);
  }

  private fail(message: string) {
    this.errorMessage.set(message);
    this.showReloadButton.set(true);
  }

  /** The back sends user-facing messages (403 / program not in QA / QA unavailable / generic). */
  static errorText(err: any): string {
    const message = err?.error?.message;
    return typeof message === 'string' && message.trim() ? message : QA_SP_GENERIC_ERROR;
  }
}
