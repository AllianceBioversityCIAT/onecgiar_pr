import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';
import { CreateShareResultInnovationPackageRequestDto } from './dto/create-share-result-innovation-package-request.dto';
import { UpdateShareResultInnovationPackageRequestDto } from './dto/update-share-result-innovation-package-request.dto';

@Controller('share-result-innovation-package-request')
export class ShareResultInnovationPackageRequestController {
  constructor(
    private readonly shareResultInnovationPackageRequestService: ShareResultInnovationPackageRequestService,
  ) {}

  @Post()
  create(
    @Body()
    createShareResultInnovationPackageRequestDto: CreateShareResultInnovationPackageRequestDto,
  ) {
    return this.shareResultInnovationPackageRequestService.create(
      createShareResultInnovationPackageRequestDto,
    );
  }

  @Get()
  findAll() {
    return this.shareResultInnovationPackageRequestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shareResultInnovationPackageRequestService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateShareResultInnovationPackageRequestDto: UpdateShareResultInnovationPackageRequestDto,
  ) {
    return this.shareResultInnovationPackageRequestService.update(
      +id,
      updateShareResultInnovationPackageRequestDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shareResultInnovationPackageRequestService.remove(+id);
  }
}
