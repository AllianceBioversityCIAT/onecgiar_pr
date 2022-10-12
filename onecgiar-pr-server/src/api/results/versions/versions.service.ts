import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { VersionRepository } from './version.repository';
import { MessageResponse } from '../../../shared/constants/Responses.constant';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { retunrFormatVersion } from './dto/return-format-version.dto';

@Injectable()
export class VersionsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _versionRepository: VersionRepository,
  ) {}

  create(createVersionDto: CreateVersionDto) {
    return 'This action adds a new version';
  }

  findAll() {
    return `This action returns all versions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} version`;
  }

  async findBaseVersion(): Promise<retunrFormatVersion | returnErrorDto> {
    try {
      const version = await this._versionRepository.getBaseVersion();
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
    return `This action updates a #${id} version`;
  }

  remove(id: number) {
    return `This action removes a #${id} version`;
  }
}
