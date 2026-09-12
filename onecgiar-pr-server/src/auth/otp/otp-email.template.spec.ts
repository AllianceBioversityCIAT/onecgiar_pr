// @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1,
// requirements.md OTP-R-32 modified / OTP-R-34 modified) — the sign-in code email
// is now rendered by PRMS itself. These tests pin the three things the spec names
// explicitly: the subject, the 5-minute single-use copy, and the code reaching BOTH
// bodies with no placeholder left behind.

import {
  OTP_CODE_EXPIRY_MINUTES,
  OTP_EMAIL_SENDER_NAME,
  OTP_EMAIL_SUBJECT,
  PRMS_EMAIL_BRANDING,
  buildOtpEmail,
  renderOtpTemplate,
} from './otp-email.template';

describe('otp-email.template (OTP-T-16)', () => {
  const params = {
    code: '482913',
    appUrl: 'https://reporting.cgiar.org/',
    supportEmail: 'PRMSTechSupport@cgiar.org',
    logoUrl:
      'https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png',
    appName: 'PRMS Reporting Tool',
  };

  describe('renderOtpTemplate', () => {
    it('replaces known placeholders and leaves unknown ones in place (so a typo is visible, never a silent hole)', () => {
      expect(
        renderOtpTemplate('a={{a}} b={{ b }} c={{c}}', { a: '1', b: 2 }),
      ).toBe('a=1 b=2 c={{c}}');
    });
  });

  describe('buildOtpEmail', () => {
    it('uses the subject required by OTP-R-32 and the PRMS sender display name', () => {
      expect(OTP_EMAIL_SUBJECT).toBe('Your PRMS Reporting Tool sign-in code');
      expect(OTP_EMAIL_SENDER_NAME).toBe('PRMS Reporting Tool -');
      expect(buildOtpEmail(params).subject).toBe(OTP_EMAIL_SUBJECT);
    });

    it('carries the code in both the HTML and the plain-text body', () => {
      const { html, text } = buildOtpEmail(params);

      expect(html).toContain('482913');
      expect(text).toContain('482913');
    });

    it('states the 5-minute, single-use policy in both bodies (OTP-R-34)', () => {
      const { html, text } = buildOtpEmail(params);

      expect(OTP_CODE_EXPIRY_MINUTES).toBe(5);
      expect(html).toContain(
        'The code expires in 5 minutes and can only be used once.',
      );
      expect(text).toContain(
        'The code expires in 5 minutes and can only be used once.',
      );
    });

    it('leaves no unresolved {{placeholder}} in either body', () => {
      const { html, text } = buildOtpEmail(params);

      expect(html).not.toContain('{{');
      expect(text).not.toContain('{{');
    });

    it('renders the PRMS branding block (logo at 220px, support address, app URL)', () => {
      const { html, text } = buildOtpEmail(params);

      expect(html).toContain(`<img src="${params.logoUrl}"`);
      expect(html).toContain('width="220"');
      expect(html).toContain(params.supportEmail);
      expect(html).toContain(params.appUrl);
      expect(text).toContain(params.supportEmail);
      expect(text).toContain(params.appUrl);
      expect(html).toContain(PRMS_EMAIL_BRANDING.senderName);
    });

    it('exposes the branding defaults copied from user.service.ts:743-750', () => {
      expect(PRMS_EMAIL_BRANDING).toEqual({
        logoUrl:
          'https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png',
        appName: 'PRMS Reporting Tool',
        appUrl: 'https://reporting.cgiar.org/',
        supportEmail: 'PRMSTechSupport@cgiar.org',
        senderName: 'PRMS Team',
      });
    });
  });
});
