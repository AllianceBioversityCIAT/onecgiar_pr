import { Injectable } from '@nestjs/common';
import { create as createPDF } from 'pdf-creator-node';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

@Injectable()
export class ResultReportService {
  constructor(private _dataSource: DataSource) {}

  async findOne(id: number) {
    const templateRead =
      (
        await this._dataSource.query(
          'select fullHtmlReportTemplateByResultCode(?)',
          [id],
        )
      )?.[0]?.[`fullHtmlReportTemplateByResultCode(${id})`] ?? '';

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

    var document = {
      html: templateRead,
      data: {},
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
  }
}
