import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BilateralApiService } from './api/bilateral-api.service';
import { NotificationNavigationService } from './notification-navigation.service';
import { CentersService } from './global/centers.service';

const buildNotification = (typeId = 1) => ({
  result_id: 91,
  obj_result: {
    result_code: 9544,
    obj_version: { id: 36 },
    obj_result_type: { id: typeId },
    obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }]
  }
});

describe('NotificationNavigationService', () => {
  let service: NotificationNavigationService;
  const bilateralApi = { GET_centersByResultId: jest.fn() };
  const centersService = { centers: jest.fn(), getData: jest.fn() };

  beforeEach(() => {
    bilateralApi.GET_centersByResultId.mockReset();
    centersService.centers.mockReset().mockReturnValue([]);
    centersService.getData.mockReset().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: CentersService, useValue: centersService }
      ]
    });
    service = TestBed.inject(NotificationNavigationService);
  });

  const resolve = (notification: any): Promise<string | null> =>
    new Promise(resolveFn => service.decisionUrl$(notification).subscribe(resolveFn));

  it('builds the review drawer URL with reviewResult and reviewResultId', () => {
    expect(service.reviewRequestUrl(buildNotification())).toBe(
      '/result-framework-reporting/entity-details/SP01/bilateral-review?reviewResult=9544&reviewResultId=91'
    );
  });

  it('PRA-R-3: a primary request row resolves the requested SP code even when the result has no owner yet', () => {
    expect(
      service.reviewRequestUrl({
        request_type: 'primary',
        result_id: 91,
        obj_shared_inititiative: { official_code: 'SP12' },
        obj_result: { result_code: 9737, obj_result_by_initiatives: [] }
      })
    ).toBe('/result-framework-reporting/entity-details/SP12/bilateral-review?reviewResult=9737&reviewResultId=91');
  });

  it('returns null for a review request without an SP code', () => {
    expect(service.reviewRequestUrl({ result_id: 91, obj_result: { result_code: 9544 } })).toBeNull();
  });

  it('opens the center editor of the lead center', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(
      of({ response: [{ acronym: 'CIAT' }, { acronym: 'CIMMYT', is_leading_result: 1 }] })
    );
    expect(await resolve(buildNotification())).toBe('/bilateral/CIMMYT/result/9544?phase=36');
    expect(bilateralApi.GET_centersByResultId).toHaveBeenCalledWith(91);
  });

  it('maps the lead center code to its CLARISA catalogue acronym instead of the institution acronym', async () => {
    centersService.centers.mockReturnValue([{ code: 'CENTER-02', acronym: 'Bioversity (Alliance)' }]);
    bilateralApi.GET_centersByResultId.mockReturnValue(
      of({ response: [{ code: 'CENTER-02', acronym: 'Bioversity', is_leading_result: 1 }] })
    );
    expect(await resolve(buildNotification())).toBe('/bilateral/Bioversity%20%28Alliance%29/result/9544?phase=36');
  });

  it('keeps the lookup acronym and loads the catalogue when it is not there yet', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [{ code: 'C-9', acronym: 'CIMMYT', is_leading_result: 1 }] }));
    expect(await resolve(buildNotification())).toBe('/bilateral/CIMMYT/result/9544?phase=36');
    expect(centersService.getData).toHaveBeenCalled();
  });

  it('uses the creating center acronym of a request without calling the centers lookup', async () => {
    const notification = { ...buildNotification(), creating_center: { acronym: 'Bioversity (Alliance)' } };
    expect(await resolve(notification)).toBe('/bilateral/Bioversity%20%28Alliance%29/result/9544?phase=36');
    expect(bilateralApi.GET_centersByResultId).not.toHaveBeenCalled();
  });

  it('uses the first center code when no center leads and there is no acronym', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [{ code: 'C-7' }] }));
    expect(await resolve(buildNotification())).toBe('/bilateral/C-7/result/9544?phase=36');
  });

  it('falls back to Result Detail when there are no centers', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [] }));
    expect(await resolve(buildNotification())).toBe('/result/result-detail/9544/general-information?phase=36');
  });

  it('falls back to Result Detail when the request errors, without throwing', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(throwError(() => new Error('boom')));
    expect(await resolve(buildNotification())).toBe('/result/result-detail/9544/general-information?phase=36');
  });

  it('keeps the IPSR base in the fallback for result types 10 and 11', async () => {
    bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [] }));
    expect(await resolve(buildNotification(10))).toBe('/ipsr/detail/9544/general-information?phase=36');
    expect(await resolve(buildNotification(11))).toBe('/ipsr/detail/9544/general-information?phase=36');
  });
});
