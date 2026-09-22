import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BilateralAccessService } from './bilateral-access.service';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

// BIL-RTE-T-1 — design §5.1: the access helper exposes three decisions (Center write, ToC write,
// Decision). Falsifier from tasks.md: {admin, read-only program role, non-member, Center user} ×
// {status 1, 5, 8} × {center, toc, decision}. Concrete example pinned by the task: a read-only
// program role on SP X, ToC write for SP X at status 5 → allow; the same user for SP Y → 403.
//
// Rework, attempt 2 (Reviewer FAIL): every call now threads an `endpoint` label (FAIL #2 — the
// warn log must carry it, `rule` alone doesn't stand in for it), and both membership reads are
// primed to also require the linked initiative to be active (FAIL #1 — see
// RoleByUser.repository.spec.ts for the query-shape assertions on `ci.active > 0`).

const RESULT_ID = 555;
const SP_X = 42; // the persona's own initiative
const SP_Y = 77; // another program's initiative, also linked to the same result
const ENDPOINT = 'general-info';

type Persona = 'admin' | 'programReadOnly' | 'nonMember' | 'centerUser';

const PERSONAS: Persona[] = [
  'admin',
  'programReadOnly',
  'nonMember',
  'centerUser',
];

const STATUSES = [
  ResultStatusData.Editing.value, // 1
  ResultStatusData.PendingReview.value, // 5
  ResultStatusData.Draft.value, // 8
];

function buildUser(): TokenDto {
  return {
    id: 900,
    email: 'reviewer@example.org',
    first_name: 'Ana',
    last_name: 'Reviewer',
  };
}

