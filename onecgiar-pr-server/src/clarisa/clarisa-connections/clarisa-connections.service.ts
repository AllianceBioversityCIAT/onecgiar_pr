import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaConnectionDto } from './dto/create-clarisa-connection.dto';
import { UpdateClarisaConnectionDto } from './dto/update-clarisa-connection.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { HttpService } from '@nestjs/axios';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaTaskService } from '../clarisatask.service';

@Injectable()
export class ClarisaConnectionsService {
  private readonly clarisaHost: string =
    env.CLA_URL ?? env.L_CLA_URL;
  constructor(
    private readonly _httpService: HttpService,
    private readonly _handlersError: HandlersError,
    private readonly _clarisaTaskService: ClarisaTaskService
  ) { }

  async create(createClarisaConnectionDto: CreateClarisaConnectionDto, user: TokenDto) {
    createClarisaConnectionDto.name = `${user.first_name} ${user.last_name}`;
    createClarisaConnectionDto.externalUserMail = user.email;
    createClarisaConnectionDto.misAcronym = 'PRMS';
    
    try {
      const token = await this.getClarisaToken();
      const data = await lastValueFrom(this._httpService.post(`${this.clarisaHost}api/partner-requests/institution`,createClarisaConnectionDto, {headers:{Authorization: `Bearer ${token}`}}).pipe(
        map(resp => resp.data)
      ));
      console.log(data)
      return {
        response: data,
        message: 'Successful Partner Request',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }

  }

  async getClarisaToken() {
    const config = {
      email: env.CLA_USER,
      password: env.CLA_PASSWORD
    }
    try {
      const data = await lastValueFrom(this._httpService.post(`${this.clarisaHost}auth/login`, config).pipe(
        map(resp => resp.data)
      ));
      return {
        response: data.access_token,
        message: 'Validates correctly with CLARISA',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }

  }

  async executeTask() {
    await this._clarisaTaskService.clarisaBootstrap();
    return true;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaConnection`;
  }

  update(id: number, updateClarisaConnectionDto: UpdateClarisaConnectionDto) {
    return `This action updates a #${id} clarisaConnection`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaConnection`;
  }
}
