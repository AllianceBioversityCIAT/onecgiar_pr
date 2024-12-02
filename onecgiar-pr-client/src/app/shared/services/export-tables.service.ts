import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as ExcelJS from 'exceljs';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import { OutcomeIndicatorService } from '../../pages/outcome-indicator/services/outcome-indicator.service';
interface Wscols {
  wpx: number;
}
@Injectable({
  providedIn: 'root'
})
export class ExportTablesService {
  constructor(
    private readonly customAlertService: CustomizedAlertsFeService,
    private readonly outcomeIService: OutcomeIndicatorService
  ) {}

  exportExcel(
    list: any[],
    fileName: string,
    wscols?: any[],
    cellsToLink?: {
      cellNumber: number;
      cellKey: string;
    }[]
  ) {
    try {
      import('exceljs').then(async ExcelJS => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');

        if (wscols) {
          worksheet.columns = wscols;
        }

        list.forEach(data => {
          const row = worksheet.addRow(data);

          if (cellsToLink) {
            cellsToLink.forEach(cell => {
              row.getCell(cell.cellNumber).value = {
                text: data[cell.cellKey],
                hyperlink: data[cell.cellKey],
                tooltip: data[cell.cellKey]
              };
            });
          }
        });

        this.formatWorksheet(worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        this.saveAsExcelFile(buffer, fileName);
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
    }
  }

  exportExcelAdminKP(list: any[], fileName: string, wscols?: any[], callback?: () => void) {
    try {
      import('exceljs').then(async ExcelJS => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');

        if (wscols) {
          worksheet.columns = wscols;
        }

        list.forEach(data => {
          const row = worksheet.addRow(data);

          row.getCell(2).value = {
            text: data.kp_handle,
            hyperlink: data.kp_handle,
            tooltip: data.kp_handle
          };
        });

        worksheet.getRow(1).height = 30;

        worksheet.getRow(1).eachCell(cell => {
          cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '186c24' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
          };
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell, colNumber) => {
              cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
              cell.font = {
                size: 12,
                color: colNumber === 2 ? { argb: '467886' } : { argb: '000000' },
                underline: colNumber === 2
              };
              cell.border = {
                top: { style: 'thin', color: { argb: '186c24' } },
                left: { style: 'thin', color: { argb: '186c24' } },
                bottom: { style: 'thin', color: { argb: '186c24' } },
                right: { style: 'thin', color: { argb: '186c24' } }
              };
            });
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        this.saveAsExcelFile(buffer, fileName, false, true);
        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
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

        this.formatWorksheet(worksheet);

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
      await import('exceljs').then(async ExcelJS => {
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
      });
    } catch (error) {
      console.error('Error generating file', error);
      callback?.();
    }
  }

  async exportOutcomesIndicatorsToExcel(eoisData: any[], wpsData: any[], fileName: string, wscolsEOIs?: any[], wscolsWPs?: any[], callback?) {
    try {
      await import('exceljs').then(async ExcelJS => {
        const workbook = new ExcelJS.Workbook();
        const eoisWorksheet = workbook.addWorksheet('EOIO');
        const wpsWorksheet = workbook.addWorksheet('WP');

        if (wscolsEOIs) eoisWorksheet.columns = wscolsEOIs;
        if (wscolsWPs) wpsWorksheet.columns = wscolsWPs;

        eoisData.forEach(data => this.addEOISRow(eoisWorksheet, data));
        wpsData.forEach(data => this.addWPSRow(wpsWorksheet, data));

        this.formatWorksheet(eoisWorksheet, [4, 5, 6, 7]);
        this.formatWorksheet(wpsWorksheet, [5, 6, 7, 8]);

        const buffer = await workbook.xlsx.writeBuffer();
        this.saveAsExcelFile(buffer, fileName, false, true, true);

        callback?.();
      });
    } catch (error) {
      this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: 'Error generating file', status: 'error' });
      console.error('Error generating file', error);
      callback?.();
    }
  }

