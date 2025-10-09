import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import { OutcomeIndicatorService } from '../../pages/outcome-indicator/services/outcome-indicator.service';

interface EOIsConfig {
  data: any[];
  wscols?: any[];
  cellToCenter?: number[];
  worksheetName: string;
}

interface WPsConfig {
  data: any[];
  wscols?: any[];
  cellToCenter?: number[];
  worksheetName: string;
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
      import('exceljs').then(async ExcelJSModule => {
        const ExcelJS = ExcelJSModule.default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');

        if (wscols) {
          worksheet.columns = wscols;
        }

        list.forEach(data => {
          const row = worksheet.addRow(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value ?? 'Not provided'])));

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
      import('exceljs').then(async ExcelJSModule => {
        const ExcelJS = ExcelJSModule.default;
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
      import('exceljs').then(async ExcelJSModule => {
        const ExcelJS = ExcelJSModule.default;
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
      await import('exceljs').then(async ExcelJSModule => {
        const ExcelJS = ExcelJSModule.default;
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

  async exportOutcomesIndicatorsToExcel({
    fileName,
    EOIsConfig,
    WPsConfig,
    isT1R = false,
    showInitiativeCode = false,
    callback
  }: {
    fileName: string;
    EOIsConfig?: EOIsConfig;
    WPsConfig?: WPsConfig;
    isT1R?: boolean;
    showInitiativeCode?: boolean;
    callback?;
  }) {
    try {
      await import('exceljs').then(async ExcelJSModule => {
        const ExcelJS = ExcelJSModule.default;
        const workbook = new ExcelJS.Workbook();

        if (EOIsConfig?.data?.length > 0) {
          const eoisWorksheet = workbook.addWorksheet(EOIsConfig.worksheetName);
          if (EOIsConfig.wscols) eoisWorksheet.columns = EOIsConfig.wscols;

          EOIsConfig?.data?.forEach((data, index) =>
            this.addEOISRow({
              worksheet: eoisWorksheet,
              data,
              isT1R,
              index,
              showInitiativeCode
            })
          );
          this.formatWorksheet(eoisWorksheet, EOIsConfig.cellToCenter);
        }

        if (WPsConfig?.data?.length > 0) {
          const wpsWorksheet = workbook.addWorksheet(WPsConfig.worksheetName);
          if (WPsConfig.wscols) wpsWorksheet.columns = WPsConfig.wscols;

          WPsConfig?.data?.forEach(data =>
            this.addWPSRow({
              worksheet: wpsWorksheet,
              data,
              isT1R,
              showInitiativeCode
            })
          );
          this.formatWorksheet(wpsWorksheet, WPsConfig.cellToCenter);
        }

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

  private addEOISRow({
    worksheet,
    data,
    isT1R,
    index,
    showInitiativeCode
  }: {
    worksheet: any;
    data: any;
    isT1R: boolean;
    index: number;
    showInitiativeCode: boolean;
  }) {
    if (!data?.toc_result_id) {
      return;
    }

    if (data?.indicators?.length > 0) {
      data.indicators.forEach(indicator => {
        let indicatorType = 'Not defined';
        if (indicator.indicator_name) {
          const prefix = indicator.is_indicator_custom ? 'Custom - ' : 'Standard - ';
          indicatorType = `${prefix} ${indicator.indicator_name}`;
        }

        const supportingResults = !indicator.indicator_supporting_results
          ? 'Not provided'
          : indicator.indicator_supporting_results
              .map(item => `• ${item.result_type} ${item.result_code} - ${item.title} (${item.result_submitter} - ${item.phase_name})`)
              .join('\n');

        const rowData = {
          ...(isT1R ? { index: `EOIO ${index + 1}` } : {}),
          ...(showInitiativeCode ? { initiative_official_code: data.initiative_official_code ?? 'Not defined' } : {}),
          toc_result_title: data.toc_result_title ?? 'Not defined',
          indicator_name: indicator.indicator_description ?? 'Not defined',
          indicator_type: indicatorType,
          expected_target: indicator.indicator_target_value ?? 'Not defined',
          actual_target_achieved: indicator.indicator_achieved_value ?? 'Not provided',
          achieved_status: this.outcomeIService.achievedStatus(indicator.indicator_target_value, indicator.indicator_achieved_value) ? 'Yes' : 'No',
          reporting_status: indicator.indicator_submission_status ? 'Submitted' : 'Editing',
          indicator_achieved_narrative: indicator.indicator_achieved_narrative ?? 'Not provided',
          indicator_supporting_results: supportingResults
        };

        worksheet.addRow(rowData);
      });
    } else {
      worksheet.addRow({
        ...(isT1R ? { index: `EOIO 1` } : {}),
        ...(showInitiativeCode ? { initiative_official_code: data.initiative_official_code ?? 'Not defined' } : {}),
        toc_result_title: data.toc_result_title ?? 'Not defined',
        indicator_name: 'Not defined',
        indicator_type: 'Not defined',
        expected_target: 'Not defined',
        actual_target_achieved: 'Not provided',
        achieved_status: 'No',
        reporting_status: 'Editing',
        indicator_achieved_narrative: 'Not provided',
        indicator_supporting_results: 'Not provided'
      });
    }
  }

  private addWPSRow({ worksheet, data, isT1R, showInitiativeCode }: { worksheet: any; data: any; isT1R: boolean; showInitiativeCode: boolean }) {
    if (!data.workpackage_name) {
      return;
    }

    data.toc_results.forEach((result, index) => {
      if (result?.indicators?.length > 0) {
        result.indicators.forEach(indicator => {
          let indicatorType = 'Not defined';
          if (indicator.indicator_name) {
            const prefix = indicator.is_indicator_custom ? 'Custom - ' : 'Standard - ';
            indicatorType = `${prefix} ${indicator.indicator_name}`;
          }
          const supportingResults = !indicator.indicator_supporting_results
            ? 'Not provided'
            : indicator.indicator_supporting_results
                .map(item => `• ${item.result_type} ${item.result_code} - ${item.title} (${item.result_submitter} - ${item.phase_name})`)
                .join('\n');

          const rowData = {
            ...(showInitiativeCode ? { initiative_official_code: data.initiative_official_code ?? 'Not defined' } : {}),
            workpackage_name: `${data.workpackage_short_name}: ${data.workpackage_name}`,
            ...(isT1R ? { index: `OUTCOME ${index + 1}` } : {}),
            toc_result_title: result.toc_result_title ?? 'Not defined',
            indicator_name: indicator.indicator_description ?? 'Not defined',
            indicator_type: indicatorType,
            expected_target: indicator.indicator_target_value ?? 'Not defined',
            actual_target_achieved: indicator.indicator_achieved_value ?? 'Not provided',
            achieved_status: this.outcomeIService.achievedStatus(indicator.indicator_target_value, indicator.indicator_achieved_value) ? 'Yes' : 'No',
            reporting_status: indicator.indicator_submission_status ? 'Submitted' : 'Editing',
            indicator_achieved_narrative: indicator.indicator_achieved_narrative ?? 'Not provided',
            indicator_supporting_results: supportingResults
          };

          worksheet.addRow(rowData);
        });
      } else {
        worksheet.addRow({
          ...(isT1R ? { index: `OUTCOME 1` } : {}),
          ...(showInitiativeCode ? { initiative_official_code: data.initiative_official_code ?? 'Not defined' } : {}),
          workpackage_name: `${data.workpackage_short_name}: ${data.workpackage_name}`,
          toc_result_title: result.toc_result_title ?? 'Not defined',
          indicator_name: 'Not defined',
          indicator_type: 'Not defined',
          expected_target: 'Not defined',
          actual_target_achieved: 'Not provided',
          achieved_status: 'No',
          reporting_status: 'Editing',

          ...(isT1R
            ? {}
            : {
                indicator_achieved_narrative: 'Not provided',
                indicator_supporting_results: 'Not provided'
              })
        });
      }
    });
  }

  private formatWorksheet(worksheet: any, cellsToCenter?: number[]) {
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
