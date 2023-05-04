import { Injectable } from '@nestjs/common';
import { PlatformReportRepository } from './platform-report.repository';
import { PlatformReportEnum } from './entities/platform-report.enum';
import { create as createPDF } from 'pdf-creator-node';

@Injectable()
export class PlatformReportService {
  public constructor(
    private readonly _platformReportRepository: PlatformReportRepository,
  ) {}

  async getFullResultReportByResultCode(result_code: number) {
    const report = await this._platformReportRepository.findOne({
      where: { id: PlatformReportEnum.FULL_RESULT_REPORT.id },
      relations: { template_object: true },
    });

    const data =
      (
        await this._platformReportRepository.getDataFromProcedure(
          report.function_data_name,
          [result_code],
        )
      )?.[0]?.result ?? '';

    const options = {
      format: 'A3',
      orientation: 'portrait',
      border: '10mm',
      header: {
        height: '45mm',
        contents: '<div style="text-align: center;">Author: PRMS Team</div>',
      },
      footer: {
        height: '28mm',
        contents: {
          first: 'Cover page',
          2: 'Second page', // Any page number is working. 1-based index
          default:
            '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
          last: 'Last Page',
        },
      },
    };

    const document = {
      html: report.template_object.template,
      data: data,
      type: 'buffer',
    };

    const pdf: Buffer = await createPDF(document, options)
      .then((res: Buffer) => {
        //console.log(res);
        return res;
      })
      .catch((error) => {
        console.error(error);
        return null;
      });

    return pdf;
  }
}
