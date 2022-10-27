import { Injectable } from '@nestjs/common';
import { CreateClarisaConnectionDto } from './dto/create-clarisa-connection.dto';
import { UpdateClarisaConnectionDto } from './dto/update-clarisa-connection.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { HttpService } from '@nestjs/axios';
import { env } from 'process';

@Injectable()
export class ClarisaConnectionsService {
  private readonly clarisaHost: string =
    env.CLA_URL ?? env.L_CLA_URL;
  constructor(
    private readonly _httpService: HttpService
  ){}

  async create(createClarisaConnectionDto: CreateClarisaConnectionDto, user: TokenDto) {
    const datas = {};
    const data = await this._httpService.post(`${this.clarisaHost}/partner-requests/institution`,datas, {auth: {username:env.L_CLA_USER, password: env.L_CLA_PASSWORD }});
    return 'This action adds a new clarisaConnection';
  }

  findAll() {
    return `This action returns all clarisaConnections`;
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
