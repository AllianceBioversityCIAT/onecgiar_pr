import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaConnectionDto } from './dto/create-clarisa-connection.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { HttpService } from '@nestjs/axios';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaTaskService } from '../clarisatask.service';
import { ResultByInitiativesRepository } from '../../api/results/results_by_inititiatives/resultByInitiatives.repository';

@Injectable()
export class ClarisaConnectionsService {
  private readonly clarisaHost: string = env.CLA_URL;
  constructor(
    private readonly _httpService: HttpService,
    private readonly _handlersError: HandlersError,
    private readonly _clarisaTaskService: ClarisaTaskService,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
  ) {}

  async create(
    createClarisaConnectionDto: CreateClarisaConnectionDto,
    resultId: number,
    user: TokenDto,
  ) {
    createClarisaConnectionDto.externalUserName = `${user.first_name} ${user.last_name}`;
    createClarisaConnectionDto.externalUserMail = user.email;
    createClarisaConnectionDto.misAcronym = 'PRMS';

    try {
      const result =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );
      if (!result) {
        throw {
          response: {},
          message: 'Result Level not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      createClarisaConnectionDto.requestSource = result.official_code;
      const token = await this.getClarisaToken();
      const data = await lastValueFrom(
        this._httpService
          .post(
            `${this.clarisaHost}api/partner-requests/create`,
            createClarisaConnectionDto,
            { headers: { Authorization: `Bearer ${token.response}` } },
          )
          .pipe(map((resp) => resp.data)),
      ).catch((res) => {
        console.log(res.data);
      });

      return {
        response: data.response,
        message: data.message,
        status: data.status,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getClarisaToken() {
    const config = {
      login: env.CLA_USER,
      password: env.CLA_PASSWORD,
    };
    try {
      const data = await lastValueFrom(
        this._httpService
          .post(`${this.clarisaHost}auth/login`, config)
          .pipe(map((resp) => resp.data)),
      );
      return {
        response: data.access_token,
        message: 'Validates correctly with CLARISA',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async executeTask() {
    await this._clarisaTaskService.clarisaBootstrap();
    await this._clarisaTaskService.clarisaBootstrapImportantData();
    await this._clarisaTaskService.tocDBBootstrap();
    return 1;
  }

  async clarisaQaToken(officialCode: string, user: TokenDto) {
    try {
      const config = {
        name: `${user.first_name} ${user.last_name}`,
        username: user.email?.split('@')[0],
        email: user.email,
        misAcronym: 'PRMS',
        appUser: user.id,
        official_code: officialCode,
      };
      const token = await this.getClarisaToken();
      const data = await lastValueFrom(
        this._httpService
          .post(`${this.clarisaHost}api/qa-token`, config, {
            headers: { Authorization: `Bearer ${token.response}` },
          })
          .pipe(map((resp) => resp.data)),
      );
      return {
        response: {
          ...data,
          crp_id: data['official_code'],
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
