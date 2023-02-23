import { Controller, Get, Post, Body, Patch, Param, Headers, HttpException } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { CreatePrimaryImpactAreaDto } from './dto/create-primary-impact-area.dto';
import { UpdatePrimaryImpactAreaDto } from './dto/update-primary-impact-area.dto';
import { HeadersDto } from 'src/shared/globalInterfaces/headers.dto';
import { TokenDto } from 'src/shared/globalInterfaces/token.dto';

@Controller('primary-impact-area')
export class PrimaryImpactAreaController {
  
  constructor(private readonly primaryImpactArea: PrimaryImpactAreaService) {}

  @Patch('create')
  async mapResultLegacy(
    @Body() primaryImpactArea: any[],
    @Headers() auth: HeadersDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.primaryImpactArea.create(primaryImpactArea, token);
    throw new HttpException({ message, response }, status);
  }

  
}
