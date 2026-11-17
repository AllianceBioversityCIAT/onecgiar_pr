import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { env } from 'process';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import {
  QA_SP_ACCESS_TIMEOUT_MS,
  QA_SP_MESSAGES,
  QA_SP_NAME_MAX_LENGTH,
  QA_SP_PROGRAM_CODE_PATTERN,
  QA_SP_PROGRAM_ROLES,
} from './qa-sp-access.constants';

export interface QaSpLink {
  code: string;
  expiresAt: string;
}

/**
 * P2-3911 — issues a one-time code for the Science Program view of the new QA platform.
 *
 * Reporting decides who may get a code (program Lead, Co-Lead, Coordinator or Member, or a
 * Reporting admin); QA trusts this machine call. Contract:
 * `onecgiar_qa-sp/docs/sp-view/reporting-integration.md`.
 *
 * Never log the API key, the code, the response body or the user's email.
 */
@Injectable()
export class QaSpAccessService {
  private readonly logger = new Logger(QaSpAccessService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly roleByUserRepository: RoleByUserRepository,
  ) {}

  async getSpLink(
    user: TokenDto,
    programCode?: string | null,
  ): Promise<QaSpLink> {
    if (!user?.id || !user?.email) {
      throw new HttpException(
        QA_SP_MESSAGES.forbidden,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const code = programCode?.trim() || null;
    if (code !== null && !QA_SP_PROGRAM_CODE_PATTERN.test(code)) {
      throw new HttpException(
        QA_SP_MESSAGES.invalidProgram,
        HttpStatus.BAD_REQUEST,
      );
    }

    const isReportingAdmin = !!(await this.roleByUserRepository.isUserAdmin(
      user.id,
    ));

    if (!isReportingAdmin) {
      if (code === null) {
        throw new HttpException(
          QA_SP_MESSAGES.programRequired,
          HttpStatus.FORBIDDEN,
        );
      }
      const isMember =
        await this.roleByUserRepository.hasRoleOnProgramByOfficialCode(
          user.id,
          code,
          QA_SP_PROGRAM_ROLES,
        );
      if (!isMember) {
        throw new HttpException(QA_SP_MESSAGES.forbidden, HttpStatus.FORBIDDEN);
      }
    }

    return this.requestCode({
      email: user.email.trim(),
      name: this.buildName(user),
      programCode: code,
      isReportingAdmin,
    });
  }

  private buildName(user: TokenDto): string {
    const fullName = [user.first_name, user.last_name]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
      .join(' ');
    return (fullName || user.email.split('@')[0]).slice(
      0,
      QA_SP_NAME_MAX_LENGTH,
    );
  }

  private async requestCode(body: {
    email: string;
    name: string;
    programCode: string | null;
    isReportingAdmin: boolean;
  }): Promise<QaSpLink> {
    const baseUrl = (env.QA_SP_ACCESS_API_URL ?? '').trim().replace(/\/+$/, '');
    const apiKey = (env.QA_SP_ACCESS_API_KEY ?? '').trim();
    if (!baseUrl || !apiKey) {
      this.logger.warn('qa.spLink.unconfigured');
      throw new HttpException(
        QA_SP_MESSAGES.disabled,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let data: unknown;
    try {
      const response = await lastValueFrom(
        this.httpService.post(`${baseUrl}/sp-access/codes`, body, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: QA_SP_ACCESS_TIMEOUT_MS,
        }),
      );
      data = response?.data;
    } catch (error) {
      throw this.mapError(error);
    }

    const payload = (data as { data?: Partial<QaSpLink> })?.data;
    if (
      typeof payload?.code !== 'string' ||
      !payload.code ||
      typeof payload?.expiresAt !== 'string'
    ) {
      this.logger.error('qa.spLink.unexpectedResponse');
      throw new HttpException(QA_SP_MESSAGES.generic, HttpStatus.BAD_GATEWAY);
    }

    return { code: payload.code, expiresAt: payload.expiresAt };
  }

  /** Contract §2 error table. Logs status, QA error code and requestId only. */
  private mapError(error: any): HttpException {
    const status: number | undefined = error?.response?.status;
    const qaCode: string | undefined = error?.response?.data?.error?.code;
    const requestId: string | undefined =
      error?.response?.data?.meta?.requestId;
    const meta = [
      `status=${status ?? 'none'}`,
      `qaCode=${typeof qaCode === 'string' ? qaCode : 'none'}`,
      `requestId=${typeof requestId === 'string' ? requestId : 'none'}`,
    ].join(' ');

    if (status === undefined) {
      const isTimeout =
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.name === 'TimeoutError';
      this.logger.error(
        `qa.spLink.${isTimeout ? 'timeout' : 'networkError'} errorCode=${
          typeof error?.code === 'string' ? error.code : 'none'
        }`,
      );
      return new HttpException(
        QA_SP_MESSAGES.generic,
        isTimeout ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
      );
    }

    if (qaCode === 'SP_PROGRAM_UNKNOWN') {
      this.logger.warn(`qa.spLink.programUnknown ${meta}`);
      return new HttpException(
        QA_SP_MESSAGES.programUnknown,
        HttpStatus.NOT_FOUND,
      );
    }
    if (qaCode === 'SP_ACCESS_DISABLED') {
      this.logger.warn(`qa.spLink.disabled ${meta}`);
      return new HttpException(
        QA_SP_MESSAGES.disabled,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      this.logger.error(`qa.spLink.keyRejected ${meta}`);
    } else {
      this.logger.error(`qa.spLink.failed ${meta}`);
    }
    return new HttpException(QA_SP_MESSAGES.generic, HttpStatus.BAD_GATEWAY);
  }
}
