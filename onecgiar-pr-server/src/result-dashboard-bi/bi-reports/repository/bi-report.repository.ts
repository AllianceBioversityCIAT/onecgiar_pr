import { Injectable } from '@nestjs/common/decorators';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { BiReport } from '../entities/bi-report.entity';
import { HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from 'src/result-dashboard-bi/clarisa-credentials-bi.service';
import { CredentialsClarisaBi } from '../dto/crendentials-clarisa.dto';
import { lastValueFrom, map } from 'rxjs';
import { EmbedCredentialsDTO } from '../dto/embed-credentials.dto';

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

    const informationEmbedBi: EmbedCredentialsDTO = new EmbedCredentialsDTO;

    informationEmbedBi.embed_token = tokenPowerBi.token;
    informationEmbedBi.embed_url_base = this.credentialsBi.embed_url_base;
    informationEmbedBi.report_id = bodyPowerBi.reports;
    informationEmbedBi.group_id = 'c121c4f2-ab5c-4135-962b-2f601bb7df52';
    informationEmbedBi.config = this.credentialsBi.config_id;
    informationEmbedBi.tenant_id = this.credentialsBi.tenant_id;

      return informationEmbedBi;
  }

}