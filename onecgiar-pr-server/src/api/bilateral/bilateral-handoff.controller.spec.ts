import 'reflect-metadata';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { BilateralHandoffController } from './bilateral-handoff.controller';
import {
  BilateralHandoffService,
  HandoffSessionUser,
} from './services/bilateral-handoff.service';
import { HandoffStartDto } from './dto/handoff-start.dto';
import { HandoffExchangeDto } from './dto/handoff-exchange.dto';
import { VerifiedSessionGuard } from './guards/verified-session.guard';
import { ClarisaApiKeyGuard } from './guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from './services/clarisa-api-key-validation.service';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from './decorators/bilateral-clarisa-endpoint.decorator';
import { ClarisaApiKeyValidationMis } from './interfaces/clarisa-api-key-validation.interface';

// @akili-spec bilateral/bulk-uploader-handoff (BIL-HO-T-5)
describe('BilateralHandoffController', () => {
  const validCode = 'a'.repeat(43);
  const audience = 'w3-bilateral-uploader:test';

  describe('guard and endpoint metadata', () => {
    // R-1 / R-6: the DoD grep for '@UserToken()' has no bearing on this — these
    // assertions prove the *guards themselves* are wired, not the decorator choice.
    it('applies VerifiedSessionGuard to start', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        BilateralHandoffController.prototype.start,
      );
      expect(guards).toContain(VerifiedSessionGuard);
    });

    it('applies ClarisaApiKeyGuard to exchange', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        BilateralHandoffController.prototype.exchange,
      );
      expect(guards).toContain(ClarisaApiKeyGuard);
    });

    it('labels the exchange endpoint for the CLARISA audit trail', () => {
      const label = Reflect.getMetadata(
        BILATERAL_CLARISA_ENDPOINT_KEY,
        BilateralHandoffController.prototype.exchange,
      );
      expect(label).toBe('/api/bilateral/handoff/exchange');
    });

    // Disqualifier guard: a spec that only checks the return value would pass even
    // with the guard removed. This one fails the moment `@UseGuards` is deleted.
    it('would fail if VerifiedSessionGuard were removed from start', () => {
      const guards =
        Reflect.getMetadata(
          '__guards__',
          BilateralHandoffController.prototype.start,
        ) ?? [];
      expect(guards.length).toBeGreaterThan(0);
    });

    // DoD: "Swagger renders both routes" — a local `GET /api-docs` run is out of scope
    // here (no DB, app not started). Asserted instead via the same metadata Nest's
    // `SwaggerModule` reads at document-build time (`@nestjs/swagger` DECORATORS.API_OPERATION
    // === 'swagger/apiOperation').
    it('documents both routes with @ApiOperation for Swagger', () => {
      const startOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        BilateralHandoffController.prototype.start,
      );
      const exchangeOperation = Reflect.getMetadata(
        'swagger/apiOperation',
        BilateralHandoffController.prototype.exchange,
      );

      expect(startOperation?.summary).toEqual(expect.any(String));
      expect(startOperation.summary.length).toBeGreaterThan(0);
      expect(exchangeOperation?.summary).toEqual(expect.any(String));
      expect(exchangeOperation.summary.length).toBeGreaterThan(0);
    });
  });

  describe('delegation to BilateralHandoffService (unit)', () => {
    let controller: BilateralHandoffController;
    let handoffService: { start: jest.Mock; exchange: jest.Mock };

    beforeEach(() => {
      handoffService = {
        start: jest.fn().mockResolvedValue({
          code: validCode,
          expires_in: 120,
          redirect_url: `https://partner.example/entry/?code=${validCode}&env=test`,
        }),
        exchange: jest
          .fn()
          .mockResolvedValue({ iss: 'https://reporting.cgiar.org' }),
      };
      controller = new BilateralHandoffController(
        handoffService as unknown as BilateralHandoffService,
      );
    });

    it('start passes the @DecodedUser() value and the DTO to the service, wrapped for the envelope', async () => {
      const user: HandoffSessionUser = {
        id: 42,
        email: 'a@cgiar.org',
        auth_method: 'saml',
      };
      const dto: HandoffStartDto = { center_code: 'CENTER-05' };

      const result = await controller.start(user, dto);

      expect(handoffService.start).toHaveBeenCalledWith(user, dto);
      expect(handoffService.start).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        response: {
          code: validCode,
          expires_in: 120,
          redirect_url: `https://partner.example/entry/?code=${validCode}&env=test`,
        },
      });
    });

    it('exchange passes the DTO and the resolved platform to the service, wrapped for the envelope', async () => {
      const dto: HandoffExchangeDto = { code: validCode, audience };
      const platform: ClarisaApiKeyValidationMis = {
        id: 1,
        name: 'Bulk Results Uploader',
        acronym: 'W3U',
      };

      const result = await controller.exchange(dto, platform);

      expect(handoffService.exchange).toHaveBeenCalledWith(dto, platform);
      expect(handoffService.exchange).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        response: { iss: 'https://reporting.cgiar.org' },
      });
    });
  });

  describe('routes wired through the real guards and pipes', () => {
    let app: INestApplication;
    const handoffService = { start: jest.fn(), exchange: jest.fn() };
    const clarisaValidationService = { validate: jest.fn() };

    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [BilateralHandoffController],
        providers: [
          { provide: BilateralHandoffService, useValue: handoffService },
          VerifiedSessionGuard,
          ClarisaApiKeyGuard,
          {
            provide: ClarisaApiKeyValidationService,
            useValue: clarisaValidationService,
          },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      // Stand-in for `JwtMiddleware`: only a request that explicitly opts in gets a
      // verified `req.user`, mirroring the public-route posture `VerifiedSessionGuard`
      // was written against (`verified-session.guard.ts`) — no header means no user.
      app.use((req: any, _res: any, next: () => void) => {
        const testUserId = req.headers['x-test-verified-user-id'];
        if (testUserId) {
          req.user = { id: Number(testUserId), auth_method: 'saml' };
        }
        next();
      });
      await app.init();

      handoffService.start.mockReset();
      handoffService.exchange.mockReset();
      clarisaValidationService.validate.mockReset();
    });

    afterEach(async () => {
      await app.close();
    });

    describe('start — VerifiedSessionGuard (R-1)', () => {
      it('rejects a request with no verified session with 401 and never calls the service', async () => {
        await request(app.getHttpServer())
          .post('/center/handoff')
          .send({ center_code: 'CENTER-05' })
          .expect(HttpStatus.UNAUTHORIZED);

        expect(handoffService.start).not.toHaveBeenCalled();
      });

      it('reaches the service for a verified session', async () => {
        handoffService.start.mockResolvedValue({
          code: validCode,
          expires_in: 120,
          redirect_url: 'https://partner.example/entry/?code=x&env=test',
        });

        await request(app.getHttpServer())
          .post('/center/handoff')
          .set('x-test-verified-user-id', '42')
          .send({ center_code: 'CENTER-05' })
          .expect(HttpStatus.OK);

        expect(handoffService.start).toHaveBeenCalledTimes(1);
      });
    });

    describe('HandoffStartDto validation', () => {
      it('rejects an extra property with 400 and never calls the service', async () => {
        await request(app.getHttpServer())
          .post('/center/handoff')
          .set('x-test-verified-user-id', '42')
          .send({ center_code: 'CENTER-05', not_a_field: 'nope' })
          .expect(HttpStatus.BAD_REQUEST);

        expect(handoffService.start).not.toHaveBeenCalled();
      });
    });

    describe('exchange — ClarisaApiKeyGuard (R-6)', () => {
      it('rejects a request with no x-api-key with 401, leaving the code unconsumed (service never called)', async () => {
        await request(app.getHttpServer())
          .post('/handoff/exchange')
          .send({ code: validCode, audience })
          .expect(HttpStatus.UNAUTHORIZED);

        expect(clarisaValidationService.validate).not.toHaveBeenCalled();
        expect(handoffService.exchange).not.toHaveBeenCalled();
      });
    });

    describe('HandoffExchangeDto validation (R-8: same body as a service miss)', () => {
      beforeEach(() => {
        clarisaValidationService.validate.mockResolvedValue({
          valid: true,
          mis: { id: 1, name: 'Bulk Results Uploader', acronym: 'W3U' },
          environment: 'TEST',
          scopes: [],
        });
      });

      it('accepts a 43-character code and reaches the service', async () => {
        handoffService.exchange.mockResolvedValue({
          iss: 'https://reporting.cgiar.org',
        });

        await request(app.getHttpServer())
          .post('/handoff/exchange')
          .set('x-api-key', 'test-key')
          .send({ code: validCode, audience })
          .expect(HttpStatus.OK);

        expect(handoffService.exchange).toHaveBeenCalledTimes(1);
      });

      it('rejects a 42-character code with the exact 400 body of a service miss, and never calls the service', async () => {
        const res = await request(app.getHttpServer())
          .post('/handoff/exchange')
          .set('x-api-key', 'test-key')
          .send({ code: 'a'.repeat(42), audience })
          .expect(HttpStatus.BAD_REQUEST);

        expect(res.body.message).toBe('Invalid or expired code');
        expect(handoffService.exchange).not.toHaveBeenCalled();
      });

      it('rejects an extra property with the exact 400 body of a service miss, and never calls the service', async () => {
        const res = await request(app.getHttpServer())
          .post('/handoff/exchange')
          .set('x-api-key', 'test-key')
          .send({ code: validCode, audience, not_a_field: 'nope' })
          .expect(HttpStatus.BAD_REQUEST);

        expect(res.body.message).toBe('Invalid or expired code');
        expect(handoffService.exchange).not.toHaveBeenCalled();
      });
    });
  });
});
