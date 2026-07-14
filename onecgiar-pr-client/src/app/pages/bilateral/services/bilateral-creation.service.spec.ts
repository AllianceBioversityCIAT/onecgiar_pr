import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BilateralCreationService } from './bilateral-creation.service';
import { ApiService } from '../../../shared/services/api/api.service';
import { environment } from '../../../../environments/environment';

describe('BilateralCreationService', () => {
  let service: BilateralCreationService;
  let httpMock: HttpTestingController;
  let mockApiService: Partial<ApiService>;

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_bilateralProjects: jest.fn(),
      } as any,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BilateralCreationService,
        { provide: ApiService, useValue: mockApiService },
      ],
    });

    service = TestBed.inject(BilateralCreationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch projects via GET_bilateralProjects', () => {
    const mockResponse = {
      response: {
        projects: [
          { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] },
        ],
      },
    };
    jest.spyOn(mockApiService.resultsSE as any, 'GET_bilateralProjects').mockReturnValue({
      subscribe: ({ next }: any) => next(mockResponse),
    } as any);

    service.getProjects('CENTER-01');
    expect(service.isLoadingProjects()).toBe(false);
    expect(service.projects()).toEqual(mockResponse.response.projects);
  });

  it('should handle empty project list', () => {
    jest.spyOn(mockApiService.resultsSE as any, 'GET_bilateralProjects').mockReturnValue({
      subscribe: ({ next }: any) => next({ response: { projects: [] } }),
    } as any);

    service.getProjects('CENTER-01');
    expect(service.projects()).toEqual([]);
    expect(service.isLoadingProjects()).toBe(false);
  });

  it('should select a project', () => {
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
    service.selectProject(project);
    expect(service.selectedProject()).toEqual(project);
    expect(service.selectedPrimarySp()).toBeNull();
    expect(service.selectedSecondarySps()).toEqual([]);
  });

  it('should select a primary SP', () => {
    const sp = { programId: 100, programCode: 'P11', allocation: '45.00' };
    service.selectPrimarySp(sp);
    expect(service.selectedPrimarySp()).toEqual(sp);
  });

  it('should toggle secondary SPs', () => {
    const sp1 = { programId: 100, programCode: 'P11', allocation: '45.00' };
    const sp2 = { programId: 200, programCode: 'P12', allocation: '25.00' };
    service.toggleSecondarySp(sp1);
    expect(service.selectedSecondarySps()).toEqual([sp1]);
    service.toggleSecondarySp(sp2);
    expect(service.selectedSecondarySps()).toEqual([sp1, sp2]);
    service.toggleSecondarySp(sp1);
    expect(service.selectedSecondarySps()).toEqual([sp2]);
  });

  it('should create a result via POST', () => {
    service.createResult(1, 2).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/bilateral/center/create-header`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ result_level_id: 1, result_type_id: 2 });
    req.flush({});
  });

  it('should submit a result via PATCH', () => {
    service.submitResult(123).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}api/results/bilateral/123/review-decision`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });
});
