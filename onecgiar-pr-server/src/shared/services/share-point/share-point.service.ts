import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';

@Injectable()
export class SharePointService {
  private token;
  private expiresIn;

  constructor(
    private readonly httpService: HttpService,
    private readonly _globalParameterCacheService: GlobalParameterCacheService,
  ) {}

  async getToken() {
    return await this.validateExpiration();
  }

  async consumeToken() {
    const grantType = 'client_credentials';
    const clientId = '4a5dcd8a-9fad-4037-90aa-8e0cdbf01796';
    const scope = 'https://graph.microsoft.com/.default';
    const clientSecret = 'Y_j8Q~YJoHIQhCKLLxwdetMxSRMp40E4o_pHWa.u';

    const url = `https://login.microsoftonline.com/6afa0e00-fa14-40b7-8a2e-22a7f8c357d5/oauth2/v2.0/token`;

    const data = new URLSearchParams();
    data.append('client_id', clientId);
    data.append('client_secret', clientSecret);
    data.append('scope', scope);
    data.append('grant_type', grantType);
    try {
      const response = await this.httpService
        .post(url, data, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
        .toPromise();

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in; // El tiempo de expiración en segundos

      // Guardamos el token en caché
      this.token = token;
      this.expiresIn = expiresIn;
      return token;
    } catch (error) {
      console.error('Error al obtener el token:', error.message);
      throw new Error('Error al obtener el token');
    }
  }

  async validateExpiration() {
    // The "expires_in" field provides the duration in seconds until the access token expires.
    // For example, if the value of "expires_in" is 3599, it means that the token will expire in 3599 seconds,
    // which is approximately 59 minutes and 59 seconds.
    const currentTime = new Date().getTime() / 1000;
    const tokenExpirationTime = currentTime + this.expiresIn;

    const seconds = this.expiresIn % 60;
    const totalMinutes = Math.floor(this.expiresIn / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    // Función para comprobar si el token ha expirado
    function hasTokenExpired(tokenExpirationTime: number): boolean {
      const currentTime = new Date().getTime() / 1000;
      console.log('currentTime', currentTime);
      console.log('tokenExpirationTime', tokenExpirationTime);
      return currentTime >= tokenExpirationTime;
    }

    const useTokenInMemory =
      typeof this.expiresIn == 'number'
        ? !hasTokenExpired(tokenExpirationTime)
        : false;
    console.log(useTokenInMemory);
    if (useTokenInMemory) {
      const timeString = `${hours} hour(s), ${minutes} minute(s), and ${seconds} second(s)`;
      console.log(`El token caducará en: ${timeString}`);
      return this.token;
    } else {
      console.log('consumir token');
      return await this.consumeToken();
    }
  }
}
