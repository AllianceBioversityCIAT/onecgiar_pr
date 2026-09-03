import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CreateFeedbackDto,
  FeedbackAttachmentDto,
  FeedbackType,
  FEEDBACK_PRIORITY_IDS,
} from './dto/create-feedback.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

/**
 * What the reporter is told about their own report. Deliberately coarse: the
 * board has ten statuses whose names only mean something to the team, and the
 * user only needs to know whether it was received, is being worked on, or is
 * already out. Internal comments and activity are NEVER exposed.
 */
const PUBLIC_STAGE_BY_STATUS: Record<string, string> = {
  open: 'Received',
  'to be clarified': 'Received',
  'ready to develop': 'Received',
  'in progress': 'Being worked on',
  'to be deployed': 'Fixed — waiting for the next release',
  'ready for uat': 'Fixed — being tested',
  'to be reviewed': 'Fixed — being tested',
  'released into live': 'Released',
  done: 'Released',
  canceled: 'Closed without changes',
  cancelled: 'Closed without changes',
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_CONSOLE_LINES = 200;

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  private readonly jiraBaseUrl = process.env.JIRA_BASE_URL;
  private readonly jiraEmail = process.env.JIRA_EMAIL_JC;
  private readonly jiraToken = process.env.JIRA_TOKEN_JC;
  private readonly projectKey = process.env.JIRA_FEEDBACK_PROJECT_KEY || 'P2';
  private readonly epicKey = process.env.JIRA_FEEDBACK_EPIC_KEY || 'P2-3472';
  private readonly reporterId =
    process.env.JIRA_FEEDBACK_REPORTER_ID ||
    '712020:ed59efaa-46e7-439b-9dd1-702edad6bc10';

  /** Jira issue type ids for project P2 (Bug / Enhancement). */
  private readonly issueTypeId: Record<FeedbackType, string> = {
    bug: '10003',
    adjustment: '10105',
  };

  /** The only sub-task type P2 offers is 'Task' (10002). */
  private readonly subTaskTypeId = '10002';

  /** Digital Tools (customfield_10521) → 'Reporting Tool'. */
  private readonly digitalToolsFieldId = 'customfield_10521';
  private readonly reportingToolOptionId = '10215';

  /** Every issue born from the in-app button carries this label. */
  private readonly feedbackLabel = 'user-feedback-in-app';

  constructor(private readonly httpService: HttpService) {}

  // ---------------------------------------------------------------- create

  async createFeedback(createFeedbackDto: CreateFeedbackDto, user: TokenDto) {
    const type = createFeedbackDto?.type;
    const title = createFeedbackDto?.title?.trim();
    const description = createFeedbackDto?.description?.trim();

    if (!type || !this.issueTypeId[type]) {
      throw new HttpException(
        "Field 'type' must be 'bug' or 'adjustment'",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!title) {
      throw new HttpException(
        "Field 'title' is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!description) {
      throw new HttpException(
        "Field 'description' is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertConfigured();

    const priority = FEEDBACK_PRIORITY_IDS.includes(
      createFeedbackDto?.priority as never,
    )
      ? createFeedbackDto.priority
      : '3';

    const payload = {
      fields: {
        project: { key: this.projectKey },
        issuetype: { id: this.issueTypeId[type] },
        parent: { key: this.epicKey },
        reporter: { id: this.reporterId },
        priority: { id: priority },
        // Three labels: one to find everything that came from the button, one
        // to find this person's own reports without storing a single id our
        // side, and one for the environment it came from.
        labels: [
          this.feedbackLabel,
          this.reporterLabel(user),
          this.detectEnvironment(createFeedbackDto?.contextUrl).label,
        ].filter(Boolean),
        [this.digitalToolsFieldId]: { id: this.reportingToolOptionId },
        // Jira summary hard-limits at 255 chars
        summary: title.slice(0, 255),
        description: this.buildAdfDescription(
          description,
          createFeedbackDto,
          user,
        ),
      },
    };

    let issueKey: string;
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.jiraBaseUrl}/rest/api/3/issue`, payload, {
          headers: this.jiraHeaders(),
        }),
      );
      issueKey = response.data?.key;
      this.logger.log(`Feedback issue created: ${issueKey} (${type})`);
    } catch (error) {
      this.logJiraError('create feedback issue', error);
      throw new HttpException(
        'Could not submit feedback to Jira',
        error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // From here on nothing is allowed to fail the request: the report already
    // exists, and the user should not be told it failed because an extra could
    // not be attached. Each side effect reports whether it made it.
    const attachments = await this.uploadAttachments(
      issueKey,
      createFeedbackDto?.attachments,
    );
    const consoleSubTask = await this.createConsoleSubTask(
      issueKey,
      createFeedbackDto?.consoleLogs,
    );

    return {
      response: {
        issueKey,
        issueUrl: `${this.jiraBaseUrl}/browse/${issueKey}`,
        type,
        attachmentsUploaded: attachments,
        consoleSubTask,
      },
      message: 'Feedback submitted successfully',
      status: HttpStatus.CREATED,
    };
  }

  // ------------------------------------------------------------- my reports

  /**
   * The reporter's own reports, resolved live from Jira — we store nothing.
   * Matches both the issues they opened (their email sits in the description)
   * and the ones they joined with "this happened to me too" (a comment).
   */
  async findMyReports(user: TokenDto) {
    this.assertConfigured();
    const email = user?.email?.trim();
    if (!email) {
      throw new HttpException(
        'Could not identify the current user',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const jql =
      `parent = "${this.epicKey}" AND (description ~ "${email}" OR comment ~ "${email}")` +
      ` ORDER BY created DESC`;

    const issues = await this.searchIssues(jql, 50);
    return {
      response: issues.map((i) => this.toPublicReport(i)),
      message: 'Reports retrieved successfully',
      status: HttpStatus.OK,
    };
  }

  // --------------------------------------------------------------- similar

  /**
   * Reports that look like what the user is about to write, so several people
   * do not open the same thing five times. Searched inside the feedback epic
   * only, and returned with the same public shape as `findMyReports`.
   */
  async findSimilar(query: string) {
    this.assertConfigured();
    const q = (query || '').replace(/["\\]/g, ' ').trim();
    if (q.length < 4) {
      return {
        response: [],
        message: 'Query too short',
        status: HttpStatus.OK,
      };
    }

    const jql = `parent = "${this.epicKey}" AND text ~ "${q}" ORDER BY created DESC`;
    const issues = await this.searchIssues(jql, 5);
    return {
      response: issues.map((i) => this.toPublicReport(i)),
      message: 'Similar reports retrieved successfully',
      status: HttpStatus.OK,
    };
  }

  // ----------------------------------------------------------------- me too

  /**
   * "This already happened to me too": instead of a duplicate issue, the user
   * is added to the existing one as a comment. That comment is also what makes
   * the report show up in their own list later (see `findMyReports`).
   */
  async addMeToo(issueKey: string, user: TokenDto) {
    this.assertConfigured();
    const key = (issueKey || '').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) {
      throw new HttpException('Invalid issue key', HttpStatus.BAD_REQUEST);
    }

    // Only issues that belong to the feedback epic can be joined this way,
    // so this endpoint can never be used to comment anywhere else in Jira.
    const belongs = await this.searchIssues(
      `key = "${key}" AND parent = "${this.epicKey}"`,
      1,
    );
    if (!belongs.length) {
      throw new HttpException(
        'That report does not belong to the feedback list',
        HttpStatus.NOT_FOUND,
      );
    }

    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Also reported by: ',
                marks: [{ type: 'strong' }],
              },
              { type: 'text', text: this.reportedBy(user) },
            ],
          },
        ],
      },
    };

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.jiraBaseUrl}/rest/api/3/issue/${key}/comment`,
          body,
          { headers: this.jiraHeaders() },
        ),
      );
    } catch (error) {
      this.logJiraError(`join report ${key}`, error);
      throw new HttpException(
        'Could not add you to that report',
        error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`Feedback: user joined existing report ${key}`);
    return {
      response: {
        issueKey: key,
        issueUrl: `${this.jiraBaseUrl}/browse/${key}`,
      },
      message: 'You were added to that report',
      status: HttpStatus.OK,
    };
  }

  // ---------------------------------------------------------------- helpers

  private assertConfigured() {
    if (!this.jiraBaseUrl || !this.jiraEmail || !this.jiraToken) {
      this.logger.error('Jira credentials are not configured');
      throw new HttpException(
        'Feedback service is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private jiraHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${this.jiraEmail}:${this.jiraToken}`,
      ).toString('base64')}`,
    };
  }

  /** Never logs the token: only Jira's own error payload. */
  private logJiraError(action: string, error: any) {
    const jiraErrors = error?.response?.data?.errors;
    const jiraMessages = error?.response?.data?.errorMessages;
    this.logger.error(
      `Failed to ${action}: ${JSON.stringify(
        jiraMessages ?? jiraErrors ?? error?.message,
      )}`,
    );
  }

  /**
   * A deterministic per-person label, derived from the email, so their reports
   * can be found again without persisting anything. Jira labels take no spaces.
   */
  private reporterLabel(user: TokenDto): string | null {
    const email = user?.email?.trim().toLowerCase();
    if (!email) return null;
    const local = email.split('@')[0].replace(/[^a-z0-9._-]/g, '-');
    return local ? `fb-${local}`.slice(0, 255) : null;
  }

  /**
   * Which environment the report came from, read off the screen URL the client
   * sends. Production is `reporting.cgiar.org`; the testing environment is
   * `prtest*`. Anything else is somebody's machine.
   * Returned as a pair so it can go both in the description (for people) and in
   * a label (so the team can filter "only production reports" in Jira).
   */
  private detectEnvironment(contextUrl?: string): {
    name: string;
    label: string;
  } {
    let host = '';
    try {
      host = new URL(contextUrl || '').hostname.toLowerCase();
    } catch {
      host = '';
    }

    if (!host) return { name: 'Unknown', label: 'fb-env-unknown' };
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local'))
      return { name: 'Local (developer machine)', label: 'fb-env-local' };
    if (host.startsWith('prtest'))
      return { name: 'Testing (prtest)', label: 'fb-env-testing' };
    if (host.includes('reporting.cgiar.org'))
      return { name: 'Production', label: 'fb-env-production' };
    return { name: `Other (${host})`, label: 'fb-env-other' };
  }

  private reportedBy(user: TokenDto): string {
    const name = [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name
      ? `${name} (${user?.email ?? 'unknown'})`
      : (user?.email ?? 'unknown');
  }

  private async searchIssues(jql: string, maxResults: number): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.jiraBaseUrl}/rest/api/3/search/jql`, {
          headers: this.jiraHeaders(),
          params: {
            jql,
            maxResults,
            fields:
              'summary,status,issuetype,created,updated,resolutiondate,priority',
          },
        }),
      );
      return response.data?.issues ?? [];
    } catch (error) {
      this.logJiraError('search feedback issues', error);
      throw new HttpException(
        'Could not read your reports from Jira',
        error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * The public shape of a report. Whitelisted on purpose: comments, assignee,
   * internal fields and activity are team-only and must not leak here.
   */
  private toPublicReport(issue: any) {
    const status: string = issue?.fields?.status?.name ?? '';
    return {
      issueKey: issue?.key,
      issueUrl: `${this.jiraBaseUrl}/browse/${issue?.key}`,
      title: issue?.fields?.summary,
      type: issue?.fields?.issuetype?.name,
      stage: PUBLIC_STAGE_BY_STATUS[status.toLowerCase()] ?? 'Received',
      released: ['released into live', 'done'].includes(status.toLowerCase()),
      createdAt: issue?.fields?.created,
      updatedAt: issue?.fields?.updated,
      resolvedAt: issue?.fields?.resolutiondate,
    };
  }

  /** Uploads the screenshots. Returns how many made it; never throws. */
  private async uploadAttachments(
    issueKey: string,
    attachments?: FeedbackAttachmentDto[],
  ): Promise<number> {
    if (!issueKey || !attachments?.length) return 0;

    let uploaded = 0;
    for (const file of attachments.slice(0, MAX_ATTACHMENTS)) {
      const raw = (file?.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
      if (!raw) continue;
      if (!/^image\//.test(file?.mimeType || '')) {
        this.logger.warn(
          `Feedback ${issueKey}: skipped a non-image attachment (${file?.mimeType})`,
        );
        continue;
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(raw, 'base64');
      } catch {
        continue;
      }
      if (!buffer.length || buffer.length > MAX_ATTACHMENT_BYTES) {
        this.logger.warn(
          `Feedback ${issueKey}: skipped an attachment of ${buffer.length} bytes`,
        );
        continue;
      }

      try {
        const form = new FormData();
        form.append(
          'file',
          new Blob([new Uint8Array(buffer)], { type: file.mimeType }),
          file?.name || 'screenshot.png',
        );
        await firstValueFrom(
          this.httpService.post(
            `${this.jiraBaseUrl}/rest/api/3/issue/${issueKey}/attachments`,
            form,
            {
              headers: {
                Accept: 'application/json',
                // Required by Jira for attachment uploads.
                'X-Atlassian-Token': 'no-check',
                Authorization: this.jiraHeaders().Authorization,
              },
            },
          ),
        );
        uploaded += 1;
      } catch (error) {
        this.logJiraError(`attach a file to ${issueKey}`, error);
      }
    }
    return uploaded;
  }

  /**
   * Console errors go to an INTERNAL sub-task of the report, not to the report
   * itself: sub-tasks hang off the issue, not off the epic, so they never show
   * up in the reporter's list. Never throws.
   */
  private async createConsoleSubTask(
    issueKey: string,
    consoleLogs?: string[],
  ): Promise<string | null> {
    const lines = (consoleLogs || [])
      .filter((l) => typeof l === 'string' && l.trim())
      .slice(-MAX_CONSOLE_LINES);
    if (!issueKey || !lines.length) return null;

    const text = lines.join('\n').slice(0, 30000);
    const payload = {
      fields: {
        project: { key: this.projectKey },
        issuetype: { id: this.subTaskTypeId },
        parent: { key: issueKey },
        summary: `Console output — ${issueKey}`.slice(0, 255),
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Browser console errors and warnings captured when the report was sent. Internal: not shown to the reporter.',
                },
              ],
            },
            {
              type: 'codeBlock',
              attrs: { language: 'text' },
              content: [{ type: 'text', text }],
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.jiraBaseUrl}/rest/api/3/issue`, payload, {
          headers: this.jiraHeaders(),
        }),
      );
      const key = response.data?.key ?? null;
      this.logger.log(`Feedback ${issueKey}: console sub-task ${key}`);
      return key;
    } catch (error) {
      this.logJiraError(`create the console sub-task for ${issueKey}`, error);
      return null;
    }
  }

  /**
   * Builds the Atlassian Document Format (ADF) body: the user's own text,
   * a divider, and an auto-collected context block (reporter, screen, browser).
   */
  private buildAdfDescription(
    description: string,
    dto: CreateFeedbackDto,
    user: TokenDto,
  ) {
    const contextRows: string[] = [
      `Reported by: ${this.reportedBy(user)}`,
      `Environment: ${this.detectEnvironment(dto?.contextUrl).name}`,
      `Screen / URL: ${dto?.contextUrl || 'n/a'}`,
      `Browser: ${dto?.userAgent || 'n/a'}`,
    ];

    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: description }],
        },
        { type: 'rule' },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Automatically collected context',
              marks: [{ type: 'strong' }],
            },
          ],
        },
        {
          type: 'bulletList',
          content: contextRows.map((line) => ({
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: line }] },
            ],
          })),
        },
      ],
    };
  }
}
