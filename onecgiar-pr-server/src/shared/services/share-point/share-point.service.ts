import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { CreateUploadSessionDto } from 'src/api/results/evidences/dto/create-upload-session.dto';

@Injectable()
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

  async saveFile(file: Express.Multer.File, path: string, metadata) {
    const fileSizeInMB = file.size / (1024 * 1024); // Convert bytes to MB
    const fileSizeInGB = fileSizeInMB / 1024; // Convert MB to GB

    if (fileSizeInGB > 1) {
      throw new Error('File size exceeds 1GB');
    }
    return this.saveLargeFile(file, path, metadata);
  }

  async saveLargeFile(file: Express.Multer.File, path: string, metadata) {}

  async uploadLargeFileInUploadUrl(uploadUrl, file: Express.Multer.File) {
    const token = await this.getToken();
    const { buffer } = file;
    const chunkSize = 320 * 1024 * 31; // Approximately 10MB, but a multiple of 320 KiB
    let start = 0;
    let response;

    console.log('Saving files');
    while (start < buffer.length) {
      const end = Math.min(start + chunkSize, buffer.length);
      const chunk = buffer.slice(start, end);

      try {
        response = await this.httpService
          .put(uploadUrl, chunk, {
            maxBodyLength: Infinity,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/octet-stream',
              'Content-Length': chunk.length,
              'Content-Range': `bytes ${start}-${end - 1}/${buffer.length}`,
            },
          })
          .toPromise();
      } catch (error) {
        console.log(error);
        return error;
      }
      console.log('start: ' + start);

      start += chunkSize;
    }
    console.log('--------- end ---------');

    return response?.data;
  }

  async createUploadSession(createUploadSessionDto: CreateUploadSessionDto) {
    const { fileName, resultId } = createUploadSessionDto || {};

    const token = await this.getToken();
    const { filePath, pathInformation } = await this.generateFilePath(resultId);
    console.log(filePath);
    console.log(pathInformation);
    const newFolderId = await this.createFileFolder(filePath);
    const driveId = await this.GPCacheSE.getParam('sp_drive_id');
    const fileExtension = fileName.split('.').pop();
    const finalFileName = `result-${pathInformation?.result_code}-Document-${pathInformation?.date_as_name}.${fileExtension}`;
    const link = `${this.microsoftGraphApiUrl}/drives/${driveId}/items/${newFolderId}:/${finalFileName}:/createUploadSession`;
    console.log(finalFileName);

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
      return { uploadUrl: response?.data?.uploadUrl };
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
      return await this.consumeToken();
    } else {
      const remainingTimeInSeconds =
        this.creationTime + this.expiresIn - new Date().getTime() / 1000;
      const remainingTimeString = this.convertSecondsToTime(
        remainingTimeInSeconds,
      );
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
