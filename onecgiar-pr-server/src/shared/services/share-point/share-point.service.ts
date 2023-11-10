import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';

@Injectable()
export class SharePointService {
  private token = null;
  private expiresIn = null;
  private creationTime = null;
  private microsoftGraphApiUrl = '';
  constructor(
    private readonly httpService: HttpService,
    private readonly GPCacheSE: GlobalParameterCacheService,
  ) {
    this.getMicrosoftGraphApiUrl();
  }

  async getMicrosoftGraphApiUrl() {
    this.microsoftGraphApiUrl = await this.GPCacheSE.getParam(
      'sp_microsoft_graph_api_url',
    );
  }

  async saveFile(file: Express.Multer.File, path: string, metadata) {
    const { date_as_name, result_id } = metadata || {};
    const token = await this.getToken();

    const { originalname, buffer } = file;

    const fileExtension = originalname.split('.').pop();

    const fileName = `result-${result_id}-Document-${date_as_name}.${fileExtension}`;

    const siteId = await this.GPCacheSE.getParam('sp_site_id');
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/sites/${siteId}/drives/${driveId}/items/root:${path}/${fileName}:/content`;

    try {
      const response = await this.httpService
        .put(link, buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response?.data;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async addFileAccess(fileId, convertToPublic: boolean) {
    await this.removeAllFilePermissions(fileId);

    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${fileId}/createLink`;
    const body = {
      type: 'view',
      scope: convertToPublic ? 'anonymous' : 'organization',
    };
    try {
      const response = await this.httpService
        .post(link, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response.data;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async removeAllFilePermissions(fileId) {
    const permissionsList = await this.getAllFilePermissions(fileId);
    await Promise.all(
      permissionsList.map((pId) => this.removeFilePermission(fileId, pId)),
    );
  }

  async getAllFilePermissions(fileId) {
    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${fileId}/permissions`;
    try {
      const response = await this.httpService
        .get(link, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response?.data?.value
        ?.filter(
          (p) =>
            p?.link?.scope == 'organization' || p?.link?.scope == 'anonymous',
        )
        ?.map((p) => p.id);
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async removeFilePermission(fileId, permissionId) {
    // DELETE https://graph.microsoft.com/v1.0/drives/{{testing_drive_id}}/items/012LTNW5BGG43ZSDLMRJBLR6S6663GB734/permissions/b4fc3914-b1b5-4147-8d44-13b1ce65eb45
    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${fileId}/permissions/${permissionId}`;
    try {
      const response = await this.httpService
        .delete(link, {
          headers: {
            'Content-Type': 'application/json',
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
      // console.log('El token ha expirado. Renovando el token...');
      return await this.consumeToken();
    } else {
      // console.log('El token aún no ha expirado. No se requiere renovación.');
      const remainingTimeInSeconds =
        this.creationTime + this.expiresIn - new Date().getTime() / 1000;
      const remainingTimeString = this.convertSecondsToTime(
        remainingTimeInSeconds,
      );
      // console.log(`El token caducará en: ${remainingTimeString}`);
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

  //? ------------------ Replicate file ------------------
  async replicateFile(fileId) {
    const newFolderId = await this.createFileFolder('/path/foldergif');
    const fileInfo = await this.getFileInfo(fileId);
    await this.copyFile(fileId, newFolderId, fileInfo?.name);
  }

  async createFileFolder(path: string) {
    const token = await this.getToken();
    const siteId = await this.GPCacheSE.getParam('sp_site_id');
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/sites/${siteId}/drives/${driveId}/items/root:${path}/.folder-reference:/content`;
    const emptyBuffer = Buffer.alloc(0);
    try {
      const response = await this.httpService
        .put(link, emptyBuffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      if (response?.data?.name === '.folder-reference')
        this.deleteFile(response?.data?.id);
      return response?.data?.parentReference?.id;
    } catch (error) {
      console.log('erroooooooooooooooooooooooooooooooooooooooooooooooooooooor');
      console.log(error);
      return error;
    }
  }

  async deleteFile(fileId) {
    const token = await this.getToken();
    const siteId = await this.GPCacheSE.getParam('sp_site_id');
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/sites/${siteId}/drives/${driveId}/items/${fileId}`;
    try {
      const response = await this.httpService
        .delete(link, {
          headers: {
            'Content-Type': 'application/json',
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

  async getFileInfo(fileId) {
    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${fileId}`;
    try {
      const response = await this.httpService
        .get(link, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response.data;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async copyFile(currentFileId, destinationFolderId, currentFileName) {
    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${currentFileId}/copy`;
    const body = {
      parentReference: {
        driveId,
        id: destinationFolderId,
      },
      name: currentFileName,
    };

    try {
      const response = await this.httpService
        .post(link, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response.data;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
