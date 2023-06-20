import { Injectable } from '@nestjs/common';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { Version } from './entities/version.entity';
import { VersionRepository } from './versioning.repository';

@Injectable()
export class VersioningService {
  constructor(private readonly _versionRepository: VersionRepository) {}

  async $_findActiveVersion(): Promise<Version> {
    try {
      const version = await this._versionRepository.findOne({
        where: {
          status: true,
          is_active: true,
        },
      });

      return version;
    } catch (error) {
      return null;
    }
  }

  create(createVersioningDto: CreateVersioningDto) {
    return 'This action adds a new versioning';
  }

  findAll() {
    return `This action returns all versioning`;
  }

  findOne(id: number) {
    return `This action returns a #${id} versioning`;
  }

  update(id: number, updateVersioningDto: UpdateVersioningDto) {
    return `This action updates a #${id} versioning`;
  }

  remove(id: number) {
    return `This action removes a #${id} versioning`;
  }
}
