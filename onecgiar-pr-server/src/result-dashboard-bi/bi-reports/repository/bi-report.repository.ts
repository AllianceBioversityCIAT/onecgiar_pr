import { Injectable } from '@nestjs/common/decorators';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { BiReport } from '../entities/bi-report.entity';
import { HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from 'src/result-dashboard-bi/clarisa-credentials-bi.service';
import { CredentialsClarisaBi } from '../dto/crendentials-clarisa.dto';
import { lastValueFrom, map } from 'rxjs';
import { BodyPowerBiDTO, EmbedCredentialsDTO, ReportInformation } from '../dto/embed-credentials.dto';
import { CreateBiReportDto } from '../dto/create-bi-report.dto';

@Injectable()
export class BiReportRepository extends Repository<BiReport> {
    private linkAzure: string;
    private credentialsBi: CredentialsClarisaBi;
  constructor(private dataSource: DataSource, private readonly _httpService: HttpService,private _servicesClarisaCredentials: ClarisaCredentialsBiService) {
    super(BiReport, dataSource.createEntityManager());
  }

  async getBarerTokenAzure(){
    this.credentialsBi = await this._servicesClarisaCredentials.getCredentialsBi();
    const params = new URLSearchParams()
    params.append( 'grant_type', 'client_credentials');
    params.append( 'client_id', this.credentialsBi.app_id);
    params.append( 'client_secret', this.credentialsBi.secret);
    params.append( 'resource', this.credentialsBi.resource_url);
    const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    //Organice url azure
    this.credentialsBi.azure_api_url = await this.credentialsBi.azure_api_url.replace('{tenantID}', this.credentialsBi.tenant_id );
    
    //Barer token
    const dataCredentials= await lastValueFrom(
        await this._httpService
          .post(`${this.credentialsBi.azure_api_url}`, params,config)
          .pipe(map((resp) => resp.data)),
      );
    

    return dataCredentials;
  }

  async getTokenPowerBi(){
    const barerTokenAzure = await this.getBarerTokenAzure();

    const reportsBi: BiReport[] = await this.getReportsBi();

    let datasets: BodyPowerBiDTO[] = [];
    let reportsId: BodyPowerBiDTO[] = [];

    reportsBi.map((resp) =>{
      let auxIdReportBi: BodyPowerBiDTO = new BodyPowerBiDTO;
      let auxIdDataSetsBi: BodyPowerBiDTO = new BodyPowerBiDTO;
      auxIdReportBi.id = resp.report_id;
      reportsId.push(auxIdReportBi);
      auxIdDataSetsBi.id = resp.dataset_id;
      datasets.push(auxIdDataSetsBi);
    })

    const bodyRequestPowerBi = {
      datasets: datasets,
      reports:reportsId
    }
    const bodyPowerBi = {
        datasets: [
            {
              id: "81afea2f-c93c-4f55-8c3e-617b87e469b9"
            }
          ],
          reports: [
            {
              id: "de3d27cc-2849-4459-aec4-fe4cbe47b451"
            }
          ]
    }

    const tokenPowerBi = await lastValueFrom(
        await this._httpService
          .post(`${this.credentialsBi.api_token_url}`,bodyPowerBi ,{headers:{Authorization: `Bearer ${barerTokenAzure.access_token}`}})
          .pipe(map((resp) => resp.data)),
      );

    let informationEmbedBi: EmbedCredentialsDTO = new EmbedCredentialsDTO;
    informationEmbedBi.embed_token = tokenPowerBi.token;
    let auxReportsInfo: ReportInformation[] = []
    reportsBi.map((resp)=>{
      let reportsInfo: ReportInformation = new ReportInformation;

      reportsInfo.resport_id = resp.report_id;
      reportsInfo.name = resp.report_name;
      reportsInfo.description = resp.report_description;
      reportsInfo.embed_url = this.credentialsBi.embed_url_base+resp.report_id+'&groupId='+resp.group_id+'&config='+this.credentialsBi.config_id;
      auxReportsInfo.push(reportsInfo)
    })
    informationEmbedBi.reportsInformation = auxReportsInfo;
    
   return informationEmbedBi;
  }

  async getReportsBi(){
    const getResportBi: BiReport[] = await this.find({where:{
      is_active: true
    }});

    return getResportBi;
  }

  async createNewRegisterBi(createBiReport: CreateBiReportDto){
    let returnReportBi = this.save(createBiReport);
    return returnReportBi;
  }

}

