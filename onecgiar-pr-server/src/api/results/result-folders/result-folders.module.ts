import { Module } from '@nestjs/common';
import { ResultFoldersService } from './result-folders.service';
import { ResultFoldersController } from './result-folders.controller';
import { ResultFolderRepository } from './repositories/result-folder-type.repository copy';
import { ResultFolderTypeRepository } from './repositories/result-folder-type.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';

@Module({
  controllers: [ResultFoldersController],
  providers: [
    ResultFoldersService,
    ResultFolderRepository,
    ResultFolderTypeRepository,
    HandlersError,
    RoleByUserRepository,
    ReturnResponse,
  ],
  exports: [
    ResultFoldersService,
    ResultFolderRepository,
    ResultFolderTypeRepository,
  ],
})
export class ResultFoldersModule {}
