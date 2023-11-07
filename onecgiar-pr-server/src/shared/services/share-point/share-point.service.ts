import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';

@Injectable()
export class SharePointService {
  private token = null;
  private expiresIn = null;
  private creationTime = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly _globalParameterCacheService: GlobalParameterCacheService,
  ) {}

  async getToken() {
    if (this.isTokenExpired() || !this.expiresIn) {
      console.log('El token ha expirado. Renovando el token...');
      return await this.consumeToken();
    } else {
      console.log('El token aún no ha expirado. No se requiere renovación.');
      const remainingTimeInSeconds =
        this.creationTime + this.expiresIn - new Date().getTime() / 1000;
      const remainingTimeString = this.convertSecondsToTime(
        remainingTimeInSeconds,
      );
      console.log(`El token caducará en: ${remainingTimeString}`);
      return this.token;
    }
    // return await this.validateExpiration();
  }

  private isTokenExpired(): boolean {
    const currentTime = new Date().getTime() / 1000;
    const tokenExpirationTime = this.creationTime + this.expiresIn;
    return currentTime >= tokenExpirationTime;
  }

  private convertSecondsToTime(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingSeconds = seconds % 60;
    const remainingMinutes = totalMinutes % 60;
    return `${totalHours} hour(s), ${remainingMinutes} minute(s), and ${remainingSeconds} second(s)`;
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
      console.log(expiresIn);
      // Guardamos el token en caché
      this.token = token;
      this.expiresIn = expiresIn;
      this.creationTime = new Date().getTime() / 1000;
      return token;
    } catch (error) {
      console.error('Error al obtener el token:', error.message);
      throw new Error('Error al obtener el token');
    }
  }
}
