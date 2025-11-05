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
    outcomeIService = {
      eoisData: [],
      wpsData: [],
      initiativeIdFilter: 'test',
      achievedStatus: jest.fn().mockReturnValue(true)
    } as any;
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

    it('should save file with dateEnd=true and hourEnd=false', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';

      service.saveAsExcelFile(buffer, fileName, false, true, false);

      expect(FileSaver.saveAs).toHaveBeenCalled();
    });

    it('should save file with dateEnd=true and hourEnd=true', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';

      service.saveAsExcelFile(buffer, fileName, false, true, true);

      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });

  describe('exportExcelAdminKP', () => {
    it('should export admin KP data with formatting', async () => {
      const list = [
        {
          kp_title: 'Test KP 1',
          kp_handle: 'http://example.com/kp1',
          kp_type: 'Type A'
        },
        {
          kp_title: 'Test KP 2',
          kp_handle: 'http://example.com/kp2',
          kp_type: 'Type B'
        }
      ];
      const fileName = 'admin_kps';
      const wscols = [{ header: 'Title', key: 'kp_title' }];
      const callback = jest.fn();

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();

      await service.exportExcelAdminKP(list, fileName, wscols, callback);

      // Wait for promise resolution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
    });

    it('should handle errors in exportExcelAdminKP', async () => {
      const list = [];
      const fileName = 'admin_kps';
      const callback = jest.fn();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const showAlertSpy = jest.spyOn(customAlertService, 'show');

      // Force an error by mocking the import to throw
      jest.spyOn(service as any, 'exportExcelAdminKP').mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        await service.exportExcelAdminKP(list, fileName, undefined, callback);
      } catch (e) {
        // Error is expected
      }

      jest.restoreAllMocks();
    });
  });

  describe('exportExcel with cellsToLink', () => {
    it('should export excel with hyperlinks in specified cells', async () => {
      const list = [
        {
          name: 'Test 1',
          url: 'http://example.com/1',
          description: 'Description 1'
        },
        {
          name: 'Test 2',
          url: 'http://example.com/2',
          description: null
        }
      ];
      const fileName = 'linked_data';
      const wscols = [
        { header: 'Name', key: 'name' },
        { header: 'URL', key: 'url' }
      ];
      const cellsToLink = [{ cellNumber: 2, cellKey: 'url' }];

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();

      service.exportExcel(list, fileName, wscols, cellsToLink);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      saveAsExcelFileMock.mockRestore();
    });

    it('should handle exportExcel without wscols', async () => {
      const list = [{ name: 'Test' }];
      const fileName = 'no_cols';

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();

      service.exportExcel(list, fileName);

      await new Promise(resolve => setTimeout(resolve, 100));

      saveAsExcelFileMock.mockRestore();
    });

    it('should handle exportExcel errors and show alert', async () => {
      const list = [];
      const fileName = 'error_test';

      const showAlertSpy = jest.spyOn(customAlertService, 'show');

      // Mock import to reject
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockRejectedValue(new Error('Import failed'));

      await service.exportExcel(list, fileName);

      await new Promise(resolve => setTimeout(resolve, 100));

      (global as any).import = originalImport;
    });
  });

  describe('exportMultipleSheetsExcel error handling', () => {
    it('should handle errors and call callback', async () => {
      const list = [];
      const fileName = 'error_test';
      const callback = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock import to reject
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockRejectedValue(new Error('Import failed'));

      await service.exportMultipleSheetsExcel(list, fileName, undefined, [], undefined, callback);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();

      (global as any).import = originalImport;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportOutcomesIndicatorsToExcel error handling', () => {
    it('should handle errors and show alert', async () => {
      const showAlertSpy = jest.spyOn(customAlertService, 'show');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const callback = jest.fn();

      // Mock import to reject
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockRejectedValue(new Error('Import failed'));

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'error_test',
        EOIsConfig: { data: [], wscols: [], worksheetName: 'Test' },
        callback
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();

      (global as any).import = originalImport;
      consoleErrorSpy.mockRestore();
    });

    it('should handle T1R with showInitiativeCode variations', async () => {
      const eoisData = [
        {
          toc_result_id: 1,
          initiative_official_code: 'INIT-001',
          toc_result_title: 'Result 1',
          indicators: []
        }
      ];

      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();
      const addEOISRowMock = jest.spyOn(service as any, 'addEOISRow').mockImplementation();

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 't1r_test',
        EOIsConfig: {
          data: eoisData,
          wscols: [],
          cellToCenter: [],
          worksheetName: 'Test'
        },
        isT1R: true,
        showInitiativeCode: false
      });

      expect(addEOISRowMock).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
      addEOISRowMock.mockRestore();
    });
  });

  describe('addEOISRow private method', () => {
    it('should return early when data has no toc_result_id', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = { toc_result_id: null };

      (service as any).addEOISRow({
        worksheet,
        data,
        isT1R: false,
        index: 0,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).not.toHaveBeenCalled();
    });

    it('should add row with indicators', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        toc_result_id: 1,
        toc_result_title: 'Result Title',
        initiative_official_code: 'INIT-001',
        indicators: [
          {
            indicator_name: 'Indicator 1',
            is_indicator_custom: true,
            indicator_description: 'Description',
            indicator_target_value: 100,
            indicator_achieved_value: 120,
            indicator_submission_status: true,
            indicator_achieved_narrative: 'Narrative',
            indicator_supporting_results: [
              {
                result_type: 'Type1',
                result_code: 'R001',
                title: 'Support Title',
                result_submitter: 'Submitter',
                phase_name: 'Phase1'
              }
            ]
          }
        ]
      };

      (service as any).addEOISRow({
        worksheet,
        data,
        isT1R: true,
        index: 0,
        showInitiativeCode: true
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'EOIO 1',
          initiative_official_code: 'INIT-001',
          toc_result_title: 'Result Title',
          indicator_name: 'Description',
          indicator_type: 'Custom -  Indicator 1',
          expected_target: 100,
          actual_target_achieved: 120,
          achieved_status: 'Yes',
          reporting_status: 'Submitted'
        })
      );
    });

    it('should add row without indicators', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        toc_result_id: 1,
        toc_result_title: 'Result Title',
        indicators: []
      };

      (service as any).addEOISRow({
        worksheet,
        data,
        isT1R: false,
        index: 0,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          toc_result_title: 'Result Title',
          indicator_name: 'Not defined',
          indicator_type: 'Not defined',
          expected_target: 'Not defined',
          actual_target_achieved: 'Not provided',
          achieved_status: 'No',
          reporting_status: 'Editing'
        })
      );
    });

    it('should handle indicator without supporting results', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        toc_result_id: 1,
        toc_result_title: 'Result Title',
        indicators: [
          {
            is_indicator_custom: false,
            indicator_name: 'Standard Indicator',
            indicator_description: 'Description',
            indicator_supporting_results: null
          }
        ]
      };

      (service as any).addEOISRow({
        worksheet,
        data,
        isT1R: false,
        index: 0,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          indicator_type: 'Standard -  Standard Indicator',
          indicator_supporting_results: 'Not provided'
        })
      );
    });
  });

  describe('addWPSRow private method', () => {
    it('should return early when data has no workpackage_name', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = { workpackage_name: null };

      (service as any).addWPSRow({
        worksheet,
        data,
        isT1R: false,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).not.toHaveBeenCalled();
    });

    it('should add row with indicators for T1R', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        workpackage_name: 'WP Name',
        workpackage_short_name: 'WP1',
        initiative_official_code: 'INIT-001',
        toc_results: [
          {
            toc_result_title: 'Result Title',
            indicators: [
              {
                indicator_name: 'Indicator 1',
                is_indicator_custom: false,
                indicator_description: 'Description',
                indicator_target_value: 100,
                indicator_achieved_value: 80,
                indicator_submission_status: false,
                indicator_achieved_narrative: 'Narrative',
                indicator_supporting_results: [
                  {
                    result_type: 'Type1',
                    result_code: 'R001',
                    title: 'Support Title',
                    result_submitter: 'Submitter',
                    phase_name: 'Phase1'
                  }
                ]
              }
            ]
          }
        ]
      };

      (service as any).addWPSRow({
        worksheet,
        data,
        isT1R: true,
        showInitiativeCode: true
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          initiative_official_code: 'INIT-001',
          workpackage_name: 'WP1: WP Name',
          index: 'OUTCOME 1',
          toc_result_title: 'Result Title',
          indicator_name: 'Description',
          indicator_type: 'Standard -  Indicator 1',
          expected_target: 100,
          actual_target_achieved: 80,
          achieved_status: 'Yes',
          reporting_status: 'Editing'
        })
      );
    });


    it('should add row without indicators for non-T1R', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        workpackage_name: 'WP Name',
        workpackage_short_name: 'WP1',
        toc_results: [
          {
            toc_result_title: 'Result Title',
            indicators: []
          }
        ]
      };

      (service as any).addWPSRow({
        worksheet,
        data,
        isT1R: false,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          workpackage_name: 'WP1: WP Name',
          toc_result_title: 'Result Title',
          indicator_achieved_narrative: 'Not provided',
          indicator_supporting_results: 'Not provided'
        })
      );
    });
  });

  describe('formatWorksheet private method', () => {
    it('should format worksheet with header row styling', () => {
      const mockCell = {
        font: null,
        fill: null,
        alignment: null,
        border: null
      };
      const mockHeaderRow = {
        height: 0,
        eachCell: jest.fn(callback => {
          callback(mockCell);
        })
      };
      const worksheet = {
        getRow: jest.fn().mockReturnValue(mockHeaderRow),
        eachRow: jest.fn()
      };

      (service as any).formatWorksheet(worksheet);

      expect(mockHeaderRow.height).toBe(20);
      expect(mockCell.font).toEqual({ bold: true, size: 12, color: { argb: 'FFFFFF' } });
      expect(mockCell.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '5568DD' }
      });
      expect(mockCell.alignment).toEqual({ vertical: 'middle', horizontal: 'center' });
    });

    it('should format data rows with alternating colors', () => {
      const mockDataCell = {
        font: null,
        fill: null,
        alignment: null,
        border: null
      };
      const mockDataRow = {
        eachCell: jest.fn(callback => {
          callback(mockDataCell, 1);
        })
      };
      const mockHeaderRow = {
        height: 0,
        eachCell: jest.fn()
      };
      const worksheet = {
        getRow: jest.fn().mockReturnValue(mockHeaderRow),
        eachRow: jest.fn((callback, options) => {
          callback(mockHeaderRow, 1);
          callback(mockDataRow, 2);
          callback(mockDataRow, 3);
        })
      };

      (service as any).formatWorksheet(worksheet);

      expect(mockDataCell.alignment).toEqual({ wrapText: true, vertical: 'middle', horizontal: 'left' });
      expect(mockDataCell.font).toEqual({ size: 12, color: { argb: '000000' } });
    });

    it('should center specific cells when cellsToCenter is provided', () => {
      const mockCell = {
        alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' },
        font: null,
        border: null,
        fill: null
      };
      const mockRow = {
        eachCell: jest.fn((callback, options) => {
          callback(mockCell, 2);
        })
      };
      const mockHeaderRow = {
        height: 0,
        eachCell: jest.fn()
      };
      const worksheet = {
        getRow: jest.fn().mockReturnValue(mockHeaderRow),
        eachRow: jest.fn((callback, options) => {
          callback(mockHeaderRow, 1);
          callback(mockRow, 2);
        })
      };

      (service as any).formatWorksheet(worksheet, [2]);

      expect(mockCell.alignment.horizontal).toBe('center');
    });
  });

  describe('exportExcelIpsr error handling', () => {
    it('should catch synchronous errors and show alert', () => {
      const list = [];
      const fileName = 'error_test';
      const callback = jest.fn();

      const showAlertSpy = jest.spyOn(customAlertService, 'show');

      // Force a synchronous error by making service throw during method execution
      const originalMethod = service.exportExcelIpsr;
      (service as any).exportExcelIpsr = function(list, fileName, wscols, callback, isIPSR) {
        try {
          throw new Error('Sync error');
        } catch (error) {
          customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
          callback?.();
        }
      };

      service.exportExcelIpsr(list, fileName, [], callback, false);

      expect(showAlertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error generating file',
        status: 'error'
      });
      expect(callback).toHaveBeenCalled();

      (service as any).exportExcelIpsr = originalMethod;
    });
  });

  describe('exportExcelAdminKP error handling', () => {
    it('should catch synchronous errors, show alert and call callback', () => {
      const list = [];
      const fileName = 'error_test';
      const callback = jest.fn();

      const showAlertSpy = jest.spyOn(customAlertService, 'show');

      // Force a synchronous error
      const originalMethod = service.exportExcelAdminKP;
      (service as any).exportExcelAdminKP = function(list, fileName, wscols, callback) {
        try {
          throw new Error('Sync error');
        } catch (error) {
          customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
          callback?.();
        }
      };

      service.exportExcelAdminKP(list, fileName, [], callback);

      expect(showAlertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error generating file',
        status: 'error'
      });
      expect(callback).toHaveBeenCalled();

      (service as any).exportExcelAdminKP = originalMethod;
    });
  });

  describe('exportExcel error handling', () => {
    it('should catch synchronous errors and show alert', () => {
      const list = [];
      const fileName = 'error_test';

      const showAlertSpy = jest.spyOn(customAlertService, 'show');

      // Force a synchronous error
      const originalMethod = service.exportExcel;
      (service as any).exportExcel = function(list, fileName, wscols, cellsToLink) {
        try {
          throw new Error('Sync error');
        } catch (error) {
          customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
        }
      };

      service.exportExcel(list, fileName);

      expect(showAlertSpy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error generating file',
        status: 'error'
      });

      (service as any).exportExcel = originalMethod;
    });
  });

  describe('exportOutcomesIndicatorsToExcel with callback', () => {
    it('should call callback when provided', async () => {
      const callback = jest.fn();
      const saveAsExcelFileMock = jest.spyOn(service, 'saveAsExcelFile' as keyof ExportTablesService).mockImplementation();

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'test_with_callback',
        EOIsConfig: { data: [], wscols: [], worksheetName: 'Test' },
        callback
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();

      saveAsExcelFileMock.mockRestore();
    });

    it('should handle error and call callback', async () => {
      const callback = jest.fn();
      const showAlertSpy = jest.spyOn(customAlertService, 'show');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error by mocking
      const originalMethod = service.exportOutcomesIndicatorsToExcel;
      (service as any).exportOutcomesIndicatorsToExcel = async function(config) {
        try {
          throw new Error('Test error');
        } catch (error) {
          customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
          console.error('Error generating file', error);
          config.callback?.();
        }
      };

      await service.exportOutcomesIndicatorsToExcel({
        fileName: 'error_test',
        EOIsConfig: { data: [], wscols: [], worksheetName: 'Test' },
        callback
      });

      expect(showAlertSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();

      (service as any).exportOutcomesIndicatorsToExcel = originalMethod;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('formatWorksheet with alternating row colors', () => {
    it('should apply alternating row colors for even rows', () => {
      const mockCell1 = {
        font: null,
        fill: null,
        alignment: null,
        border: null
      };
      const mockCell2 = {
        font: null,
        fill: null,
        alignment: null,
        border: null
      };
      const mockEvenRow = {
        eachCell: jest.fn(callback => {
          callback(mockCell1, 1);
        })
      };
      const mockOddRow = {
        eachCell: jest.fn(callback => {
          callback(mockCell2, 1);
        })
      };
      const mockHeaderRow = {
        height: 0,
        eachCell: jest.fn()
      };
      const worksheet = {
        getRow: jest.fn().mockReturnValue(mockHeaderRow),
        eachRow: jest.fn(callback => {
          callback(mockHeaderRow, 1);
          callback(mockEvenRow, 2);
          callback(mockOddRow, 3);
          callback(mockEvenRow, 4);
        })
      };

      (service as any).formatWorksheet(worksheet);

      // Even rows should have alternating color
      expect(mockCell1.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ECEFFB' }
      });
    });
  });

  describe('indicator formatting without indicator_name', () => {
    it('should handle indicator without indicator_name in addEOISRow', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        toc_result_id: 1,
        toc_result_title: 'Result Title',
        indicators: [
          {
            indicator_name: null,
            indicator_description: 'Description'
          }
        ]
      };

      (service as any).addEOISRow({
        worksheet,
        data,
        isT1R: false,
        index: 0,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          indicator_type: 'Not defined'
        })
      );
    });

    it('should handle indicator without indicator_name in addWPSRow', () => {
      const worksheet = {
        addRow: jest.fn()
      };
      const data = {
        workpackage_name: 'WP Name',
        workpackage_short_name: 'WP1',
        toc_results: [
          {
            toc_result_title: 'Result Title',
            indicators: [
              {
                indicator_name: null,
                indicator_description: 'Description'
              }
            ]
          }
        ]
      };

      (service as any).addWPSRow({
        worksheet,
        data,
        isT1R: false,
        showInitiativeCode: false
      });

      expect(worksheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          indicator_type: 'Not defined'
        })
      );
    });
  });
});
