import { Injectable } from '@nestjs/common/decorators';
import { DataSource, Repository } from 'typeorm';
import { BiReport } from '../entities/bi-report.entity';
import { HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from 'src/result-dashboard-bi/clarisa-credentials-bi.service';
import { CredentialsClarisaBi } from '../dto/crendentials-clarisa.dto';
import { lastValueFrom, map } from 'rxjs';
import {
  BodyPowerBiDTO,
  EmbedCredentialsDTO,
  ReportInformation,
} from '../dto/embed-credentials.dto';
import { CreateBiReportDto } from '../dto/create-bi-report.dto';
import { TokenBiReport } from '../entities/token-bi-reports.entity';
import { TokenReportBiDto } from '../dto/create-token-bi-report.dto';
import { NotFoundException } from '@nestjs/common';
import { TokenBiReportRepository } from './token-bi-reports.repository';
import { GetBiSubpagesDto } from '../dto/get-bi-subpages.dto';
import { BiSubpagesRepository } from './bi-subpages.repository';

@Injectable()
export class BiReportRepository extends Repository<BiReport> {
  private credentialsBi: CredentialsClarisaBi;
  private barerTokenAzure: any;
  constructor(
    private dataSource: DataSource,
    private readonly _httpService: HttpService,
    private _servicesClarisaCredentials: ClarisaCredentialsBiService,
    private tokenBireports: TokenBiReportRepository,
    private biSubpagesRepository: BiSubpagesRepository,
  ) {
    super(BiReport, dataSource.createEntityManager());
  }

  async getBarerTokenAzure() {
    this.credentialsBi =
      await this._servicesClarisaCredentials.getCredentialsBi();
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.credentialsBi.app_id);
    params.append('client_secret', this.credentialsBi.secret);
    params.append('resource', this.credentialsBi.resource_url);
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    //Organice url azure
    this.credentialsBi.azure_api_url =
      await this.credentialsBi.azure_api_url.replace(
        '{tenantID}',
        this.credentialsBi.tenant_id,
      );

    //Bearer token
    let dataCredentials: any;

    try {
      dataCredentials = await lastValueFrom(
        await this._httpService
          .post(`${this.credentialsBi.azure_api_url}`, params, config)
          .pipe(map((resp) => resp.data)),
      );
    } catch (error) {
      return error;
    }
    return dataCredentials;
  }

  async getTokenPowerBi(report: any) {
    console.log('getTokenPowerBi');
    if (report) {
      const barerTokenAzure = await this.getBarerTokenAzure();
      let tokenPowerBi;
      console.log('get azure token');
      console.log('token', barerTokenAzure.access_token);
      console.log([{ id: report.dataset_id }]);
      console.log([{ id: report.report_id }]);
      try {
        tokenPowerBi = await lastValueFrom(
          this._httpService
            .post(
              `${this.credentialsBi.api_token_url}`,
              {
                datasets: [{ id: report.dataset_id }],
                reports: [{ id: report.report_id }],
              },
              {
                headers: {
                  Authorization: `Bearer ${barerTokenAzure.access_token}`,
                },
              },
            )
            .pipe(map((resp) => resp.data)),
        );
        console.log(tokenPowerBi.token);
      } catch (error) {
        console.log(error);
        return { ...error, isError: true };
      }

      const reportTokenBiDto = new TokenReportBiDto();
      reportTokenBiDto.token_bi = tokenPowerBi.token;
      reportTokenBiDto.expiration_toke_id = tokenPowerBi.expiration;
      reportTokenBiDto.is_active = true;
      await this.tokenBireports.save(reportTokenBiDto);
      const informationEmbedBi: EmbedCredentialsDTO = new EmbedCredentialsDTO();
      informationEmbedBi.embed_token = tokenPowerBi.token;
      const auxReportsInfo: ReportInformation[] = [];
      const reportsInfo: ReportInformation = report;
      reportsInfo.embed_url =
        this.credentialsBi.embed_url_base +
        report.report_id +
        '&groupId=' +
        report.group_id +
        '&config=' +
        this.credentialsBi.config_id;
      auxReportsInfo.push(reportsInfo);
      informationEmbedBi.reportsInformation = auxReportsInfo;

      return informationEmbedBi;
    }

    return {
      Error:
        'At this time there are no reports or none are active for viewing.',
    };
  }

  async getReportsBi() {
    const getResportBi: BiReport[] = await this.find({
      where: {
        is_active: true,
      },
    });

    return getResportBi;
  }

  async getTokenAndReportById(id: number) {
    this.credentialsBi =
      await this._servicesClarisaCredentials.getCredentialsBi();
    const tokensReports: TokenBiReport[] = await this.tokenBireports.query(
      `select * from token_report_bi trb order by id desc limit 1;`,
    );
    const today = new Date();
    const reportsExist = await this.findOneBy({ id, is_active: true });
    if (reportsExist != null) {
      if (
        tokensReports.length <= 0 ||
        Date.parse(tokensReports[0].expiration_toke_id.toString()) <
          Date.parse(today.toString())
      ) {
        const registerInToken = await this.getTokenPowerBi(Number(id));
        const responseToken = await registerInToken[
          'reportsInformation'
        ].filter((report) => report.id == id);
        return {
          token: registerInToken['embed_token'],
          report: responseToken[0],
        };
      } else {
        const reportsInfo: ReportInformation = new ReportInformation();
        reportsInfo.id = reportsExist.id;
        reportsInfo.report_id = reportsExist.report_id;
        reportsInfo.name = reportsExist.report_name;
        reportsInfo.order = reportsExist.report_order;
        reportsInfo.embed_url =
          this.credentialsBi.embed_url_base +
          reportsExist.report_id +
          '&groupId=' +
          reportsExist.group_id +
          '&config=' +
          this.credentialsBi.config_id;

        return {
          token: tokensReports[0].token_bi,
          report: reportsInfo,
        };
      }
    } else {
      return {
        error: 'This Report not exists',
      };
    }
  }

  async getTokenAndReportByName(getBiSubpagesDto: GetBiSubpagesDto) {
    let filterList = [];
    const mainPage =
      await this.biSubpagesRepository.getReportSubPage(getBiSubpagesDto);

    const { report_name } = getBiSubpagesDto;
    let report = null;
    try {
      this.credentialsBi =
        await this._servicesClarisaCredentials.getCredentialsBi();
      report = await this.getReportByName(report_name);
      report = report.pop();
      filterList = await this.getFiltersByReportId(report.id);
    } catch (error) {
      console.error(error);
    }

    if (report != null && report.length != 0) {
      let registerInToken = null;
      registerInToken = await this.getTokenPowerBi(report);
      // console.log(registerInToken);
      if (registerInToken?.isError)
        throw new NotFoundException({ message: 'Error generating bi token' });
      const responseToken = await registerInToken['reportsInformation'].filter(
        (report) => report.report_name == report_name,
      );

      return {
        token: registerInToken['embed_token'],
        azureValidation: registerInToken ? 1 : 0,
        filters: filterList,
        report: { ...responseToken[0], mainPage },
      };
    } else {
      throw new NotFoundException({ message: 'This report does not exist' });
    }
  }

  async createNewRegisterBi(createBiReport: CreateBiReportDto) {
    const returnReportBi = this.save(createBiReport);
    return returnReportBi;
  }

  async getReportByName(report_name: string) {
    return await this.query(
      `select * from bi_reports br WHERE br.report_name = ? and is_active = 1`,
      [report_name],
    );
  }

  async getFiltersByReportId(report_id: number) {
    return await this.query(
      `select * from bi_filters bf WHERE bf.report_id = ?`,
      [report_id],
    );
  }
}