  private addEOISRow(worksheet: ExcelJS.Worksheet, data: any) {
    let indicatorType = 'Not defined';
    if (data.indicators[0]?.indicator_name) {
      const prefix = data.indicators[0]?.is_indicator_custom ? 'Custom - ' : 'Standard - ';
      indicatorType = `${prefix} ${data.indicators[0]?.indicator_name}`;
    }

    const supportingResults = !data.indicators[0]?.indicator_supporting_results
      ? 'Not defined'
      : data.indicators[0]?.indicator_supporting_results.map(item => `• ${item.result_type} ${item.result_code} - ${item.result_title}`).join('\n');

    worksheet.addRow({
      toc_result_title: data.toc_result_description ?? 'Not defined',
      indicator_name: data.indicators[0]?.indicator_description ?? 'Not defined',
      indicator_type: indicatorType,
      expected_target: data.indicators[0]?.indicator_target_value ?? 'Not defined',
      actual_target_achieved: data.indicators[0]?.indicator_achieved_value ?? 'Not defined',
      achieved_status: this.outcomeIService.achievedStatus(data.indicators[0]?.indicator_target_value, data.indicators[0]?.indicator_achieved_value)
        ? 'Yes'
        : 'No',
      reporting_status: data.indicators[0]?.indicator_submission_status ? 'Submitted' : 'Editing',
      indicator_achieved_narrative: data.indicators[0]?.indicator_achieved_narrative ?? 'Not defined',
      indicator_supporting_results: supportingResults
    });
  }

  private addWPSRow(worksheet: ExcelJS.Worksheet, data: any) {
    data.toc_results.forEach(result => {
      if (result.indicators.length > 0) {
        result.indicators.forEach(indicator => {
          let indicatorType = 'Not defined';
          if (indicator.indicator_name) {
            const prefix = indicator.is_indicator_custom ? 'Custom - ' : 'Standard - ';
            indicatorType = `${prefix} ${indicator.indicator_name}`;
          }
          const supportingResults = !indicator.indicator_supporting_results
            ? 'Not defined'
            : indicator.indicator_supporting_results.map(item => `• ${item.result_type} ${item.result_code} - ${item.result_title}`).join('\n');

          worksheet.addRow({
            workpackage_name: `${data.workpackage_short_name}: ${data.workpackage_name}`,
            toc_result_description: result.toc_result_description ?? 'Not defined',
            indicator_name: indicator.indicator_description ?? 'Not defined',
            indicator_type: indicatorType,
            expected_target: indicator.indicator_target_value ?? 'Not defined',
            actual_target_achieved: indicator.indicator_achieved_value ?? 'Not defined',
            achieved_status: this.outcomeIService.achievedStatus(indicator.indicator_target_value, indicator.indicator_achieved_value) ? 'Yes' : 'No',
            reporting_status: indicator.indicator_submission_status ? 'Submitted' : 'Editing',
            indicator_achieved_narrative: indicator.indicator_achieved_narrative ?? 'Not defined',
            indicator_supporting_results: supportingResults
          });
        });
      } else {
        worksheet.addRow({
          workpackage_name: `${data.workpackage_short_name}: ${data.workpackage_name}`,
          toc_result_description: result.toc_result_description ?? 'Not defined',
          indicator_name: 'Not defined',
          indicator_type: 'Not defined',
          expected_target: 'Not defined',
          actual_target_achieved: 'Not defined',
          achieved_status: 'No',
          reporting_status: 'Editing',
          indicator_achieved_narrative: 'Not defined',
          indicator_supporting_results: 'Not defined'
        });
      }
    });
  }

  private formatWorksheet(worksheet: ExcelJS.Worksheet, cellsToCenter?: number[]) {
    worksheet.getRow(1).height = 20;

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
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
          cell.font = { size: 12, color: { argb: '000000' } };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          if (cellsToCenter?.includes(colNumber)) {
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
          }
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

  saveAsExcelFile(buffer: any, fileName: string, isIPSR: boolean = false, dateEnd: boolean = false, hourEnd: boolean = false): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });

    const formatDate = (date: Date, includeTime: boolean = false): string => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Madrid',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(includeTime && { hour: '2-digit', minute: '2-digit' })
      };
      const formatted = date.toLocaleString('en-GB', options).replace(/[/,:\s]/g, '');
      let formattedDate = formatted.slice(4, 8) + formatted.slice(2, 4) + formatted.slice(0, 2);
      if (includeTime) {
        formattedDate += '_' + formatted.slice(8, 12) + (isIPSR ? 'cet' : '');
      }
      return formattedDate;
    };

    const saveFile = (suffix: string) => {
      FileSaver.saveAs(data, `${fileName}_${suffix}${EXCEL_EXTENSION}`);
    };

    if (isIPSR) {
      saveFile(formatDate(new Date(), true));
      return;
    }

    if (dateEnd) {
      const dateSuffix = formatDate(new Date(), hourEnd);
      saveFile(dateSuffix);
      return;
    }

    const timestamp = Math.floor(new Date().getTime() / 1000) * 10;
    saveFile(timestamp.toString());
  }
}