describe('BilateralAccessService', () => {
  let service: BilateralAccessService;
  let roleByUserRepository: jest.Mocked<
    Pick<
      RoleByUserRepository,
      | 'isUserAdmin'
      | 'hasActiveRoleOnInitiative'
      | 'hasActiveRoleOnAnyInitiativeLinkedToResult'
    >
  >;
  let resultByInitiativesRepository: jest.Mocked<
    Pick<
      ResultByInitiativesRepository,
      'getContributorInitiativeAndPrimaryByResult'
    >
  >;

  beforeEach(async () => {
    roleByUserRepository = {
      isUserAdmin: jest.fn(),
      hasActiveRoleOnInitiative: jest.fn(),
      hasActiveRoleOnAnyInitiativeLinkedToResult: jest.fn(),
    } as any;
    resultByInitiativesRepository = {
      getContributorInitiativeAndPrimaryByResult: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralAccessService,
        {
          provide: RoleByUserRepository,
          useValue: roleByUserRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: resultByInitiativesRepository,
        },
      ],
    }).compile();

    service = module.get<BilateralAccessService>(BilateralAccessService);

    // Every result the matrix exercises has two linked programs: SP X (the persona's own) and
    // SP Y (another program), which is what makes the "same user, other program" falsifier
    // meaningful — SP Y really is linked to the result, just not to this user.
    // `getContributorInitiativeAndPrimaryByResult` (resultByInitiatives.repository.ts:367-371)
    // already filters on `ci.active > 0` — its rows stand in for "active AND linked" throughout.
    resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult.mockResolvedValue(
      [{ id: SP_X } as any, { id: SP_Y } as any],
    );
  });

  /** Wires the role-repository mocks for one persona. Both reads already imply the initiative is
   * active (`ci.active > 0`) — that column check is exercised at the repository level. */
  function primePersona(persona: Persona) {
    switch (persona) {
      case 'admin':
        roleByUserRepository.isUserAdmin.mockResolvedValue(true);
        roleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult.mockResolvedValue(
          false,
        );
        break;
      case 'programReadOnly':
        roleByUserRepository.isUserAdmin.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnInitiative.mockImplementation(
          (_userId: number, initiativeId: number) =>
            Promise.resolve(initiativeId === SP_X),
        );
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult.mockResolvedValue(
          true,
        );
        break;
      case 'nonMember':
        roleByUserRepository.isUserAdmin.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult.mockResolvedValue(
          false,
        );
        break;
      case 'centerUser':
        // A Center user's role_by_user rows carry a center_id, not an initiative_id — both
        // membership reads legitimately come back false, same as a non-member.
        roleByUserRepository.isUserAdmin.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(false);
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult.mockResolvedValue(
          false,
        );
        break;
    }
  }

  describe('assertCenterWrite — matrix', () => {
    it.each(
      PERSONAS.flatMap((persona) =>
        STATUSES.map((status) => [persona, status] as const),
      ),
    )('persona=%s status=%s', async (persona, status) => {
      primePersona(persona);
      const user = buildUser();
      const result = { id: RESULT_ID, status_id: status };

      const shouldAllow =
        persona === 'admin' || status !== ResultStatusData.PendingReview.value;

      if (shouldAllow) {
        await expect(
          service.assertCenterWrite(result, ENDPOINT, user),
        ).resolves.toBeUndefined();
      } else {
        await expect(
          service.assertCenterWrite(result, ENDPOINT, user),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('assertTocWrite — matrix', () => {
    it.each(
      PERSONAS.flatMap((persona) =>
        STATUSES.map((status) => [persona, status] as const),
      ),
    )('persona=%s status=%s (own initiative)', async (persona, status) => {
      primePersona(persona);
      const user = buildUser();
      const result = { id: RESULT_ID, status_id: status };

      if (persona === 'admin') {
        await expect(
          service.assertTocWrite(result, SP_X, 'toc-metadata', user),
        ).resolves.toBeUndefined();
        return;
      }

      if (status !== ResultStatusData.PendingReview.value) {
        await expect(
          service.assertTocWrite(result, SP_X, 'toc-metadata', user),
        ).rejects.toThrow(ConflictException);
        return;
      }

      if (persona === 'programReadOnly') {
        await expect(
          service.assertTocWrite(result, SP_X, 'toc-metadata', user),
        ).resolves.toBeUndefined();
      } else {
        await expect(
          service.assertTocWrite(result, SP_X, 'toc-metadata', user),
        ).rejects.toThrow(ForbiddenException);
      }
    });

    // The falsifier pinned by tasks.md: a read-only role on SP X does not carry over to SP Y,
    // even though SP Y is linked to the very same result.
    it('read-only role on SP X saving ToC for SP Y (linked, not theirs) at status 5 → 403', async () => {
      primePersona('programReadOnly');
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertTocWrite(result, SP_Y, 'toc-metadata', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('holding the role but the initiative is NOT linked to the result → 403', async () => {
      primePersona('programReadOnly');
      roleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(true);
      resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult.mockResolvedValue(
        [{ id: SP_Y } as any], // SP X is not in the linked list
      );
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertTocWrite(result, SP_X, 'toc-metadata', user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertDecision — matrix', () => {
    it.each(
      PERSONAS.flatMap((persona) =>
        STATUSES.map((status) => [persona, status] as const),
      ),
    )('persona=%s status=%s', async (persona, status) => {
      primePersona(persona);
      const user = buildUser();
      const result = { id: RESULT_ID, status_id: status };

      const shouldAllow = persona === 'admin' || persona === 'programReadOnly';

      if (shouldAllow) {
        await expect(
          service.assertDecision(result, 'review-decision', user),
        ).resolves.toBeUndefined();
      } else {
        await expect(
          service.assertDecision(result, 'review-decision', user),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('admin is checked first', () => {
    it('assertCenterWrite never calls the membership reads for an admin', async () => {
      primePersona('admin');
      const user = buildUser();
      await service.assertCenterWrite(
        { id: RESULT_ID, status_id: ResultStatusData.PendingReview.value },
        ENDPOINT,
        user,
      );
      expect(
        roleByUserRepository.hasActiveRoleOnInitiative,
      ).not.toHaveBeenCalled();
      expect(
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult,
      ).not.toHaveBeenCalled();
    });

    it('assertTocWrite never calls the membership reads for an admin', async () => {
      primePersona('admin');
      const user = buildUser();
      await service.assertTocWrite(
        { id: RESULT_ID, status_id: ResultStatusData.PendingReview.value },
        SP_Y,
        'toc-metadata',
        user,
      );
      expect(
        roleByUserRepository.hasActiveRoleOnInitiative,
      ).not.toHaveBeenCalled();
    });

    it('assertDecision never calls the membership read for an admin', async () => {
      primePersona('admin');
      const user = buildUser();
      await service.assertDecision(
        { id: RESULT_ID, status_id: ResultStatusData.Editing.value },
        'review-decision',
        user,
      );
      expect(
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult,
      ).not.toHaveBeenCalled();
    });
  });

  // Reviewer advisory (rework, attempt 2): a caller with no usable `user.id` must fail closed
  // with a 403, not reach the repository call with an undefined bind param (which would surface
  // as a 500, not a 403). Not gating — kept to a one-line guard, asserted here.
  describe('fails closed when the caller has no usable user id (advisory)', () => {
    it('assertTocWrite: user with no id → 403, no repository call', async () => {
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertTocWrite(result, SP_X, 'toc-metadata', {} as TokenDto),
      ).rejects.toThrow(ForbiddenException);
      expect(
        roleByUserRepository.hasActiveRoleOnInitiative,
      ).not.toHaveBeenCalled();
    });

    it('assertDecision: user with no id → 403, no repository call', async () => {
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertDecision(result, 'review-decision', {} as TokenDto),
      ).rejects.toThrow(ForbiddenException);
      expect(
        roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult,
      ).not.toHaveBeenCalled();
    });
  });

  describe('NFR — 403 body and observability (requirements.md §7, design §9)', () => {
    it('the 403 body carries no token, email or other user data — only a message and ids', async () => {
      primePersona('nonMember');
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      let caught: ForbiddenException | undefined;
      try {
        await service.assertCenterWrite(result, ENDPOINT, user);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(ForbiddenException);
      const body = caught!.getResponse();
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(user.email);
      expect(serialized).not.toContain(user.first_name);
      expect(serialized).not.toContain(user.last_name);
      expect(serialized).not.toContain(String(user.id));
    });

    it('logs a warn with result id, endpoint, rule and user id only on a 403', async () => {
      const logSpy = jest
        .spyOn((service as any)._logger, 'warn')
        .mockImplementation(() => undefined);
      primePersona('nonMember');
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertDecision(result, 'review-decision', user),
      ).rejects.toThrow(ForbiddenException);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [message] = logSpy.mock.calls[0];
      expect(message).toContain(String(RESULT_ID));
      expect(message).toContain('review-decision');
      expect(message).toContain('decision');
      expect(message).toContain(String(user.id));
      expect(message).not.toContain(user.email);
      logSpy.mockRestore();
    });

    it('the endpoint label distinguishes calls sharing the same rule (center covers 7 writes)', async () => {
      const logSpy = jest
        .spyOn((service as any)._logger, 'warn')
        .mockImplementation(() => undefined);
      primePersona('nonMember');
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.PendingReview.value,
      };

      await expect(
        service.assertCenterWrite(result, 'contributors', user),
      ).rejects.toThrow(ForbiddenException);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [message] = logSpy.mock.calls[0];
      expect(message).toContain('contributors');
      logSpy.mockRestore();
    });

    it('does NOT log on a 409 (only 403s are logged, per design §9)', async () => {
      const logSpy = jest
        .spyOn((service as any)._logger, 'warn')
        .mockImplementation(() => undefined);
      primePersona('programReadOnly');
      const user = buildUser();
      const result = {
        id: RESULT_ID,
        status_id: ResultStatusData.Editing.value,
      };

      await expect(
        service.assertTocWrite(result, SP_X, 'toc-metadata', user),
      ).rejects.toThrow(ConflictException);

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
