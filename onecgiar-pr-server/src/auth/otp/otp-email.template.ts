/**
 * The Center sign-in code email (`OTP-R-32` modified by requirements.md §15,
 * `design.md` §19.1).
 *
 * @akili-spec changes/cognito-email-otp-login (OTP-T-16)
 *
 * Ported verbatim from the Option-B Cognito trigger package
 * (`cognito-triggers/src/lib/email-template.ts`, `OTP-T-11`) now that PRMS —
 * not a Cognito Lambda — generates and sends the code. The branding block is the
 * one every other PRMS notification uses
 * (`auth/modules/user/user.service.ts:743-750`).
 *
 * The template is handlebars-*style* on purpose: the notification microservice
 * only ever receives a rendered HTML string, so a ~10 line `{{var}}` replacer
 * does the job without pulling `handlebars` into the login hot path (the DB-stored
 * handlebars templates `user.service.ts` compiles are for admin flows that can
 * afford a query; a sign-in code must not depend on a template row existing).
 */

/** Lifetime advertised in the email; matches the `otp_challenges.expires_at` window. */
export const OTP_CODE_EXPIRY_MINUTES = 5;

/** Subject line required by `OTP-R-32`. */
export const OTP_EMAIL_SUBJECT = 'Your PRMS Reporting Tool sign-in code';

/**
 * Sender display name. Kept byte-identical to every other PRMS `sendEmail` caller
 * (`user.service.ts:759`, `share-result-request.service.ts:359`, …) — trailing
 * `-` included: the mail microservice composes the final `From:` around it, and
 * a code email that renders differently from the rest of PRMS is exactly the
 * "familiar sender" property `OTP-R-32` asks for.
 */
export const OTP_EMAIL_SENDER_NAME = 'PRMS Reporting Tool -';

/** Branding block — PRMS `user.service.ts:743-750`. */
export const PRMS_EMAIL_BRANDING = {
  logoUrl:
    'https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png',
  appName: 'PRMS Reporting Tool',
  appUrl: 'https://reporting.cgiar.org/',
  supportEmail: 'PRMSTechSupport@cgiar.org',
  senderName: 'PRMS Team',
} as const;

export interface OtpEmailParams {
  code: string;
  appUrl?: string;
  supportEmail?: string;
  logoUrl?: string;
  appName?: string;
}

export interface OtpEmailContent {
  subject: string;
  html: string;
  text: string;
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Replaces `{{name}}` with `data.name`. Unknown placeholders are left in place
 * rather than silently blanked, so a typo shows up in the rendered output (and in
 * the "leaves no placeholder unresolved" test) instead of shipping a hole.
 */
export function renderOtpTemplate(
  template: string,
  data: Record<string, string | number>,
): string {
  return template.replace(PLACEHOLDER, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(data, key) ? String(data[key]) : match,
  );
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{appName}}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #f4f6f8; }
      .wrapper { width: 100%; background-color: #f4f6f8; padding: 24px 0; }
      .card { width: 100%; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #1f2a37; }
      .header { padding: 24px 32px 8px 32px; text-align: left; }
      .header img { display: block; width: 220px; max-width: 100%; height: auto; border: 0; }
      .content { padding: 28px 32px 8px 32px; font-size: 15px; line-height: 22px; }
      .otp-code { font-family: "Courier New", Consolas, Menlo, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2a37; text-align: center; padding: 18px 0; margin: 20px 0; background-color: #f0f4f8; border-radius: 6px; }
      .muted { color: #5b6b7c; font-size: 13px; line-height: 20px; }
      .footer { padding: 8px 32px 28px 32px; }
      .footer a { color: #1689b8; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="header">
          <img src="{{logoUrl}}" alt="{{appName}}" width="220" style="width:220px;max-width:100%;height:auto;display:block" />
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Use the code below to sign in to the <strong>{{appName}}</strong>.</p>
          <div class="otp-code">{{code}}</div>
          <p class="muted">The code expires in {{expiryMinutes}} minutes and can only be used once.</p>
          <p class="muted">If you did not request this code, you can safely ignore this email — nobody can sign in without it.</p>
        </div>
        <div class="footer">
          <p class="muted">
            Need help? Contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.
          </p>
          <p class="muted">
            <a href="{{appUrl}}">{{appUrl}}</a><br />
            {{senderName}}
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

const TEXT_TEMPLATE = `Hello,

Use this code to sign in to the {{appName}}: {{code}}

The code expires in {{expiryMinutes}} minutes and can only be used once.
If you did not request this code, you can safely ignore this email.

Need help? Contact {{supportEmail}}
{{appUrl}}
{{senderName}}`;

/**
 * Builds the subject and both bodies for one sign-in code. The code is never
 * logged and never stored in plaintext (`OTP-R-11`, `OTP-R-37`) — it exists only
 * inside the rendered strings handed straight to the mail queue.
 */
export function buildOtpEmail(params: OtpEmailParams): OtpEmailContent {
  const data: Record<string, string | number> = {
    logoUrl: params.logoUrl ?? PRMS_EMAIL_BRANDING.logoUrl,
    appName: params.appName ?? PRMS_EMAIL_BRANDING.appName,
    appUrl: params.appUrl ?? PRMS_EMAIL_BRANDING.appUrl,
    supportEmail: params.supportEmail ?? PRMS_EMAIL_BRANDING.supportEmail,
    senderName: PRMS_EMAIL_BRANDING.senderName,
    code: params.code,
    expiryMinutes: OTP_CODE_EXPIRY_MINUTES,
  };

  return {
    subject: OTP_EMAIL_SUBJECT,
    html: renderOtpTemplate(HTML_TEMPLATE, data),
    text: renderOtpTemplate(TEXT_TEMPLATE, data),
  };
}
