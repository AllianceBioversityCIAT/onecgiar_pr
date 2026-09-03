import { SubmissionsService } from './submissions.service';

/**
 * P2-3272 / P2-3513 item 3 — the two Intellectual Property emails.
 *
 * Exercised through `_sendIpExpertNotificationsIfNeeded`, the real entry point, so the result-type
 * gate and the phase gate are both in the test rather than assumed.
 *
 * What these pin, in order of what would hurt most if it broke:
 *   1. A 2025 submission must keep the OLD wording. That body describes the four separate IPR
 *      questions, which a 2025 reporter did answer — sending them the 2026 text would describe a
 *      question they never saw.
 *   2. The confirmation email must never cost anyone their submission. It runs after the record is
 *      already saved, so every failure path is a warning, not a throw.
 *   3. "Requesting user" is the Lead Contact Person of General Information, not whoever pressed
 *      Submit. Those are routinely different people and the specialist writes to whoever is named.
 *
 * Built off the prototype because the constructor takes eleven collaborators.
 */
describe('SubmissionsService — IP emails (P2-3272)', () => {
  const RESULT_ID = 4242;

  const EXPERTS = [
    { first_name: 'Ana', last_name: 'Moreno', email: 'a.moreno@cgiar.org' },
    { first_name: 'Luis', last_name: 'Prado', email: 'l.prado@cgiar.org' },
  ];

  function makeService(
    over: {
      phaseYear?: number | null;
      leadContactPersonId?: number | null;
      leadContactPerson?: any;
      templates?: Record<string, any>;
      resultTypeId?: number;
      hasContactRequest?: boolean;
      experts?: any[];
    } = {},
  ) {
    const templates = over.templates ?? {
      email_template_ip_experts_support: { template: 'OLD {{contactPerson}}' },
      email_template_ip_experts_support_2026: {
        template: 'NEW {{resultCode}} {{contactPerson}}',
      },
      email_template_ip_support_confirmation_2026: {
        template: 'CONFIRM {{contactPersonName}} {{referralRecipients}}',
      },
    };

    const service: any = Object.create(SubmissionsService.prototype);
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };

    service._resultRepository = {
      getResultInnovationDevelopmentByResultId: jest
        .fn()
        .mockResolvedValue(over.hasContactRequest ?? true),
      getScienceProgramByResultId: jest
        .fn()
        .mockResolvedValue([
          { name: 'Sustainable Farming', official_code: 'SP-07' },
        ]),
    };

    service._intellectualPropertyExpertRepository = {
      getIpExpertsEmailsByResultId: jest
        .fn()
        .mockResolvedValue(over.experts ?? EXPERTS),
    };

    service._resultCenterRepository = {
      findOne: jest.fn().mockResolvedValue({
        clarisa_center_object: {
          clarisa_institution: { name: 'Alliance', acronym: 'ABC' },
        },
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    service._submissionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            first_name: 'Submitter',
            last_name: 'Person',
            email: 'submitter@cgiar.org',
          },
        ]),
      }),
    };

    service._globalParametersRepository = {
      findOne: jest.fn().mockResolvedValue({ value: 'tech@cgiar.org' }),
    };

    service._templateRepository = {
      findOne: jest
        .fn()
        .mockImplementation(({ where }: any) =>
          Promise.resolve(templates[where.name] ?? null),
        ),
    };

    service._adUserRepository = {
      findOne: jest.fn().mockResolvedValue(
        over.leadContactPerson ?? {
          id: 55,
          display_name: 'Marta Ruiz',
          mail: 'm.ruiz@cgiar.org',
        },
      ),
    };

    service._emailNotificationManagementService = { sendEmail: jest.fn() };

    const result = {
      id: RESULT_ID,
      result_code: 9001,
      title: 'Drought-tolerant bean variety',
      version_id: 12,
      result_type_id: over.resultTypeId ?? 7,
      phase_year: over.phaseYear === undefined ? 2026 : over.phaseYear,
      lead_contact_person_id:
        over.leadContactPersonId === undefined ? 55 : over.leadContactPersonId,
    };

    return { service, result };
  }

  /** Every email the service handed to the sender, in order. */
  const sent = (service: any) =>
    service._emailNotificationManagementService.sendEmail.mock.calls.map(
      (c: any[]) => c[0].emailBody,
    );

  const run = (service: any, result: any) =>
    service._sendIpExpertNotificationsIfNeeded(result, RESULT_ID);

  describe('phase 2026 — the new wording', () => {
    it('sends the new body to each specialist and one confirmation', async () => {
      const { service, result } = makeService({ phaseYear: 2026 });

      await run(service, result);

      const bodies = sent(service);
      expect(bodies).toHaveLength(3); // two specialists + one confirmation
      expect(bodies[0].message.socketFile).toContain('NEW');
      expect(bodies[1].message.socketFile).toContain('NEW');
      expect(bodies[2].message.socketFile).toContain('CONFIRM');
    });

    it('puts the record id in the body, not only inside the link', async () => {
      const { service, result } = makeService({ phaseYear: 2026 });

      await run(service, result);

      expect(sent(service)[0].message.socketFile).toContain('9001');
    });

    it('names the LEAD CONTACT PERSON as the requesting user, not the submitter', async () => {
      const { service, result } = makeService({ phaseYear: 2026 });

      await run(service, result);

      const expertBody = sent(service)[0].message.socketFile;
      expect(expertBody).toContain('m.ruiz@cgiar.org');
      expect(expertBody).not.toContain('submitter@cgiar.org');
    });

    it('sends the confirmation to the lead contact person and lists everyone contacted', async () => {
      const { service, result } = makeService({ phaseYear: 2026 });

      await run(service, result);

      const confirmation = sent(service)[2];
      expect(confirmation.to).toEqual(['m.ruiz@cgiar.org']);
      expect(confirmation.message.socketFile).toContain('Marta Ruiz');
      expect(confirmation.message.socketFile).toContain('a.moreno@cgiar.org');
      expect(confirmation.message.socketFile).toContain('l.prado@cgiar.org');
    });

    it('falls back to the submitter when the lead contact cannot be resolved', async () => {
      // The specialist must always have somebody to write to.
      const { service, result } = makeService({
        phaseYear: 2026,
        leadContactPersonId: null,
      });

      await run(service, result);

      const bodies = sent(service);
      expect(bodies[0].message.socketFile).toContain('submitter@cgiar.org');
      // ...and the confirmation is skipped, because there is nobody to confirm to.
      expect(bodies).toHaveLength(2);
      expect(service._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No lead contact person'),
      );
    });
  });

  describe('phase 2025 — untouched', () => {
    it('keeps the old body and sends NO confirmation', async () => {
      const { service, result } = makeService({ phaseYear: 2025 });

      await run(service, result);

      const bodies = sent(service);
      expect(bodies).toHaveLength(2);
      expect(
        bodies.every((b: any) => b.message.socketFile.startsWith('OLD')),
      ).toBe(true);
    });

    it('does not even look the lead contact person up', async () => {
      // Not a performance point: reading it would be the first step towards leaking the 2026
      // wording into a 2025 email.
      const { service, result } = makeService({ phaseYear: 2025 });

      await run(service, result);

      expect(service._adUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('treats a result with no phase year as the old wording', async () => {
      // Legacy rows carry no phase. The safe side is the body that has always been sent.
      const { service, result } = makeService({ phaseYear: null });

      await run(service, result);

      expect(sent(service)[0].message.socketFile).toContain('OLD');
      expect(sent(service)).toHaveLength(2);
    });
  });

  describe('nothing costs the reporter their submission', () => {
    it('still emails the specialists when the confirmation template is missing', async () => {
      const { service, result } = makeService({
        phaseYear: 2026,
        templates: {
          email_template_ip_experts_support_2026: { template: 'NEW' },
        },
      });

      await run(service, result);

      expect(sent(service)).toHaveLength(2);
      expect(service._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('confirmation template not found'),
      );
    });

    it('does not throw when the confirmation send blows up', async () => {
      const { service, result } = makeService({ phaseYear: 2026 });
      service._emailNotificationManagementService.sendEmail = jest
        .fn()
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => {
          throw new Error('SES is down');
        });

      await expect(run(service, result)).resolves.not.toThrow();
      expect(service._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send the IP support confirmation'),
      );
    });

    it('sends nothing at all when the specialist template is missing', async () => {
      const { service, result } = makeService({
        phaseYear: 2026,
        templates: {},
      });

      await run(service, result);

      expect(sent(service)).toHaveLength(0);
    });
  });

  describe('the gates before any of this runs', () => {
    it('does nothing for a result that is not an Innovation Development', async () => {
      const { service, result } = makeService({ resultTypeId: 2 });

      await run(service, result);

      expect(sent(service)).toHaveLength(0);
    });

    it('does nothing when the reporter did not ask for IP support', async () => {
      const { service, result } = makeService({ hasContactRequest: false });

      await run(service, result);

      expect(sent(service)).toHaveLength(0);
    });

    it('does nothing when the centre has no specialists registered', async () => {
      const { service, result } = makeService({ experts: [] });

      await run(service, result);

      expect(sent(service)).toHaveLength(0);
      expect(service._logger.warn).toHaveBeenCalledWith(
        'No IP experts emails found',
      );
    });
  });
});
