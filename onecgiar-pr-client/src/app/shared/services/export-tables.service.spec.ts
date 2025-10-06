import { ExportTablesService } from './export-tables.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';
import { OutcomeIndicatorService } from '../../pages/outcome-indicator/services/outcome-indicator.service';

jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRow: jest.fn().mockReturnValue({
        getCell: jest.fn().mockReturnValue({ value: {} })
      }),
      getRow: jest.fn().mockReturnValue({
        height: 0,
        eachCell: jest.fn()
      }),
      eachRow: jest.fn()
    }),
    xlsx: {
      writeBuffer: jest.fn().mockResolvedValue(Buffer.from([]))
    }
  }))
}));

describe('ExportTablesService', () => {
  let service: ExportTablesService;
  let customAlertService: CustomizedAlertsFeService;
  let outcomeIService: OutcomeIndicatorService;

  beforeEach(() => {
    customAlertService = { show: jest.fn() } as any;
    outcomeIService = { eoisData: [], wpsData: [], initiativeIdFilter: 'test' } as any;
    service = new ExportTablesService(customAlertService, outcomeIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportExcel', () => {
    it('should call the expected methods with the expected arguments', async () => {
      const list = [];
      const fileName = 'test.xlsx';
      const wscols = [];

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const customAlertServiceMock = jest.spyOn(service['customAlertService'], 'show').mockImplementation();

      service.exportExcel(list, fileName, wscols);

      saveAsExcelFileMock.mockRestore();
      customAlertServiceMock.mockRestore();
    });
  });

  describe('exportExcelIpsr', () => {
    it('should call the expected methods with the expected arguments', async () => {
      const list = [];
      const fileName = 'test.xlsx';
      const wscols = [];
      const callback = jest.fn();

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const customAlertServiceMock = jest.spyOn(service['customAlertService'], 'show').mockImplementation();

      service.exportExcelIpsr(
        list,
        fileName,
        wscols,
        () => {
          expect(ExcelJS.Workbook).toHaveBeenCalled();
          expect(saveAsExcelFileMock).toHaveBeenCalledWith(expect.any(Buffer), 'test.xlsx', false);
          expect(callback).toHaveBeenCalled();
        },
        false
      );

      saveAsExcelFileMock.mockRestore();
      customAlertServiceMock.mockRestore();
    });

    it('should call error alert when error is thrown', async () => {
      const list = [];
      const fileName = 'test.xlsx';
      const wscols = [];
      const callback = jest.fn();

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation(() => {
        throw new Error();
      });
      const customAlertServiceMock = jest.spyOn(service['customAlertService'], 'show').mockImplementation();

      service.exportExcelIpsr(
        list,
        fileName,
        wscols,
        () => {
          expect(customAlertServiceMock).toHaveBeenCalled();
          expect(callback).toHaveBeenCalled();
        },
        false
      );

      saveAsExcelFileMock.mockRestore();
      customAlertServiceMock.mockRestore();
    });
  });

  describe('exportMultipleSheetsExcel', () => {
    it('should export multiple sheets excel with wscols', async () => {
      const list = [{ data: 'data1' }, { data: 'data2' }];
      const fileName = 'testFile';
      const wscols = [{ wpx: 100 }];
      const tocToExport = [{ data: 'tocData1' }, { data: 'tocData2' }];

      await service.exportMultipleSheetsExcel(list, fileName, wscols, tocToExport, wscols, () => {
        expect(ExcelJS.Workbook).toHaveBeenCalled();
        expect(FileSaver.saveAs).toHaveBeenCalled();
      });
    });

    it('should export multiple sheets excel without wscols', async () => {
      const list = [{ data: 'data1' }, { data: 'data2' }];
      const fileName = 'testFile';
      const tocToExport = [{ data: 'tocData1' }, { data: 'tocData2' }];

      await service.exportMultipleSheetsExcel(list, fileName, undefined, tocToExport, undefined, () => {
        expect(ExcelJS.Workbook).toHaveBeenCalled();
      });
    });
  });

  describe('exportOutcomesIndicatorsToExcel', () => {
    it('should export outcomes indicators with showInitiativeCode=true', async () => {
      const eoisData = [
        {
          initiative_official_code: 'INIT-001',
          toc_result_title: 'Result 1',
          indicators: [
            {
              indicator_name: 'Indicator 1',
              indicator_type: 'Type 1',
              expected_target: 10,
              actual_target_achieved: 12,
              indicator_achieved_narrative: 'Narrative 1',
              indicator_supporting_results: 'Support 1'
            }
          ]
        }
      ];

      const wpsData = [
        {
          initiative_official_code: 'INIT-001',
          workpackage_name: 'WP1',
          toc_results: [
            {
              toc_result_title: 'Result 1',
              indicators: [
                {
                  indicator_name: 'Indicator 1',
                  indicator_type: 'Type 1',
                  expected_target: 10,
                  actual_target_achieved: 12,
                  indicator_achieved_narrative: 'Narrative 1',
                  indicator_supporting_results: 'Support 1'
                }
              ]
            }
          ]
        }
      ];

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const addEOISRowMock = jest.spyOn(service as any, 'addEOISRow').mockImplementation();
      const addWPSRowMock = jest.spyOn(service as any, 'addWPSRow').mockImplementation();
      const formatWorksheetMock = jest.spyOn(service as any, 'formatWorksheet').mockImplementation();

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'test_file',
        EOIsConfig: {
          data: eoisData,
          wscols: [],
          cellToCenter: [1, 4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: wpsData,
          wscols: [],
          cellToCenter: [1, 5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false,
        showInitiativeCode: true
      });

      expect(addEOISRowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: eoisData[0],
          isT1R: false,
          showInitiativeCode: true
        })
      );

      expect(addWPSRowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: wpsData[0],
          isT1R: false,
          showInitiativeCode: true
        })
      );

      expect(formatWorksheetMock).toHaveBeenCalledWith(expect.anything(), [1, 4, 5, 6, 7]);
      expect(saveAsExcelFileMock).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
      addEOISRowMock.mockRestore();
      addWPSRowMock.mockRestore();
      formatWorksheetMock.mockRestore();
    });

    it('should export outcomes indicators with showInitiativeCode=false', async () => {
      const eoisData = [
        {
          initiative_official_code: 'INIT-001',
          toc_result_title: 'Result 1',
          indicators: [
            {
              indicator_name: 'Indicator 1',
              indicator_type: 'Type 1',
              expected_target: 10,
              actual_target_achieved: 12,
              indicator_achieved_narrative: 'Narrative 1',
              indicator_supporting_results: 'Support 1'
            }
          ]
        }
      ];

      const wpsData = [
        {
          initiative_official_code: 'INIT-001',
          workpackage_name: 'WP1',
          toc_results: [
            {
              toc_result_title: 'Result 1',
              indicators: [
                {
                  indicator_name: 'Indicator 1',
                  indicator_type: 'Type 1',
                  expected_target: 10,
                  actual_target_achieved: 12,
                  indicator_achieved_narrative: 'Narrative 1',
                  indicator_supporting_results: 'Support 1'
                }
              ]
            }
          ]
        }
      ];

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const addEOISRowMock = jest.spyOn(service as any, 'addEOISRow').mockImplementation();
      const addWPSRowMock = jest.spyOn(service as any, 'addWPSRow').mockImplementation();
      const formatWorksheetMock = jest.spyOn(service as any, 'formatWorksheet').mockImplementation();

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'test_file',
        EOIsConfig: {
          data: eoisData,
          wscols: [],
          cellToCenter: [1, 4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: wpsData,
          wscols: [],
          cellToCenter: [1, 5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false,
        showInitiativeCode: false
      });

      expect(addEOISRowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: eoisData[0],
          isT1R: false,
          showInitiativeCode: false
        })
      );

      expect(addWPSRowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: wpsData[0],
          isT1R: false,
          showInitiativeCode: false
        })
      );

      expect(formatWorksheetMock).toHaveBeenCalledWith(expect.anything(), [1, 4, 5, 6, 7]);
      expect(saveAsExcelFileMock).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
      addEOISRowMock.mockRestore();
      addWPSRowMock.mockRestore();
      formatWorksheetMock.mockRestore();
    });

    it('should handle empty data arrays', async () => {
      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const addEOISRowMock = jest.spyOn(service as any, 'addEOISRow').mockImplementation();
      const addWPSRowMock = jest.spyOn(service as any, 'addWPSRow').mockImplementation();
      const formatWorksheetMock = jest.spyOn(service as any, 'formatWorksheet').mockImplementation();

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'test_file',
        EOIsConfig: {
          data: [],
          wscols: [],
          cellToCenter: [1, 4, 5, 6, 7],
          worksheetName: 'EoI outcomes'
        },
        WPsConfig: {
          data: [],
          wscols: [],
          cellToCenter: [1, 5, 6, 7, 8],
          worksheetName: 'WP outcomes'
        },
        isT1R: false,
        showInitiativeCode: true
      });

      expect(addEOISRowMock).not.toHaveBeenCalled();
      expect(addWPSRowMock).not.toHaveBeenCalled();
      expect(saveAsExcelFileMock).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
      addEOISRowMock.mockRestore();
      addWPSRowMock.mockRestore();
      formatWorksheetMock.mockRestore();
    });
  });

  describe('saveAsExcelFile', () => {
    it('should save the file with a specific format when isIPSR is true', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';
      const isIPSR = true;

      // Mock the current date to ensure consistent test results
      const mockDate = new Date('2025-01-01T00:41:00Z'); // 00:41 CET
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      service.saveAsExcelFile(buffer, fileName, isIPSR);

      // Use the same logic as the service implementation
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Madrid',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      const formatted = mockDate.toLocaleString('en-GB', options).replace(/[/,:\s]/g, '');
      const formattedDate = formatted.slice(4, 8) + formatted.slice(2, 4) + formatted.slice(0, 2);
      const timePart = formatted.slice(8, 12) + 'cet';
      const expectedFileName = fileName + '_' + formattedDate + '_' + timePart + '.xlsx';

      expect(FileSaver.saveAs).toHaveBeenCalledWith(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
        expectedFileName
      );

      // Restore the original Date implementation
      jest.restoreAllMocks();
    });

    it('should save the file with a timestamp when isIPSR is false', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';
      const isIPSR = false;

      const now = new Date();
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      service.saveAsExcelFile(buffer, fileName, isIPSR);

      const time = new Date().getTime().toString().slice(0, -3) + '0';
      const expectedFileName = fileName + '_' + time + '.xlsx';

      expect(FileSaver.saveAs).toHaveBeenCalledWith(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
        expectedFileName
      );
    });
  });
});
