import { ExportTablesService } from './export-tables.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';

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

  beforeEach(() => {
    customAlertService = { show: jest.fn() } as any;
    service = new ExportTablesService(customAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportExcel', () => {
    it('should call the expected methods with the expected arguments', async () => {
      const list = [];
      const fileName = 'test.xlsx';
      const wscols = [];
      const callback = jest.fn();

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

  describe('saveAsExcelFile', () => {
    it('should save the file with a specific format when isIPSR is true', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';
      const isIPSR = true;

      service.saveAsExcelFile(buffer, fileName, isIPSR);

      const dateCETTime = new Date().toLocaleString('en-US', {
        timeZone: 'Europe/Madrid',
        hour12: false
      });

      const date = dateCETTime.split(',')[0].split('/');
      let day = date[1];
      let month = date[0];
      const year = date[2];

      if (day.length === 1) {
        day = '0' + day;
      }

      if (month.length === 1) {
        month = '0' + month;
      }

      const dateCET = year + month + day;

      const timeCET = dateCETTime.split(',')[1].trim().replace(':', '').slice(0, 4);

      const expectedFileName = fileName + '_' + dateCET + '_' + timeCET + 'cet.xlsx';

      expect(FileSaver.saveAs).toHaveBeenCalledWith(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
        expectedFileName
      );
    });

    it('should save the file with a timestamp when isIPSR is false', () => {
      const buffer = new ArrayBuffer(8);
      const fileName = 'testFile';
      const isIPSR = false;

      const now = new Date();
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      service.saveAsExcelFile(buffer, fileName, isIPSR);

      const time = new Date().getTime().toString().slice(0, -1) + '0';
      const expectedFileName = fileName + '_' + time + '.xlsx';

      expect(FileSaver.saveAs).toHaveBeenCalledWith(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }),
        expectedFileName
      );
    });
  });
});
