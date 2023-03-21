import { Injectable } from '@nestjs/common/decorators';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { BiReport } from '../entities/bi-report.entity';
import { HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from 'src/result-dashboard-bi/clarisa-credentials-bi.service';
import { CredentialsClarisaBi } from '../dto/crendentials-clarisa.dto';
import { filter, lastValueFrom, map } from 'rxjs';
import { BodyPowerBiDTO, EmbedCredentialsDTO, ReportInformation } from '../dto/embed-credentials.dto';
import { CreateBiReportDto } from '../dto/create-bi-report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenBiReport } from '../entities/token-bi-reports.entity';
import { log } from 'console';
import { TokenReportBiDto } from '../dto/create-token-bi-report.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class BiReportRepository extends Repository<BiReport> {
    private linkAzure: string;
    private credentialsBi: CredentialsClarisaBi;
  constructor(
    private dataSource: DataSource, 
    private readonly _httpService: HttpService,
    private _servicesClarisaCredentials: ClarisaCredentialsBiService,
    @InjectRepository(TokenBiReport)
    private tokenBireports:Repository<TokenBiReport>,) {
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
    let  dataCredentials;
    
    try {
      dataCredentials= await lastValueFrom(
        await this._httpService
          .post(`${this.credentialsBi.azure_api_url}`, params,config)
          .pipe(map((resp) => resp.data)),
      );
    } catch (error) {
      return error
    }
    

    return dataCredentials;
  }

  async getTokenPowerBi(){
    const reportsBi: BiReport[] = await this.getReportsBi();

    if(reportsBi.length > 0 ){

    let datasets: BodyPowerBiDTO[] = [];
    let reportsId: BodyPowerBiDTO[] = [];

    const barerTokenAzure = await this.getBarerTokenAzure();
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
      let tokenPowerBi;
      try {
        tokenPowerBi = await lastValueFrom(
          await this._httpService
            .post(`${this.credentialsBi.api_token_url}`,bodyRequestPowerBi ,{headers:{Authorization: `Bearer ${barerTokenAzure.access_token}`}})
            .pipe(map((resp) => resp.data)),
        );
      } catch (error) {
        return error;
      }
      
        
      const reportTokenBiDto = new TokenReportBiDto;
      reportTokenBiDto.token_bi = tokenPowerBi.token;
      reportTokenBiDto.expiration_toke_id = tokenPowerBi.expiration;
      reportTokenBiDto.is_active = true;
      await this.tokenBireports.save(reportTokenBiDto);

      let informationEmbedBi: EmbedCredentialsDTO = new EmbedCredentialsDTO;
      informationEmbedBi.embed_token = tokenPowerBi.token;
      let auxReportsInfo: ReportInformation[] = []
      reportsBi.map((resp)=>{
        let reportsInfo: ReportInformation = new ReportInformation;
        reportsInfo.id = resp.id;
        reportsInfo.resport_id = resp.report_id;
        reportsInfo.name = resp.report_name;
        reportsInfo.description = resp.report_description;
        reportsInfo.title = resp.report_title;
        reportsInfo.embed_url = this.credentialsBi.embed_url_base+resp.report_id+'&groupId='+resp.group_id+'&config='+this.credentialsBi.config_id;
        auxReportsInfo.push(reportsInfo)
      })
      informationEmbedBi.reportsInformation = auxReportsInfo;
      
     return informationEmbedBi;
    }

    return {
      Error: 'At this time there are no reports or none are active for viewing.'
    }
  }

  async getReportsBi(){
    const getResportBi: BiReport[] = await this.find({where:{
      is_active: true
    }});

    return getResportBi;
  }

  async getTokenAndReportById(id: number){
    this.credentialsBi = await this._servicesClarisaCredentials.getCredentialsBi();
    const tokensReports: TokenBiReport[] = await this.tokenBireports.query(`select * from token_report_bi trb order by id desc limit 1;`)
    const today = new Date();
    const reportsExist = await this.findOneBy({id, is_active:true})
    if(reportsExist != null){
      if(tokensReports.length <= 0 || Date.parse(tokensReports[0].expiration_toke_id.toString()) < Date.parse(today.toString())){
        const registerInToken = await this.getTokenPowerBi();
        const responseToken = await registerInToken['reportsInformation'].filter(report => report.id == id);
        return {
          token:registerInToken['embed_token'],
          report: responseToken[0]
        };
      }else{
        let reportsInfo: ReportInformation = new ReportInformation;
        reportsInfo.id = reportsExist.id;
        reportsInfo.resport_id = reportsExist.report_id;
        reportsInfo.name = reportsExist.report_name;
        reportsInfo.description = reportsExist.report_description;
        reportsInfo.embed_url = this.credentialsBi.embed_url_base+reportsExist.report_id+'&groupId='+reportsExist.group_id+'&config='+this.credentialsBi.config_id;

        return {
          token: tokensReports[0].token_bi,
          report:reportsInfo
        }
      }
    }else{
      return {
        error:'This Report not exists'
      }
    }
  }

  async getTokenAndReportByName(report_name: string){
    this.credentialsBi = await this._servicesClarisaCredentials.getCredentialsBi();
    const tokensReports: TokenBiReport[] = await this.tokenBireports.query(`select * from token_report_bi trb order by id desc limit 1;`)
    const today = new Date();
    let reportsExist = await this.getReportByName(report_name);
    
    if(reportsExist != null && reportsExist.length != 0){
      if(tokensReports.length <= 0 || Date.parse(tokensReports[0].expiration_toke_id.toString()) < Date.parse(today.toString())){
        
        const registerInToken= await this.getTokenPowerBi();
        const responseToken = await registerInToken['reportsInformation'].filter(report => report.name == report_name);
        return {
          token:registerInToken['embed_token'],
          report: responseToken[0]
        };
      }else{
        let reportsInfo: ReportInformation = new ReportInformation;
        reportsInfo.id = reportsExist[0].id;
        reportsInfo.resport_id = reportsExist[0].report_id;
        reportsInfo.name = reportsExist[0].report_name;
        reportsInfo.description = reportsExist[0].report_description;
        reportsInfo.embed_url = this.credentialsBi.embed_url_base+reportsExist[0].report_id+'&groupId='+reportsExist[0].group_id+'&config='+this.credentialsBi.config_id;

        return {
          token: tokensReports[0].token_bi,
          report:reportsInfo
        }
      }
    }else{
      throw new NotFoundException('This report no exist');
    }
  }

  async createNewRegisterBi(createBiReport: CreateBiReportDto){
    let returnReportBi = this.save(createBiReport);
    return returnReportBi;
  }

  async getReportByName(report_name: string){
    return await this.query(`select * from bi_reports br WHERE br.report_name = ? and is_active = 1`, [report_name])
  }
}

