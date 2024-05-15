import { ExportTablesService } from './export-tables.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import * as FileSaver from 'file-saver';
import * as xlsx from 'xlsx';

jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue('worksheet')
  },
  write: jest.fn().mockReturnValue('excelBuffer')
}));

describe('ExportTablesService', () => {
  let service: ExportTablesService;
  let customAlertService;

  beforeEach(() => {
    customAlertService = { show: jest.fn() };
    service = new ExportTablesService(customAlertService);
  });

  it('should export excel with wscols', async () => {
    const list = ['data1', 'data2'];
    const fileName = 'testFile';
    const wscols = [{ wpx: 100 }];

    await service.exportExcel(list, fileName, wscols, () => {
      expect(xlsx.utils.json_to_sheet).toHaveBeenCalledWith(list, { skipHeader: true });
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });

  it('should export excel without wscols', async () => {
    const list = ['data1', 'data2'];
    const fileName = 'testFile';

    await service.exportExcel(list, fileName);

    expect(xlsx.utils.json_to_sheet).toHaveBeenCalledWith(list, { skipHeader: false });
    expect(FileSaver.saveAs).toHaveBeenCalled();
  });

  it('should export multiple sheets excel with wscols', async () => {
    const list = ['data1', 'data2'];
    const fileName = 'testFile';
    const wscols = [{ wpx: 100 }];
    const tocToExport = ['tocData1', 'tocData2'];

    await service.exportMultipleSheetsExcel(list, fileName, wscols, tocToExport, () => {
      expect(xlsx.utils.json_to_sheet).toHaveBeenCalledTimes(2);
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });

  it('should export multiple sheets excel without wscols', async () => {
    const list = ['data1', 'data2'];
    const fileName = 'testFile';
    const tocToExport = ['tocData1', 'tocData2'];

    await service.exportMultipleSheetsExcel(list, fileName, undefined, tocToExport, () => {
      expect(xlsx.utils.json_to_sheet).toHaveBeenCalledTimes(2);
      expect(FileSaver.saveAs).toHaveBeenCalled();
    });
  });
});
