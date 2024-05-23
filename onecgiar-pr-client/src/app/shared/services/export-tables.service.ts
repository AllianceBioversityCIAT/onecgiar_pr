import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
interface Wscols {
  wpx: number;
}
@Injectable({
  providedIn: 'root'
})
export class ExportTablesService {
  constructor(private customAlertService: CustomizedAlertsFeService) {}
  exportExcel(list, fileName: string, wscols?: Wscols[], callback?) {
    try {
      import('xlsx').then(xlsx => {
        const worksheet = xlsx.utils.json_to_sheet(list, { skipHeader: Boolean(wscols?.length) });
        if (wscols) worksheet['!cols'] = wscols as any;
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, fileName);
        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Erorr generating file', status: 'error' });
      callback?.();
    }
  }

  exportMultipleSheetsExcel(list: any[], fileName: string, wscols?: Wscols[], tocToExport?: any[], callback?) {
    try {
      import('xlsx').then(xlsx => {
        const worksheet = xlsx.utils.json_to_sheet(list, { skipHeader: Boolean(wscols?.length) });
        const tocsheet = xlsx.utils.json_to_sheet(tocToExport, { skipHeader: Boolean(wscols?.length) });
        if (wscols) {
          worksheet['!cols'] = wscols as any;
          tocsheet['!cols'] = wscols as any;
        }
        const workbook = { Sheets: { data: worksheet, 'TOC indicators by result': tocsheet }, SheetNames: ['data', 'TOC indicators by result'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, fileName);
        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
      callback?.();
    }
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_' + new Date().getTime() + EXCEL_EXTENSION);
  }
}
