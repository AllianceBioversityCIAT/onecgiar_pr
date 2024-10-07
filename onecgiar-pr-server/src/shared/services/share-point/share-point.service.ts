import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { CreateUploadSessionDto } from 'src/api/results/evidences/dto/create-upload-session.dto';
import { ReturnResponseUtil } from '../../utils/response.util';

@Injectable()
//TODO change console.log for logger
export class SharePointService {
  private token = null;
  private expiresIn = null;
  private creationTime = null;
  private microsoftGraphApiUrl = '';
  constructor(
    private readonly httpService: HttpService,
    private readonly GPCacheSE: GlobalParameterCacheService,
    private readonly _evidencesRepository: EvidencesRepository,
  ) {
    this.getMicrosoftGraphApiUrl();
  }

  async getMicrosoftGraphApiUrl() {
    this.microsoftGraphApiUrl = await this.GPCacheSE.getParam(
      'sp_microsoft_graph_api_url',
    );
  }

  async createUploadSession(createUploadSessionDto: CreateUploadSessionDto) {
    const { fileName, resultId, count } = createUploadSessionDto || {};

    const token = await this.getToken();
    const { filePath, pathInformation } = await this.generateFilePath(resultId);
    const newFolderId = await this.createFileFolder(filePath);
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const fileExtension = fileName.split('.').pop();
    const lastSharepointId =
      await this._evidencesRepository.getLastSharepointId();
    const finalFileName = `result-${pathInformation?.result_code}-Document-${pathInformation?.date_as_name}-${
      (Number(lastSharepointId) || 0) + count
    }.${fileExtension}`;
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${newFolderId}:/${finalFileName}:/createUploadSession`;

    try {
      const response = await this.httpService
        .post(
          link,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        )
        .toPromise();
      return ReturnResponseUtil.format({
        message: 'Upload session created',
        response: response?.data?.uploadUrl,
        statusCode: 200,
      });
    } catch (error) {
      throw error;
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
        ?.filter((p) => p?.link?.hasOwnProperty('webUrl'))
        ?.map((p) => p.id);
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async removeFilePermission(fileId, permissionId) {
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
    if (this.isTokenExpired() || !this.expiresIn)
      return await this.consumeToken();
    return this.token;
  }

  private isTokenExpired(): boolean {
    const currentTime = new Date().getTime() / 1000;
    const tokenExpirationTime = this.creationTime + this.expiresIn;
    return currentTime >= tokenExpirationTime;
  }

  async consumeToken() {
    const sp_token_url = await this.GPCacheSE.getParam('sp_token_url');
    const sp_tenant_id = await this.GPCacheSE.getParam('sp_tenant_id');
    const url = `${sp_token_url}/${sp_tenant_id}/oauth2/v2.0/token`;
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

  async replicateFile(fileId, path) {
    const newFolderId = await this.createFileFolder(path);
    const fileInfo = await this.getFileInfo(fileId);
    await this.copyFile(fileId, newFolderId, fileInfo?.name);
    const filesList = await this.getFolderFilesList(newFolderId);
    const fileFound = filesList.find((f) => f.name === fileInfo?.name);
    return fileFound?.id;
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

  async getFolderFilesList(folderId) {
    const token = await this.getToken();
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${folderId}/children`;
    try {
      const response = await this.httpService
        .get(link, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        .toPromise();
      return response?.data?.value;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async generateFilePath(resultId) {
    const [pathInformation] =
      await this._evidencesRepository.getResultInformation(resultId);
    const filePath = `/${pathInformation?.phase_name}/Result ${pathInformation?.result_code}`;
    return { filePath, pathInformation };
  }
}
