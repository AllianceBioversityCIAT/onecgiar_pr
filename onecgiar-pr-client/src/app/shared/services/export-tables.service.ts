import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
interface Wscols {
  wpx: number;
}
@Injectable({
  providedIn: 'root'
})
export class ExportTablesService {
  constructor() {}
  exportExcel(list, wscols?: Wscols[]) {
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(list);
      if (wscols) worksheet['!cols'] = wscols as any;
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'file');
    });
  }
  private saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }
}
