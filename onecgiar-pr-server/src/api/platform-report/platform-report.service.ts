import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformReportRepository } from './repositories/platform-report.repository';
import { PlatformReportEnum } from './entities/platform-report.enum';
import {
  HandlersError,
  returnErrorDto,
} from '../../shared/handlers/error.utils';
import { env } from 'process';
import { ResultRepository } from '../results/result.repository';
import { Result } from '../results/entities/result.entity';
import axios from 'axios';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PlatformReportService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(PlatformReportService.name);
  private authHeaderMs2 = JSON.stringify({
    username: env.MS_REPORTS_USER,
    password: env.MS_REPORTS_PASSWORD,
  });
  private authHeaderMs4 = JSON.stringify({
    username: env.MS_FILE_MANAGEMENT_USER,
    password: env.MS_FILE_MANAGEMENT_PASSWORD,
  });

  public constructor(
    private readonly _platformReportRepository: PlatformReportRepository,
    private readonly _handlerError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    @Inject('REPORT_SERVICE') private client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this._logger.log(
        'Successfully connected to RabbitMQ Reports MicroService',
      );
    } catch (error) {
      this._logger.error(
        'Failed to connect to RabbitMQ Reports MicroService',
        error.message,
      );
    }
  }

  async getFullResultReportByResultCode(
    result_code: string,
    phase: string,
    report_type: PlatformReportEnum,
  ) {
    try {
      const cleanResultCodeInput = Number(result_code);
      this._logger.log(`Result to be processed: ${cleanResultCodeInput}`);
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

      const optionsIPSR = {
        format: 'A3',
        orientation: 'portrait',
        timeout: '300000',
        header: {
          height: '40mm',
        },
        footer: {
          height: '30mm',
          contents: {
            first: `
            <style>
              .footer {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: flex-start;
                align-items: center;
                color: #303030;
                padding: 0 5rem;
              }
              .text {
                font-style: italic;
                width: 100%;
                font-size: .7rem !important;
              }
            </style>
            <table class="footer">
              <tr>
                <td class="text">
                  This report was generated on ${data.generation_date_footer}. Please note that the contents of this report may change in the future as it is dependent on the data entered into the PRMS Reporting tool at a given time during a specific phase
                </td>
              </tr>
            </table>
              `,
            default: `
            <style>
              .footer {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 5rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .text {
                font-style: italic;
                width: 100%;
                color: #303030;
                font-size: .7rem !important;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 65%;
              }
              .svg-logo {
                position: absolute;
                right: 0;
                bottom: 0;
                margin-top: 12px;
              }
              .green-line {
                background-color: #427730;
                width: 100%;
                height: 10px;
                position: absolute;
                bottom: 10px;
                left: 0;

              }
            </style>
            <div class="footer">
            <p class="text">${data.result_name}</p>
            
            <div class="green-line"></div>

            <svg width="30pt" height="35pt" viewBox="0 0 1097 1281" version="1.1" xmlns="http://www.w3.org/2000/svg" class="svg-logo">
              <g id="#4c4c4cff">
                <path fill="#4c4c4c" opacity="1.00" d=" M 537.42 4.51 C 543.66 0.67 552.51 0.90 558.05 5.92 C 562.98 10.08 564.75 16.75 564.69 22.98 C 564.80 84.03 564.57 145.09 564.81 206.13 C 569.10 214.32 574.21 222.09 578.94 230.05 C 586.23 241.03 592.18 252.81 598.73 264.23 C 606.63 278.76 614.61 294.10 615.27 310.98 C 615.79 326.80 608.67 341.78 599.11 354.00 C 591.37 364.22 581.69 372.70 572.78 381.85 C 564.22 390.54 555.40 398.98 546.99 407.82 C 532.66 394.57 518.59 380.99 505.29 366.69 C 496.44 356.27 486.92 345.79 482.37 332.64 C 478.12 321.22 478.47 308.48 482.09 296.95 C 488.44 276.83 498.82 258.35 509.00 239.98 C 515.29 228.59 522.01 217.42 528.36 206.07 C 528.85 161.06 528.15 116.03 528.29 71.01 C 528.25 54.67 528.38 38.33 528.21 21.99 C 528.13 15.15 531.36 8.00 537.42 4.51 M 514.27 296.16 C 509.96 307.72 508.86 321.06 514.26 332.46 C 520.69 346.28 533.61 355.64 546.67 362.70 C 557.27 354.12 568.96 346.21 576.50 334.60 C 582.33 325.79 582.97 314.52 580.22 304.53 C 576.05 288.62 567.58 274.29 559.16 260.31 C 558.14 259.18 558.79 257.67 558.66 256.35 C 558.05 256.64 557.45 256.95 556.87 257.27 C 554.11 251.46 549.98 246.46 546.70 240.95 C 535.48 259.08 521.67 275.93 514.27 296.16 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 673.04 120.07 C 681.64 116.05 693.12 118.51 698.68 126.40 C 701.56 130.31 701.49 135.42 701.51 140.05 C 701.33 159.05 701.90 178.04 701.70 197.04 C 702.40 210.66 701.96 224.30 702.08 237.93 C 702.44 249.94 702.20 261.97 702.27 273.99 C 702.55 327.33 702.75 380.68 702.08 434.01 C 701.93 443.01 700.94 451.98 701.09 460.99 C 701.31 471.76 702.34 483.19 697.30 493.14 C 690.74 506.49 677.81 515.01 665.42 522.40 C 643.67 535.14 620.42 545.13 596.82 553.89 C 586.41 557.59 576.05 561.64 565.29 564.20 C 564.95 543.47 564.65 522.73 564.30 502.00 C 564.26 487.19 562.26 472.23 564.73 457.51 C 567.11 442.87 575.71 430.22 585.33 419.32 C 604.62 397.93 627.07 379.69 646.65 358.59 C 652.75 352.07 658.24 344.66 660.90 336.03 C 664.90 323.42 664.37 310.05 664.73 297.00 C 664.71 242.67 664.74 188.34 664.72 134.01 C 664.56 128.30 667.76 122.48 673.04 120.07 M 618.69 435.64 C 609.00 444.85 601.14 456.57 599.02 469.98 C 596.79 484.93 598.38 500.09 599.30 515.09 C 606.33 513.36 612.81 509.94 619.63 507.54 C 630.95 502.85 642.99 498.69 652.15 490.22 C 660.03 483.07 663.26 472.35 664.41 462.08 C 666.48 442.53 664.58 422.87 663.20 403.34 C 647.63 413.01 632.04 422.97 618.69 435.64 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 400.08 120.18 C 406.67 117.23 415.15 117.30 421.03 121.84 C 424.66 124.72 426.60 129.41 426.51 134.00 C 426.48 168.32 426.51 202.65 426.50 236.98 C 426.61 261.67 426.24 286.35 426.73 311.03 C 427.28 321.33 428.00 331.98 432.47 341.45 C 437.31 351.99 445.94 359.99 453.83 368.23 C 469.59 383.75 486.15 398.45 501.46 414.43 C 510.47 424.08 519.07 434.62 523.73 447.12 C 527.39 456.96 528.07 467.62 527.59 478.02 C 526.87 506.84 526.21 535.65 526.08 564.47 C 504.46 558.14 483.35 550.10 462.70 541.13 C 446.76 533.95 431.00 526.20 416.41 516.52 C 406.21 509.61 396.23 500.92 392.19 488.89 C 387.70 475.67 391.66 461.63 389.71 448.10 C 388.29 411.74 388.85 375.34 388.73 338.96 C 388.60 307.98 389.06 277.01 388.92 246.03 C 389.76 230.04 388.90 214.01 389.47 198.01 C 389.41 177.34 389.78 156.67 389.77 136.00 C 389.54 129.18 393.92 122.88 400.08 120.18 M 428.27 403.33 C 426.92 414.17 426.51 425.12 426.12 436.04 C 425.99 450.88 425.28 466.55 431.77 480.32 C 436.99 491.32 448.15 497.63 458.89 502.25 C 469.70 507.10 480.94 510.91 491.78 515.67 C 492.93 501.23 494.35 486.59 492.55 472.14 C 491.02 459.36 484.42 447.69 475.48 438.62 C 461.71 424.45 444.80 413.94 428.27 403.33 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 1053.03 463.28 C 1066.28 456.05 1078.67 447.28 1089.80 437.10 C 1078.76 473.70 1061.76 508.79 1037.72 538.66 C 1014.72 567.61 985.48 591.37 953.01 608.96 C 928.41 622.42 902.03 632.47 875.02 639.89 C 851.59 646.27 827.66 650.56 803.88 655.37 C 767.61 662.42 731.23 668.88 695.19 676.99 C 659.01 685.34 622.64 695.08 589.69 712.63 C 580.92 717.12 572.95 722.91 564.68 728.21 C 566.95 708.87 565.48 689.39 564.91 670.00 C 565.16 652.86 564.97 635.19 571.09 618.91 C 576.60 603.43 587.91 590.66 600.96 580.98 C 618.47 568.11 638.56 559.27 658.92 551.96 C 698.36 538.39 739.85 532.38 781.03 526.80 C 815.33 522.32 849.74 518.55 883.84 512.66 C 915.40 507.43 946.89 501.40 977.71 492.74 C 1003.66 485.34 1029.32 476.29 1053.03 463.28 M 995.94 527.48 C 984.25 532.09 972.23 535.79 960.17 539.27 C 898.41 556.52 834.76 565.35 771.53 575.29 C 736.94 580.78 702.11 585.77 668.41 595.56 C 649.60 601.41 630.16 608.75 616.42 623.48 C 605.24 635.21 600.07 651.16 597.28 666.79 C 620.96 657.62 645.34 650.29 670.08 644.58 C 704.18 636.69 738.63 630.42 772.93 623.45 C 805.80 616.90 838.72 610.24 870.87 600.65 C 895.99 593.15 920.60 583.50 943.18 570.08 C 962.59 558.38 980.50 544.10 995.94 527.48 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 0.93 437.45 C 17.53 452.67 37.13 464.23 57.65 473.34 C 97.92 491.01 141.06 500.86 184.16 508.81 C 209.61 513.29 235.12 517.51 260.78 520.66 C 306.07 526.53 351.65 531.24 396.17 541.76 C 419.64 547.29 442.65 555.02 464.27 565.76 C 478.99 573.21 493.29 582.19 504.42 594.53 C 513.96 604.96 520.39 618.10 522.94 632.00 C 528.68 663.89 521.86 696.33 525.70 728.36 C 512.70 719.16 498.96 711.03 484.36 704.64 C 459.17 693.45 432.55 685.95 405.83 679.46 C 361.57 668.96 316.67 661.45 272.08 652.53 C 251.42 648.31 230.66 644.41 210.40 638.51 C 170.48 627.07 131.98 609.46 98.97 584.06 C 69.44 561.51 44.82 532.67 26.87 500.16 C 16.00 480.29 7.03 459.28 0.93 437.45 M 94.85 527.87 C 104.84 538.76 116.12 548.47 127.97 557.29 C 156.96 578.83 190.88 592.57 225.42 602.40 C 271.87 615.52 319.52 623.59 366.76 633.24 C 409.48 641.66 452.36 650.68 492.96 666.78 C 490.41 650.98 484.87 635.05 473.74 623.19 C 462.25 611.05 446.68 603.95 431.14 598.51 C 411.22 591.78 390.57 587.49 369.92 583.68 C 324.59 575.61 278.92 569.62 233.56 561.68 C 186.66 553.52 139.72 544.09 94.85 527.87 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 44.03 574.70 C 57.70 589.21 72.26 603.02 88.75 614.32 C 121.04 636.90 159.21 648.47 196.62 659.40 C 262.62 679.08 330.87 689.37 397.94 704.56 C 420.19 709.83 442.57 715.23 463.65 724.26 C 478.91 730.85 493.55 740.04 503.70 753.45 C 513.78 766.47 518.76 782.75 520.38 798.97 C 522.44 817.90 519.75 837.00 521.99 855.93 C 522.42 883.04 521.30 910.14 521.28 937.25 C 481.65 937.34 442.02 937.19 402.39 937.32 C 402.13 915.87 402.40 894.42 402.26 872.97 C 401.84 862.35 400.06 851.17 393.33 842.58 C 385.13 831.91 372.36 826.20 359.93 822.01 C 336.94 814.55 312.89 811.23 289.49 805.36 C 266.41 799.30 243.84 791.51 221.30 783.71 C 167.77 766.32 118.57 733.30 85.79 687.13 C 62.26 654.22 47.69 614.98 44.03 574.70 M 120.33 673.29 C 127.10 684.62 135.51 694.98 145.24 703.90 C 170.27 726.97 201.75 741.48 233.54 752.71 C 274.68 766.80 316.98 777.02 359.03 787.93 C 378.64 793.42 398.91 798.50 416.16 809.77 C 427.20 816.85 435.06 828.78 436.35 841.93 C 437.99 860.78 439.04 879.76 438.24 898.68 C 454.31 898.79 470.37 898.66 486.44 898.75 C 486.58 877.17 486.47 855.58 486.50 833.99 C 486.30 815.66 483.63 796.40 473.12 780.90 C 465.24 768.93 452.96 760.55 439.86 755.16 C 427.91 750.11 415.04 748.02 402.42 745.32 C 350.46 734.56 298.47 723.93 246.51 713.18 C 203.30 703.99 160.79 691.13 120.33 673.29 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 988.51 621.56 C 1009.41 609.06 1027.59 592.57 1044.24 574.92 C 1040.48 613.99 1026.83 652.14 1004.43 684.41 C 973.47 729.44 926.90 762.52 875.71 780.82 C 853.74 788.49 831.75 796.17 809.37 802.60 C 782.63 810.55 754.68 813.61 728.12 822.25 C 716.23 826.31 704.05 831.66 695.82 841.53 C 688.92 849.63 686.47 860.52 686.13 870.92 C 685.87 893.13 686.42 915.35 685.85 937.54 C 646.27 937.47 606.69 937.48 567.12 937.54 C 566.48 921.70 566.69 905.85 566.28 890.01 C 566.54 874.98 565.67 859.92 567.04 844.94 C 567.99 832.30 566.16 819.65 567.24 807.02 C 567.97 788.56 572.57 769.64 583.74 754.61 C 592.97 741.94 606.28 732.90 620.34 726.33 C 641.37 716.63 663.97 711.09 686.39 705.65 C 746.01 691.88 806.58 682.39 865.79 666.80 C 885.99 661.43 906.01 655.43 925.92 649.08 C 947.58 641.92 968.99 633.50 988.51 621.56 M 870.08 706.74 C 844.32 713.34 818.14 718.08 792.13 723.59 C 755.36 731.12 718.59 738.69 681.84 746.34 C 668.81 748.91 655.63 751.63 643.59 757.43 C 629.42 763.95 617.13 774.99 610.39 789.18 C 602.94 804.62 601.54 822.11 601.71 839.01 C 601.68 858.87 601.81 878.74 601.65 898.60 C 617.67 898.87 633.70 898.68 649.73 898.70 C 649.48 881.14 649.98 863.58 651.46 846.07 C 651.97 836.00 655.38 825.81 662.32 818.34 C 671.35 808.45 683.87 802.74 696.22 798.16 C 711.30 792.68 726.87 788.72 742.38 784.67 C 770.88 777.51 799.31 770.07 827.47 761.67 C 863.36 750.80 899.44 737.71 929.75 715.06 C 944.94 703.75 958.21 689.73 967.87 673.40 C 936.35 687.40 903.50 698.29 870.08 706.74 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 213.95 1061.11 C 236.56 1058.34 260.02 1060.41 281.33 1068.72 C 280.14 1080.45 279.28 1092.20 278.28 1103.95 C 269.36 1099.57 260.11 1095.56 250.17 1094.25 C 236.80 1092.48 222.82 1092.25 209.90 1096.64 C 194.83 1101.48 181.83 1112.24 174.07 1126.01 C 166.18 1139.52 163.00 1155.42 163.41 1170.96 C 163.75 1191.41 171.29 1212.50 186.97 1226.19 C 200.53 1238.20 219.12 1243.28 236.98 1242.51 C 251.49 1241.97 266.31 1239.95 279.64 1233.91 C 280.41 1245.49 280.95 1257.10 281.46 1268.70 C 277.35 1270.63 272.44 1270.87 268.00 1272.00 C 241.93 1277.36 214.55 1277.03 188.90 1269.71 C 172.53 1264.85 156.85 1256.54 145.09 1243.97 C 129.32 1227.73 121.56 1205.21 119.97 1182.95 C 118.15 1157.09 121.83 1129.93 135.37 1107.41 C 143.34 1094.11 154.88 1083.02 168.34 1075.35 C 182.31 1067.42 198.05 1062.96 213.95 1061.11 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 377.44 1064.61 C 393.90 1060.32 411.07 1059.31 428.01 1060.25 C 444.80 1060.92 461.51 1063.74 477.58 1068.65 C 476.69 1080.46 475.71 1092.26 474.92 1104.09 C 461.95 1098.42 448.04 1095.11 433.98 1093.67 C 420.94 1092.53 407.54 1092.78 394.94 1096.69 C 380.14 1101.03 366.78 1110.47 358.28 1123.40 C 345.44 1142.97 342.94 1168.08 348.30 1190.54 C 352.69 1209.18 364.81 1226.32 382.18 1234.87 C 401.01 1244.53 423.30 1243.96 443.51 1239.67 C 443.48 1221.61 443.49 1203.56 443.51 1185.50 C 428.85 1185.49 414.19 1185.53 399.53 1185.47 C 399.48 1174.48 399.50 1163.48 399.52 1152.49 C 427.57 1152.50 455.63 1152.50 483.69 1152.49 C 483.74 1189.99 483.73 1227.49 483.69 1265.00 C 462.54 1270.54 440.96 1275.29 419.01 1275.64 C 398.55 1275.94 377.74 1273.22 358.76 1265.28 C 341.64 1258.17 326.41 1246.06 316.72 1230.15 C 304.37 1210.22 300.83 1186.02 302.07 1162.93 C 303.16 1139.66 309.74 1115.91 324.57 1097.55 C 337.73 1080.88 357.01 1069.78 377.44 1064.61 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 523.71 1063.58 C 537.70 1063.43 551.69 1063.59 565.68 1063.50 C 565.78 1132.97 565.64 1202.44 565.75 1271.91 C 551.75 1272.18 537.73 1272.14 523.73 1271.93 C 523.71 1202.48 523.75 1133.03 523.71 1063.58 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 670.37 1063.59 C 686.03 1063.44 701.71 1063.54 717.38 1063.54 C 744.75 1132.95 771.91 1202.45 799.23 1271.88 C 783.65 1272.11 768.03 1272.35 752.46 1271.75 C 746.83 1255.84 740.63 1240.12 734.82 1224.27 C 706.74 1224.29 678.66 1224.18 650.59 1224.32 C 644.67 1240.20 638.39 1255.94 632.58 1271.86 C 618.01 1272.22 603.41 1272.16 588.84 1271.89 C 613.78 1208.08 638.59 1144.22 663.50 1080.40 C 665.86 1074.84 667.57 1068.89 670.37 1063.59 M 692.78 1105.67 C 688.84 1115.97 685.43 1126.47 681.70 1136.85 C 675.51 1155.01 668.66 1172.96 662.91 1191.26 C 682.95 1191.31 702.98 1191.32 723.02 1191.25 C 719.58 1181.09 715.94 1171.01 712.43 1160.89 C 705.78 1142.52 699.79 1123.89 692.78 1105.67 Z" />
                <path fill="#4c4c4c" opacity="1.00" d=" M 822.31 1063.52 C 838.21 1063.52 854.11 1063.53 870.01 1063.52 C 889.42 1063.60 909.20 1063.22 928.10 1068.34 C 937.51 1070.95 946.71 1075.40 953.35 1082.73 C 959.07 1088.68 962.46 1096.50 964.21 1104.49 C 966.80 1117.40 966.44 1131.43 960.23 1143.30 C 953.06 1157.47 938.23 1166.61 922.70 1168.59 C 928.25 1169.66 933.45 1172.51 936.92 1177.03 C 943.38 1184.78 946.35 1194.56 950.27 1203.68 C 959.59 1226.48 969.01 1249.23 978.27 1272.05 C 962.59 1271.95 946.90 1272.35 931.23 1271.84 C 923.45 1251.03 915.31 1230.35 907.36 1209.61 C 904.34 1201.78 901.24 1192.85 893.42 1188.59 C 884.42 1184.06 874.02 1185.95 864.34 1185.47 C 864.20 1214.28 864.30 1243.10 864.29 1271.92 C 850.28 1272.17 836.26 1272.16 822.26 1271.90 C 822.35 1202.44 822.23 1132.98 822.31 1063.52 M 864.29 1096.49 C 864.29 1115.17 864.21 1133.85 864.32 1152.54 C 876.08 1152.32 888.04 1153.16 899.59 1150.44 C 906.02 1148.87 912.56 1146.06 916.69 1140.67 C 922.21 1133.49 922.87 1123.57 920.74 1115.04 C 918.60 1106.64 910.80 1101.10 902.73 1099.09 C 890.20 1095.82 877.10 1096.69 864.29 1096.49 Z" />
              </g>
            </svg>
            </div>
              `,
          },
        },
        childProcessOptions: {
          env: {
            OPENSSL_CONF: '/dev/null',
          },
        },
      };

      const optionsReporting = {
        format: 'A3',
        orientation: 'portrait',
        timeout: '300000',
        header: {
          height: '40mm',
        },
        footer: {
          height: '30mm',
          contents: {
            default: `
            <style>
              .footer {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: flex-start;
                align-items: center;
                color: #303030;
                padding: 0 5rem;
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
                  This report was automatically generated on ${data.generation_date_footer}. Please note that the contents of this report may change in the future as it is dependent on the data entered into the PRMS Reporting tool at a given time during a specific phase
                </td>
                <td class="page_counter">{{page}}/{{pages}}</td>
              </tr>
            </table>
              `,
          },
        },
      };

      const fileName =
        'PRMS-Result-' +
        cleanResultCodeInput +
        '_' +
        data.generation_date_filename +
        '.pdf';

      const info = {
        templateData: report.template_object.template,
        data: data,
        options: Number(report.id) === 1 ? optionsReporting : optionsIPSR,
        fileName,
        bucketName: env.AWS_BUCKET_NAME,
        credentials: this.authHeaderMs2,
      };

      this.client.emit({ cmd: 'generate' }, info);
      this._logger.log('PDF generation result on queue:', info.fileName);

      try {
        return await this.fetchPDF(info.bucketName, info.fileName);
      } catch (error) {
        return this._handlerError.returnErrorRes({ error, debug: true });
      }
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async fetchPDF(bucketName: string, fileName: string): Promise<any> {
    try {
      this._logger.verbose(
        `Fetching PDF from File Management: ${fileName} in ${bucketName} bucket S3`,
      );
      const response = await axios.post<ValidationResponse>(
        env.MS_FM_URL,
        { bucketName, key: fileName },
        {
          headers: { auth: this.authHeaderMs4 },
          responseType: 'json',
        },
      );

      if (response.data.data) {
        this._logger.log('PDF generated and uploaded successfully');
        return {
          pdf: response.data.data,
          fileName,
        };
      }
      throw new Error('No data returned from the validation endpoint');
    } catch (error) {
      this._logger.error('Error fetching PDF:', error);
    }
  }
}

interface ValidationResponse {
  data: string;
}
