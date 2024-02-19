import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorTocDiagramsComponent } from './tor-toc-diagrams.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TorTocDiagramsComponent', () => {
  let component: TorTocDiagramsComponent;
  let fixture: ComponentFixture<TorTocDiagramsComponent>;
  let apiService: ApiService;
  let typeOneReportService: TypeOneReportService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorTocDiagramsComponent],
      providers: [ApiService, TypeOneReportService],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorTocDiagramsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    typeOneReportService = TestBed.inject(TypeOneReportService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getResultFolders when ngOnInit is called', () => {
    const getResultFoldersSpy = jest.spyOn(component, 'getResultFolders');

    component.ngOnInit();

    expect(getResultFoldersSpy).toHaveBeenCalled();
  });

  it('should set folderUrl when getResultFolders is called', () => {
    const mockResponse = {
      response: [
        {
          folder_path: 'path/to/folder'
        }
      ]
    };
    const apiServiceSpy = jest.spyOn(apiService.endpointsSE, 'resultFolders').mockReturnValue(of(mockResponse));

    component.getResultFolders();

    expect(apiServiceSpy).toHaveBeenCalledWith(typeOneReportService.phaseSelected);
    expect(component.folderUrl).toBe('path/to/folder');
  });

  it('should set folderUrl to empty string when getResultFolders returns empty response', () => {
    const mockResponse = {
      response: []
    };
    jest.spyOn(apiService.endpointsSE, 'resultFolders').mockReturnValue(of(mockResponse));

    component.getResultFolders();

    expect(component.folderUrl).toBe('');
  });

  it('should log error when getResultFolders throws an error', () => {
    const mockError = new Error('Error getting result folders');
    jest.spyOn(apiService.endpointsSE, 'resultFolders').mockReturnValue(throwError(mockError));
    const consoleSpy = jest.spyOn(console, 'log');

    component.getResultFolders();

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
  });
});
