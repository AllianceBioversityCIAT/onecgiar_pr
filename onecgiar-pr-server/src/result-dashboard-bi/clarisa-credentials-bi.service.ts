import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { CredentialsClarisaBi } from './bi-reports/dto/crendentials-clarisa.dto';

@Injectable()
export class ClarisaCredentialsBiService {
  constructor(private readonly _httpService: HttpService) {}
  private readonly clarisaHost: string = `${env.CLA_URL}`;
  private readonly configAuth = {
    auth: {
      username: env.CLA_USER,
      password: env.CLA_PASSWORD,
    },
  };

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
    } catch (_error) {
      return { Error: 'Error' };
    }
  }

  async getCredentialsBi() {
    const token = await this.getClarisaToken();
    const dataCredentials: CredentialsClarisaBi = await lastValueFrom(
      await this._httpService
        .get(`${this.clarisaHost}api/bi-parameters/getUnitAll`, {
          headers: { Authorization: `Bearer ${token.response}` },
        })
        .pipe(map((resp) => resp.data)),
    );
    return dataCredentials;
  }
}
