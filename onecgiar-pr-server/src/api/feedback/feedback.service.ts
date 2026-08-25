import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CreateFeedbackDto,
  FeedbackType,
} from './dto/create-feedback.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

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

  constructor(private readonly httpService: HttpService) {}

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
      throw new HttpException("Field 'title' is required", HttpStatus.BAD_REQUEST);
    }
    if (!description) {
      throw new HttpException(
        "Field 'description' is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!this.jiraBaseUrl || !this.jiraEmail || !this.jiraToken) {
      this.logger.error('Jira credentials are not configured');
      throw new HttpException(
        'Feedback service is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const payload = {
      fields: {
        project: { key: this.projectKey },
        issuetype: { id: this.issueTypeId[type] },
        parent: { key: this.epicKey },
        reporter: { id: this.reporterId },
        // Jira summary hard-limits at 255 chars
        summary: title.slice(0, 255),
        description: this.buildAdfDescription(
          description,
          createFeedbackDto,
          user,
        ),
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.jiraBaseUrl}/rest/api/3/issue`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Basic ${Buffer.from(
                `${this.jiraEmail}:${this.jiraToken}`,
              ).toString('base64')}`,
            },
          },
        ),
      );

      const issueKey = response.data?.key;
      this.logger.log(`Feedback issue created: ${issueKey} (${type})`);

      return {
        response: {
          issueKey,
          issueUrl: `${this.jiraBaseUrl}/browse/${issueKey}`,
          type,
        },
        message: 'Feedback submitted successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      // Never log the token; only Jira's own error payload.
      const jiraErrors = error?.response?.data?.errors;
      const jiraMessages = error?.response?.data?.errorMessages;
      this.logger.error(
        `Failed to create feedback issue: ${JSON.stringify(
          jiraMessages ?? jiraErrors ?? error?.message,
        )}`,
      );
      throw new HttpException(
        'Could not submit feedback to Jira',
        error?.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
    const reporterName = [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const reportedBy = reporterName
      ? `${reporterName} (${user?.email ?? 'unknown'})`
      : user?.email ?? 'unknown';

    const contextRows: string[] = [
      `Reported by: ${reportedBy}`,
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
