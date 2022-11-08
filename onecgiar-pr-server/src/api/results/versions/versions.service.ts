import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { VersionRepository } from './version.repository';
import { MessageResponse } from '../../../shared/constants/Responses.constant';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { returnFormatVersion } from './dto/return-format-version.dto';

@Injectable()
export class VersionsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _versionRepository: VersionRepository,
  ) {}

  create(createVersionDto: CreateVersionDto) {
    return createVersionDto;
  }

  findAll() {
    return `This action returns all versions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} version`;
  }

  async findBaseVersion(): Promise<returnFormatVersion | returnErrorDto> {
    try {
      const version = await this._versionRepository.getBaseVersion();
      if (!version) {
        throw {
          response: {},
          message: 'Base Version not found!',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: version,
        message: MessageResponse.OK,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  update(id: number, updateVersionDto: UpdateVersionDto) {
    return `This action updates a #${id} version ${updateVersionDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} version`;
  }
}
