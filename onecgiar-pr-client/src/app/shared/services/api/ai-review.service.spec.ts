import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AiReviewService } from './ai-review.service';
import { Router } from '@angular/router';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';
import { pipe } from 'rxjs';

describe('AiReviewService', () => {
  let service: AiReviewService;
  let httpMock: HttpTestingController;
  let mockRouter: { url: string };

  beforeEach(() => {
    mockRouter = { url: '/some/route' };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AiReviewService,
        { provide: Router, useValue: mockRouter },
        {
          provide: SaveButtonService,
          useValue: { isSavingPipe: () => pipe() }
        }
      ]
    });
    service = TestBed.inject(AiReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('onAIReviewClick', () => {
    it('should return immediately if aiReviewButtonState is not idle', async () => {
      service.aiReviewButtonState = 'loading';
      const createSessionSpy = jest.spyOn(service, 'POST_createSession');

      await service.onAIReviewClick();

      expect(createSessionSpy).not.toHaveBeenCalled();
    });

    it('should return immediately if aiReviewButtonState is completed', async () => {
      service.aiReviewButtonState = 'completed';
      const createSessionSpy = jest.spyOn(service, 'POST_createSession');

      await service.onAIReviewClick();

      expect(createSessionSpy).not.toHaveBeenCalled();
    });

    it('should proceed when aiReviewButtonState is idle', async () => {
      service.aiReviewButtonState = 'idle';
      const createSessionSpy = jest.spyOn(service, 'POST_createSession').mockRejectedValue(new Error('test'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.onAIReviewClick();

      expect(createSessionSpy).toHaveBeenCalled();
      expect(service.aiReviewButtonState).toBe('idle'); // reset on error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST_saveSession', () => {
    it('should increment generalInformationSaved when URL includes general-information', async () => {
      mockRouter.url = '/results/123/general-information';
      service.sessionId.set(1);
      const initialValue = service.generalInformationSaved();

      const promise = service.POST_saveSession({ fields: [] });

      const req = httpMock.expectOne(`${service.baseApiBaseUrl}ai/sessions/1/save`);
      req.flush({ response: 'ok' });

      await promise;
      expect(service.generalInformationSaved()).toBe(initialValue + 1);
    });

    it('should increment generalInformationSaved when URL includes innovation-dev-info', async () => {
      mockRouter.url = '/results/123/innovation-dev-info';
      service.sessionId.set(2);
      const initialValue = service.generalInformationSaved();

      const promise = service.POST_saveSession({ fields: [] });

      const req = httpMock.expectOne(`${service.baseApiBaseUrl}ai/sessions/2/save`);
      req.flush({ response: 'ok' });

      await promise;
      expect(service.generalInformationSaved()).toBe(initialValue + 1);
    });

    it('should NOT increment generalInformationSaved when URL does not include general-information or innovation-dev-info', async () => {
      mockRouter.url = '/results/123/other-section';
      service.sessionId.set(3);
      const initialValue = service.generalInformationSaved();

      const promise = service.POST_saveSession({ fields: [] });

      const req = httpMock.expectOne(`${service.baseApiBaseUrl}ai/sessions/3/save`);
      req.flush({ response: 'ok' });

      await promise;
      expect(service.generalInformationSaved()).toBe(initialValue);
    });

    it('should reject on error', async () => {
      mockRouter.url = '/results/123/something';
      service.sessionId.set(4);

      const promise = service.POST_saveSession({ fields: [] });

      const req = httpMock.expectOne(`${service.baseApiBaseUrl}ai/sessions/4/save`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toBeTruthy();
    });
  });
});
