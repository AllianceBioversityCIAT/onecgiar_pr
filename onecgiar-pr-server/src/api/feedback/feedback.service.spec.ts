import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FeedbackService } from './feedback.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

describe('FeedbackService', () => {
  const mockHttp = { post: jest.fn() };
  let service: FeedbackService;

  const user: TokenDto = {
    id: 7,
    email: 'tester@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  };

  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      JIRA_BASE_URL: 'https://jira.example.com',
      JIRA_EMAIL_JC: 'jc@cgiar.org',
      JIRA_TOKEN_JC: 'secret-token',
      JIRA_FEEDBACK_PROJECT_KEY: 'P2',
      JIRA_FEEDBACK_EPIC_KEY: 'P2-3472',
      JIRA_FEEDBACK_REPORTER_ID: 'acc-angel',
    };
    service = new FeedbackService(mockHttp as any);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const validDto = {
    type: 'bug' as const,
    title: 'Broken save button',
    description: 'It does nothing when clicked',
    contextUrl: 'https://app/results/123',
    userAgent: 'Mozilla/5.0',
  };

  it('creates a Bug (10003) under the epic with reporter override', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9001' } }));

    const res = await service.createFeedback(validDto, user);

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.response.issueKey).toBe('P2-9001');
    expect(res.response.issueUrl).toBe(
      'https://jira.example.com/browse/P2-9001',
    );

    const [url, payload, config] = mockHttp.post.mock.calls[0];
    expect(url).toBe('https://jira.example.com/rest/api/3/issue');
    expect(payload.fields.issuetype.id).toBe('10003');
    expect(payload.fields.project.key).toBe('P2');
    expect(payload.fields.parent.key).toBe('P2-3472');
    expect(payload.fields.reporter.id).toBe('acc-angel');
    expect(payload.fields.summary).toBe('Broken save button');
    // Basic auth header, base64(email:token) — token never in plaintext
    expect(config.headers.Authorization).toBe(
      `Basic ${Buffer.from('jc@cgiar.org:secret-token').toString('base64')}`,
    );
  });

  /**
   * Regression lock, 4 Sep 2026. Digital Tools (customfield_10521) is a
   * multi-select: Jira rejects the whole create with 400 "Specify the value
   * for Digital Tools in an array" if it arrives as a bare object, and the
   * user only sees "Something went wrong sending your report".
   */
  it('sends Digital Tools as an ARRAY of options, never a bare object', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9005' } }));
    await service.createFeedback(validDto, user);

    const digitalTools =
      mockHttp.post.mock.calls[0][1].fields['customfield_10521'];
    expect(Array.isArray(digitalTools)).toBe(true);
    expect(digitalTools).toEqual([{ id: '10215' }]);
  });

  it('carries the chosen priority and the three labels', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9006' } }));
    await service.createFeedback({ ...validDto, priority: '1' }, user);

    const { priority, labels } = mockHttp.post.mock.calls[0][1].fields;
    expect(priority).toEqual({ id: '1' });
    expect(labels).toEqual([
      'user-feedback-in-app',
      'fb-tester',
      'fb-env-other',
    ]);
  });

  it('falls back to Medium when the priority is not a known Jira id', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9007' } }));
    await service.createFeedback({ ...validDto, priority: '99' as any }, user);
    expect(mockHttp.post.mock.calls[0][1].fields.priority).toEqual({ id: '3' });
  });

  it("maps 'adjustment' to Enhancement (10105)", async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9002' } }));
    await service.createFeedback({ ...validDto, type: 'adjustment' }, user);
    expect(mockHttp.post.mock.calls[0][1].fields.issuetype.id).toBe('10105');
  });

  it('embeds the user description and auto-context (reporter, url, browser) in ADF', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9003' } }));
    await service.createFeedback(validDto, user);

    const adf = mockHttp.post.mock.calls[0][1].fields.description;
    const flat = JSON.stringify(adf);
    expect(adf.type).toBe('doc');
    expect(flat).toContain('It does nothing when clicked');
    expect(flat).toContain('Test User (tester@cgiar.org)');
    expect(flat).toContain('https://app/results/123');
    expect(flat).toContain('Mozilla/5.0');
  });

  it('truncates summary to 255 chars', async () => {
    mockHttp.post.mockReturnValue(of({ data: { key: 'P2-9004' } }));
    await service.createFeedback({ ...validDto, title: 'x'.repeat(300) }, user);
    expect(mockHttp.post.mock.calls[0][1].fields.summary.length).toBe(255);
  });

  it.each([
    [{ ...validDto, type: 'other' as any }, 'type'],
    [{ ...validDto, title: '   ' }, 'title'],
    [{ ...validDto, description: '' }, 'description'],
  ])('rejects invalid payload (%#) without calling Jira', async (dto) => {
    await expect(
      service.createFeedback(dto as any, user),
    ).rejects.toBeInstanceOf(HttpException);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('returns 503 when Jira credentials are missing', async () => {
    delete process.env.JIRA_TOKEN_JC;
    service = new FeedbackService(mockHttp as any);
    await expect(service.createFeedback(validDto, user)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('wraps Jira failures without leaking the token', async () => {
    mockHttp.post.mockReturnValue(
      throwError(() => ({
        response: { status: 400, data: { errorMessages: ['bad request'] } },
      })),
    );
    await expect(service.createFeedback(validDto, user)).rejects.toMatchObject({
      status: 400,
    });
  });
});
