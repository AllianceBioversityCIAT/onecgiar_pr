import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
interface Wscols {
  wpx: number;
}
@Injectable({
  providedIn: 'root'
})
export class ExportTablesService {
  constructor(private customAlertService: CustomizedAlertsFeService) {}
  exportExcel(list, fileName: string, wscols?: Wscols[], callback?, isIPSR = false) {
    try {
      import('xlsx').then(xlsx => {
        const worksheet = xlsx.utils.json_to_sheet(list, { skipHeader: Boolean(wscols?.length) });
        if (wscols) worksheet['!cols'] = wscols as any;
        const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, fileName, isIPSR);
        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Erorr generating file', status: 'error' });
      callback?.();
    }
  }

  exportExcelIpsr(list: any[], fileName: string, wscols?: any[], callback?: () => void, isIPSR = false) {
    try {
      import('exceljs').then(async ExcelJS => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');

        if (wscols) {
          worksheet.columns = wscols;
        }

        list.forEach(data => {
          const row = worksheet.addRow(data);

          row.getCell(7).value = {
            text: data.link_core_innovation,
            hyperlink: data.link_core_innovation,
            tooltip: data.link_core_innovation
          };

          row.getCell(23).value = {
            text: data.link_to_pdf,
            hyperlink: data.link_to_pdf,
            tooltip: data.link_to_pdf
          };
        });

        worksheet.getRow(1).height = 30;

        worksheet.getRow(1).eachCell(cell => {
          cell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '5568DD' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell, colNumber) => {
              cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
              cell.font = {
                size: 14,
                color: colNumber === 7 || colNumber === 23 ? { argb: '0000FF' } : { argb: '000000' },
                underline: !!(colNumber === 7 || colNumber === 23)
              };
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            });

            if (rowNumber % 2 === 0) {
              row.eachCell(cell => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'ECEFFB' }
                };
              });
            }
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        this.saveAsExcelFile(buffer, fileName, isIPSR);
        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
      callback?.();
    }
  }

  async exportMultipleSheetsExcel(list: any[], fileName: string, wscolsResults?: any[], tocToExport?: any[], wscolsToc?: any[], callback?) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('data');
      const tocSheet = workbook.addWorksheet('TOC indicators by result');

      if (wscolsResults) {
        worksheet.columns = wscolsResults;
      }

      if (wscolsToc) {
        tocSheet.columns = wscolsToc;
      }

      list.forEach(data => {
        const rowValues = wscolsResults.map(col => data[col.key] ?? 'Not provided');
        worksheet.addRow(rowValues);
      });

      tocToExport?.forEach(data => {
        const rowValues = wscolsToc.map(col => data[col.key] ?? 'Not provided');
        tocSheet.addRow(rowValues);
      });

      this.formatWorksheet(worksheet);
      this.formatWorksheet(tocSheet);

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveAsExcelFile(buffer, fileName);
      callback?.();
    } catch (error) {
      console.error('Error generating file', error);
      callback?.();
    }
  }

  private formatWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.getRow(1).height = 30;

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '5568DD' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
          cell.font = { size: 14, color: { argb: '000000' } };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        if (rowNumber % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'ECEFFB' }
            };
          });
        }
      }
    });
  }

  saveAsExcelFile(buffer: any, fileName: string, isIPSR: boolean = false): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });

    if (isIPSR) {
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

      FileSaver.saveAs(data, fileName + '_' + dateCET + '_' + timeCET + 'cet' + EXCEL_EXTENSION);
      return;
    }

    const time = new Date().getTime().toString().slice(0, -1) + '0';
    FileSaver.saveAs(data, fileName + '_' + time + EXCEL_EXTENSION);
  }
}
