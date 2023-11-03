import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';

@Injectable()
export class SharePointService {
  // https://login.microsoftonline.com/6afa0e00-fa14-40b7-8a2e-22a7f8c357d5/oauth2/v2.0/token
  constructor(
    private readonly httpService: HttpService,
    private readonly _globalParameterCacheService: GlobalParameterCacheService,
  ) {}

  async getToken() {
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

      console.log(response.data);
      console.log(response.data.access_token);
      this.validateExp(response);

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in; // El tiempo de expiración en segundos

      return { token, expiresIn };
    } catch (error) {
      console.error('Error al obtener el token:', error.message);
      throw new Error('Error al obtener el token');
    }
  }

  validateExp(response) {
    // The "expires_in" field provides the duration in seconds until the access token expires.
    // For example, if the value of "expires_in" is 3599, it means that the token will expire in 3599 seconds,
    // which is approximately 59 minutes and 59 seconds.
    const expiresIn = response.data.expires_in; // tiempo en segundos hasta que el token expire
    const currentTime = new Date().getTime() / 1000; // tiempo actual en segundos

    const tokenExpirationTime = currentTime + expiresIn;

    // Función para comprobar si el token ha expirado
    function hasTokenExpired(tokenExpirationTime: number): boolean {
      const currentTime = new Date().getTime() / 1000;
      return currentTime >= tokenExpirationTime;
    }

    const tokenExpired = hasTokenExpired(tokenExpirationTime);
    if (tokenExpired) {
      // Realizar lógica para renovar el token
      // ...
      console.log('Vencido');
    } else {
      console.log('no vencido');
      console.log(currentTime);
      console.log(tokenExpirationTime);

      const seconds = expiresIn % 60;
      const totalMinutes = Math.floor(expiresIn / 60);
      const minutes = totalMinutes % 60;
      const hours = Math.floor(totalMinutes / 60);

      const timeString = `${hours} hour(s), ${minutes} minute(s), and ${seconds} second(s)`;
      console.log(`El token caducará en: ${timeString}`);
    }
  }
}

