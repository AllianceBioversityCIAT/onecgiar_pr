import { Injectable } from '@nestjs/common';
import { create as createPDF } from 'pdf-creator-node';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ResultReportService {
  async findOne(id: number) {
    const templateRead = readFileSync(
      join(__dirname, '../templates/test-template.html'),
      'utf-8',
    );

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

    var users = [
      {
        id,
        name: 'Shyam',
        age: '26',
      },
      {
        id,
        name: 'Navjot',
        age: '26',
      },
      {
        id,
        name: 'Vitthal',
        age: '26',
      },
    ];

    var document = {
      html: templateRead,
      data: {
        users: users,
      },
      type: 'buffer',
    };

    const pdf: Buffer = await createPDF(document, options)
      .then((res: Buffer) => {
        console.log(res);
        return res;
      })
      .catch((error) => {
        console.error(error);
        return null;
      });

    return pdf;
  }
}
