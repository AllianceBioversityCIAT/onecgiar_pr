import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { QaSpAccessController } from './qa-sp-access.controller';
import { QaSpAccessService } from './qa-sp-access.service';

describe('QaSpAccessController (P2-3911)', () => {
  it('returns the issued code in the standard envelope', async () => {
    const service = {
      getSpLink: jest
        .fn()
        .mockResolvedValue({ code: 'c', expiresAt: '2026-11-17T00:00:00Z' }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [QaSpAccessController],
      providers: [{ provide: QaSpAccessService, useValue: service }],
    }).compile();
    const controller = moduleRef.get(QaSpAccessController);
    const user = { id: 1, email: 'u@example.org' } as TokenDto;

    const result = await controller.getSpLink(user, 'SP01');

    expect(service.getSpLink).toHaveBeenCalledWith(user, 'SP01');
    expect(result).toEqual({
      response: { code: 'c', expiresAt: '2026-11-17T00:00:00Z' },
      message: 'Quality Assurance link issued',
      status: HttpStatus.OK,
    });
  });
});
