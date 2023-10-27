import {
  Controller,
  Body,
  Patch,
  Headers,
  HttpException,
} from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
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
    const { message, response, status } = await this.primaryImpactArea.create(
      primaryImpactArea,
      token,
    );
    throw new HttpException({ message, response }, status);
  }
}
