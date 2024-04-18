import { Injectable, Logger } from '@nestjs/common';
import { PlatformReportRepository } from './platform-report.repository';
import { PlatformReportEnum } from './entities/platform-report.enum';
import { create as createPDF } from 'pdf-creator-node';
//import Handlebars from 'handlebars';
import { ReadStream } from 'fs';
import {
  HandlersError,
  returnErrorDto,
} from '../../shared/handlers/error.utils';
import { env } from 'process';
import { ResultRepository } from '../results/result.repository';
import { Result } from '../results/entities/result.entity';

@Injectable()
export class PlatformReportService {
  private readonly _logger: Logger = new Logger(PlatformReportService.name);
  public constructor(
    private readonly _platformReportRepository: PlatformReportRepository,
    private readonly _handlerError: HandlersError,
    private readonly _resultRepository: ResultRepository,
  ) {}

  async getFullResultReportByResultCode(
    result_code: string,
    phase: string,
    report_type: PlatformReportEnum,
  ) {
    try {
      const cleanResultCodeInput = Number(result_code);
      if (Number.isNaN(cleanResultCodeInput)) {
        const error: returnErrorDto = {
          status: 404,
          message: `The provided result code "${result_code}" is not valid`,
          response: null,
        };
        throw error;
      }

      if ((phase?.trim() ?? '').length === 0) {
        const results: Result[] = await this._resultRepository.find({
          where: {
            result_code: cleanResultCodeInput,
            is_active: true,
          },
          order: { version_id: 'DESC' },
        });
        phase = String(results[0]?.version_id ?? '0');
      }

      const cleanPhaseInput = Number(phase ?? '1');

      if (Number.isNaN(cleanPhaseInput)) {
        const error: returnErrorDto = {
          status: 404,
          message: `The provided phase code "${phase}" is not valid`,
          response: null,
        };
        throw error;
      }

      const report = await this._platformReportRepository.findOne({
        where: { id: report_type.id },
        relations: { template_object: { children_array: true } },
      });

      const data =
        (
          await this._platformReportRepository.getDataFromProcedure(
            report.function_data_name,
            [cleanResultCodeInput, cleanPhaseInput, env.FRONT_END_PDF_ENDPOINT],
          )
        )?.[0]?.result ?? '';

      if (data['error'] || data['internal_error']) {
        const error: returnErrorDto = {
          status: data['error'] ? 404 : 500,
          message: data['error'] ?? data['internal_error'],
          response: null,
        };
        throw error;
      }

      /*const header = report.template_object.children_array.find(
        (c) => c.name === enumValue.children.header_name,
      )?.template;
      const footer = report.template_object.children_array.find(
        (c) => c.name === enumValue.children.footer_name,
      )?.template;
      const compiledHeader = Handlebars.compile(header)(data);
      const compiledFooter = Handlebars.compile(footer)(data);*/

      const options = {
        format: 'A3',
        orientation: 'portrait',
        timeout: '100000',
        border: {
          //top: '0mm',
          right: '10mm',
          //bottom: '15mm',
          left: '10mm',
        },
        header: {
          height: '40mm',
        },
        footer: {
          height: '30mm',
          contents: {
            //first: 'Cover page',
            //2: 'Second page', // Any page number is working. 1-based index
            default: ` 
            <style>
              .footer {
                width: 100%;
                height: 100%;
                color: #303030;
              }
              .text {
                font-style: italic;
                width: 100%;
                font-size: .7rem !important;
              }
              .page_counter {
                min-width: 150px;
                text-align: right;
                font-size: .8rem;
              }
            </style>
            <table class="footer">
              <tr>
                <td class="text">
                  This report was generated on ${data.generation_date_footer}. Please note that the contents of this report may change in the future as it is dependent on the data entered into the PRMS Reporting tool at a given time during a specific phase
                </td>
                <td class="page_counter">{{page}}/{{pages}}</td>
              </tr>
            </table>
              `, // fallback value
            //last: 'Last Page',
          },
        },
        childProcessOptions: {
          env: {
            OPENSSL_CONF: '/dev/null',
          },
        },
      };

      const document = {
        html: report.template_object.template,
        data: data,
        type: 'stream',
      };

      /*const compiledTemplate = Handlebars.compile(
        report.template_object.template,
      )(data);*/

      const pdf: ReadStream = await createPDF(document, options)
        .then((res: ReadStream) => {
          return res;
        })
        .catch((_error) => {
          this._logger.error(_error);
          return null;
        });

      return { pdf, filename_date: data.generation_date_filename };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }
}
