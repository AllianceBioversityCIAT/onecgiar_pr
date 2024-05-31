import { Injectable } from '@nestjs/common/decorators';
import { DataSource, Repository } from 'typeorm';
import { BiReport } from '../entities/bi-report.entity';
import { HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from 'src/result-dashboard-bi/clarisa-credentials-bi.service';
import { CredentialsClarisaBi } from '../dto/crendentials-clarisa.dto';
import { lastValueFrom, map } from 'rxjs';
import {
  EmbedCredentialsDTO,
  ReportInformation,
} from '../dto/embed-credentials.dto';
import { CreateBiReportDto } from '../dto/create-bi-report.dto';
import { TokenReportBiDto } from '../dto/create-token-bi-report.dto';
import { NotFoundException } from '@nestjs/common';
import { GetBiSubpagesDto } from '../dto/get-bi-subpages.dto';
import { BiSubpagesRepository } from './bi-subpages.repository';

@Injectable()
export class BiReportRepository extends Repository<BiReport> {
  private credentialsBi: CredentialsClarisaBi;
  constructor(
    private dataSource: DataSource,
    private readonly _httpService: HttpService,
    private _servicesClarisaCredentials: ClarisaCredentialsBiService,
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
    this.credentialsBi.azure_api_url = this.credentialsBi.azure_api_url.replace(
      '{tenantID}',
      this.credentialsBi.tenant_id,
    );

    //Bearer token
    let dataCredentials: any;

    try {
      dataCredentials = await lastValueFrom(
        this._httpService
          .post(`${this.credentialsBi.azure_api_url}`, params, config)
          .pipe(map((resp) => resp.data)),
      );
    } catch (error) {
      return error;
    }
    return dataCredentials;
  }

  async getTokenPowerBi(report: any) {
    if (report) {
      const barerTokenAzure = await this.getBarerTokenAzure();
      let tokenPowerBi;
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
      } catch (error) {
        return { ...error, isError: true };
      }

      const reportTokenBiDto = new TokenReportBiDto();
      reportTokenBiDto.token_bi = tokenPowerBi.token;
      reportTokenBiDto.expiration_toke_id = tokenPowerBi.expiration;
      reportTokenBiDto.is_active = true;
      const informationEmbedBi: EmbedCredentialsDTO = new EmbedCredentialsDTO();
      informationEmbedBi.embed_token = tokenPowerBi.token;
      const reportsInfo: ReportInformation = report;
      reportsInfo.embed_url =
        this.credentialsBi.embed_url_base +
        report.report_id +
        '&groupId=' +
        report.group_id +
        '&config=' +
        this.credentialsBi.config_id;
      informationEmbedBi.report = reportsInfo;

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
    return {
      token: id,
      report: {},
    };
  }

  async getTokenAndReportByName(getBiSubpagesDto: GetBiSubpagesDto) {
    let filterList = [];
    let mainPage = null;

    const { report_name } = getBiSubpagesDto;
    let report = null;
    try {
      this.credentialsBi =
        await this._servicesClarisaCredentials.getCredentialsBi();
      report = await this.getReportByName(report_name);
      report = report.pop();
      filterList = await this.getFiltersByReportId(report.id);
      mainPage = await this.biSubpagesRepository.getSubPageByReportId(
        report.id,
        getBiSubpagesDto.subpage_id,
      );
    } catch (error) {
      console.error(error);
    }

    if (report != null && report.length != 0) {
      let registerInToken = null;
      registerInToken = await this.getTokenPowerBi(report);
      if (registerInToken?.isError)
        throw new NotFoundException({ message: 'Error generating bi token' });

      return {
        token: registerInToken.embed_token,
        azureValidation: registerInToken ? 1 : 0,
        filters: filterList,
        report: { ...registerInToken.report, mainPage },
      };
    } else {
      throw new NotFoundException({ message: 'This report does not exist' });
    }
  }

  async createNewRegisterBi(createBiReport: CreateBiReportDto) {
    const returnReportBi = this.save(createBiReport);
    return returnReportBi;
  }

  async getAllReports() {
    const filterColumnNames =
      '"id",f.id, "variablename",f.variablename,"scope",f.scope,"table",f.table,"column",f.column,"operator",f.operator,"param_type",f.param_type,"report_id",f.report_id';

    const columnNames =
      '"id", r.id, "report_name",r.report_name, "report_title",r.report_title, "report_description",r.report_description, "report_id",r.report_id, "dataset_id",r.dataset_id, "group_id",r.group_id, "is_active",r.is_active, "has_rls_security",r.has_rls_security, "report_order", r.report_order, "has_full_screen", r.has_full_screen';

    return await this.query(
      `SELECT JSON_OBJECT(${columnNames}) as report , JSON_ARRAYAGG(IF (f.id IS null,null,JSON_OBJECT(${filterColumnNames}))) AS filters FROM bi_reports r
      LEFT JOIN bi_filters f ON r.id = f.report_id 
      WHERE r.is_active = 1 
      GROUP BY r.id
      ORDER BY r.report_order ASC;`,
      [],
    );
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
