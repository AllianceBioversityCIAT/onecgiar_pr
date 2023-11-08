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
    private readonly GPCacheSE: GlobalParameterCacheService,
  ) {}

  async saveFile(file: Express.Multer.File, pathInformation) {
    const token = await this.getToken();

    const { originalname, buffer } = file;
    const microsoftGraphApiUrl = await this.GPCacheSE.getParam(
      'sp_microsoft_graph_api_url',
    );
    const siteId = await this.GPCacheSE.getParam('sp_site_id');
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const path = `/${pathInformation?.initiative_official_code}/result-${pathInformation?.result_id}/evidences`;
    const link = `${microsoftGraphApiUrl}/sites/${siteId}/drives/${driveId}/items/root:${path}/${originalname}:/content`;

    try {
      const response = await this.httpService
        .put(link, buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();

      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

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
    // Estructure URL
    const sp_token_url = await this.GPCacheSE.getParam('sp_token_url');
    const sp_tenant_id = await this.GPCacheSE.getParam('sp_tenant_id');
    const url = `${sp_token_url}/${sp_tenant_id}/oauth2/v2.0/token`;
    // ----
    const data = new URLSearchParams();
    const da = (param, value) => data.append(param, value);
    da('client_id', await this.GPCacheSE.getParam('sp_application_id'));
    da('client_secret', await this.GPCacheSE.getParam('sp_client_value'));
    da('scope', await this.GPCacheSE.getParam('sp_scope'));
    da('grant_type', await this.GPCacheSE.getParam('sp_grant_type'));
    try {
      const response = await this.httpService
        .post(url, data, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
        .toPromise();
      this.token = response.data.access_token;
      this.expiresIn = response.data.expires_in;
      this.creationTime = new Date().getTime() / 1000;
      return this.token;
    } catch (error) {
      console.error('Error al obtener el token:', error.message);
      throw new Error('Error al obtener el token');
    }
  }
}
