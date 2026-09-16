import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';
import { GlobalParameterCacheService } from '../cache/global-parameter-cache.service';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { CreateUploadSessionDto } from 'src/api/results/evidences/dto/create-upload-session.dto';
import { ReturnResponseUtil } from '../../utils/response.util';

@Injectable()
export class SharePointService {
  private readonly _logger = new Logger(SharePointService.name);
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
      console.log({
        driveId,
        newFolderId,
        filePath,
        finalFileName,
      });
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
      console.error('CreateUploadSession error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        headers: error?.response?.headers,
        stack: error?.stack,
      });

      throw new Error(
        JSON.stringify({
          status: error?.response?.status,
          data: error?.response?.data,
        }),
      );
    }
  }

  /**
   * `ADE-T-3` / DD-3 — bounds every outbound Graph call `uploadFromStream` makes.
   *
   * 30 s: generous enough that a 25 MB upload (the AI cap, `bilateral-ai-file-storage.service.ts`)
   * completes even on a slow link — 25 MB/30 s ≈ 0.83 MB/s — while still keeping a hung
   * `promoteDraft` request bounded well within human patience. `createUploadSession`'s own POST
   * (a small JSON body) and the byte PUT each get this budget independently: a slow session mint
   * does not eat into the time left for the upload that follows.
   *
   * `HttpModule` (`share-point.module.ts`) carries no timeout and stays that way (DD-3 rejected
   * a global one — it would change behavior for `evidences`, `toc-results` and `versioning`).
   * This constant is consumed only inside `uploadFromStream` via `withGraphTimeout`, so no other
   * `SharePointService` caller is affected.
   */
  private static readonly UPLOAD_FROM_STREAM_GRAPH_TIMEOUT_MS = 30_000;

  /**
   * Races `promise` against a timer so a Graph call that never settles is abandoned rather than
   * hung on forever — the mechanism DD-3 asks for. Note this does not abort the underlying
   * axios/rxjs request (the `HttpModule` it rides has no `AbortController` wiring); it only stops
   * this method from *waiting* on it, which is what makes a transfer failure "an ordinary
   * per-document failure" (`ADE-R-9`) instead of a stuck promotion.
   */
  private async withGraphTimeout<T>(
    promise: Promise<T>,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `SharePoint Graph call timed out after ${SharePointService.UPLOAD_FROM_STREAM_GRAPH_TIMEOUT_MS}ms (${label})`,
          ),
        );
      }, SharePointService.UPLOAD_FROM_STREAM_GRAPH_TIMEOUT_MS);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Server-side counterpart to `createUploadSession` (§7.2, `design.md`): mints the upload
   * session the same way, then performs the `PUT` itself instead of handing the session URL to a
   * browser. Mirrors the client's `PUT_loadFileInUploadSession` shape (`Content-Type:
   * application/octet-stream`, `Content-Range: bytes 0-{size-1}/{size}`) — see
   * `results-api.service.ts:334-355` for why the client also has a fragmenting variant and this
   * path does not need one: Graph refuses any single request ≥ 60 MiB (P2-3318) and the AI
   * uploader caps every source at 25 MB, so this is always a single request.
   *
   * `count: 1` mirrors a single-file upload session (the client's running `count` exists only to
   * disambiguate a multi-file batch uploaded in one go); each draft-evidence document is
   * transferred one at a time, so the caller never needs to track an index.
   *
   * Does not change `createUploadSession`'s signature or behavior — it is called exactly as any
   * other caller would call it, just bounded here by `withGraphTimeout` so a hang cannot strand
   * `promoteDraft` (DD-3, `ADE-R-5`).
   *
   * 🛑 `Content-Length` is set EXPLICITLY here and must stay explicit — do not "clean this up" by
   * letting axios infer it. The client path (`results-api.service.ts:334-355`) never has this
   * problem because the browser uploads a `Blob`, and `XMLHttpRequest`/`fetch` compute and set
   * `Content-Length` for a `Blob` body on their own. This path uploads a Node `Readable`, and
   * axios 1.x cannot determine the length of a stream, so it drops `Content-Length` and Node
   * falls back to `Transfer-Encoding: chunked`. Microsoft Graph's upload-session PUT rejects a
   * chunked request outright (`411 Length Required` / a opaque `400 invalidRequest`), so every
   * document silently failed to upload in production even though `promoteDraft` returned 200 —
   * the per-document catch swallowed the failure and the `evidence` table stayed empty. Passing
   * `size` (already required to build `Content-Range`) as `Content-Length` is what makes Graph
   * accept the PUT.
   */
  async uploadFromStream(
    resultId: string,
    fileName: string,
    stream: Readable,
    size: number,
  ): Promise<{ id: string; name: string }> {
    // Fails BEFORE the network call so the error names the file and size instead of surfacing as
    // Graph's opaque 400 on `Content-Range: bytes 0--1/0`. `size` also drives `Content-Length`
    // above, so a bad value here would otherwise corrupt both headers at once.
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error(
        `SharePoint uploadFromStream: invalid size (${size}) for file "${fileName}" — size must be a positive integer`,
      );
    }

    const session = await this.withGraphTimeout(
      this.createUploadSession({ fileName, resultId, count: 1 }),
      'createUploadSession',
    );
    const uploadUrl: string = session?.response;

    const response = await this.withGraphTimeout(
      this.httpService
        .put(uploadUrl, stream, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(size),
            'Content-Range': `bytes 0-${size - 1}/${size}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })
        .toPromise(),
      'uploadFromStream PUT',
    );

    return { id: response?.data?.id, name: response?.data?.name };
  }

  /**
   * Revokes the sharing links the app can see on the item and then issues a fresh one.
   *
   * 🛑 The revocation is NOT guaranteed. Measured on prtest on 9 Sep 2026 (result 9075,
   * evidence 13081): toggling an evidence public -> confidential -> public returns the
   * SAME two urls every time, so `createLink` is handing back permissions that already
   * exist and neither of them is being deleted. Both an anonymous and an organization
   * link end up living on the document at once, and switching the evidence to
   * confidential only changes WHICH of the two we store — the anonymous one keeps
   * serving the file. The cause of the failed delete is not established (it needs the
   * container log or a Graph call), which is why the outcome now travels back to the
   * caller under `revocation` instead of being discarded.
   *
   * The success contract is unchanged: callers read `link.webUrl` exactly as before, and
   * this method still never throws on a revocation problem.
   */
  async addFileAccess(fileId, convertToPublic: boolean) {
    const revocation = await this.removeAllFilePermissions(fileId);

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
      return { ...response.data, revocation };
    } catch (error) {
      this._logger.error(
        `SharePoint: createLink failed for document ${fileId} (scope ${
          convertToPublic ? 'anonymous' : 'organization'
        }): status ${error?.response?.status} code ${
          error?.response?.data?.error?.code
        } - ${error?.message}`,
      );
      return error;
    }
  }

  /**
   * Returns one outcome per permission it tried to delete, so the caller can tell a real
   * revocation from a silent failure. A successful DELETE resolves the axios response
   * (numeric `status`); a failed one resolves the Error, which has none.
   */
  /**
   * Lists the sharing permissions of an item, keeping the SCOPE and telling the caller
   * apart "there are none" from "I could not look".
   *
   * `getAllFilePermissions` cannot answer either question: it returns bare ids, so an
   * `organization` link (already private) is indistinguishable from an `anonymous` one,
   * and on a Graph failure it resolves with the Error, which reads as an empty list —
   * i.e. it fails OPEN, reporting a file as private when it never checked.
   */
  private async _listSharingPermissions(fileId): Promise<{
    read: boolean;
    permissions: { id: string; scope: string | null }[];
  }> {
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
      const permissions = (response?.data?.value ?? [])
        .filter((p) => p?.link)
        .map((p) => ({ id: p.id, scope: p?.link?.scope ?? null }));
      return { read: true, permissions };
    } catch (error) {
      this._logger.error(
        `SharePoint: listing permissions failed for document ${fileId}: status ${
          error?.response?.status
        } code ${error?.response?.data?.error?.code} - ${error?.message}`,
      );
      return { read: false, permissions: [] };
    }
  }

  async removeAllFilePermissions(fileId) {
    const permissionsList = await this.getAllFilePermissions(fileId);
    const attempted = Array.isArray(permissionsList) ? permissionsList : [];
    const results = await Promise.all(
      attempted.map((pId) => this.removeFilePermission(fileId, pId)),
    );
    const outcomes = results.map((result: any, index: number) => ({
      permissionId: attempted[index],
      ok: typeof result?.status === 'number' && result.status < 300,
      status: result?.status ?? result?.response?.status ?? null,
    }));

    // 🥇 Trusting the DELETE is what hid this for so long. Read the permissions back:
    // it is the only way to tell an actual revocation from one that resolved fine and
    // changed nothing, and it distinguishes the two live hypotheses without needing the
    // container log — `attempted: 0` means we never even saw the link we had to remove,
    // while a surviving permission after a "successful" delete means Graph kept it.
    const readBack = await this._listSharingPermissions(fileId);
    // 🛑 Only ANONYMOUS survivors make a file publicly reachable. An `organization`
    // link is already private, so counting it would refuse a save that is in fact fine.
    const publicSurvivors = readBack.permissions.filter(
      (p) => p.scope === 'anonymous',
    );

    return {
      attempted: attempted.length,
      outcomes,
      survivors: readBack.permissions.map((p) => p.id),
      publicSurvivors: publicSurvivors.map((p) => p.id),
      // 🛑 Fails CLOSED on purpose: if the read-back did not happen we do not know, and
      // "I did not check" must never be reported as "it is private".
      verifiedPrivate: readBack.read && publicSurvivors.length === 0,
      readBackFailed: !readBack.read,
    };
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
      // Explicit fields only: the axios error carries config.headers.Authorization,
      // i.e. a Graph bearer token (.cursorrules).
      this._logger.error(
        `SharePoint: listing permissions failed for document ${fileId}: status ${
          error?.response?.status
        } code ${error?.response?.data?.error?.code} - ${error?.message}`,
      );
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
      this._logger.error(
        `SharePoint: could not remove permission ${permissionId} from document ${fileId} — the previous sharing link may still be live: status ${
          error?.response?.status
        } code ${error?.response?.data?.error?.code} - ${error?.message}`,
      );
      return error;
    }
  }
  async getToken() {
    if (this.isTokenExpired() || !this.expiresIn)
      return await this.consumeToken();
    return this.token;
  }

  /** 60 s of margin so a token cannot expire between two calls of the same operation. */
  private static readonly TOKEN_EXPIRY_MARGIN_SECONDS = 60;

  private isTokenExpired(): boolean {
    const currentTime = new Date().getTime() / 1000;
    const tokenExpirationTime =
      this.creationTime +
      this.expiresIn -
      SharePointService.TOKEN_EXPIRY_MARGIN_SECONDS;
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
