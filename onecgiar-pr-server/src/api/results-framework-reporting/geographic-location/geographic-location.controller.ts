import { Controller, Get, Post, Body, Patch, Param, Delete, Version } from '@nestjs/common';
import { GeographicLocationService } from './geographic-location.service';
import { CreateGeographicLocationDto } from './dto/create-geographic-location.dto';
import { UpdateGeographicLocationDto } from './dto/update-geographic-location.dto';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';
import { ApiParam } from '@nestjs/swagger/dist/decorators/api-param.decorator';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { CreateResultGeoDto } from '../../results/dto/create-result-geo-scope.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller('geographic-location')
export class GeographicLocationController {
  constructor(private readonly geographicLocationService: GeographicLocationService) {}

  @Version('2')
  @Patch('update/geographic/:resultId')
  @ApiOperation({
    summary: 'Save geographic scope',
    description:
      'Creates or updates the geographic scope configuration for the selected result.',
  })
  @ApiParam({ name: 'resultId', type: Number, required: true })
  @ApiBody({ type: CreateGeographicLocationDto })
  @ApiOkResponse({ description: 'Geographic scope saved.' })
  saveGeographic(
    @Body() createResultGeoDto: CreateGeographicLocationDto,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    createResultGeoDto.result_id = resultId;
    return this.geographicLocationService.saveGeoScopeV2(createResultGeoDto, user);
  }

  @Version('2')
  @Get('get/geographic/:resultId')
  @ApiOperation({
    summary: 'Get geographic scope',
    description:
      'Retrieves the geographic scope configuration for the provided result.',
  })
  @ApiParam({ name: 'resultId', type: Number, required: true })
  @ApiOkResponse({ description: 'Geographic scope retrieved.' })
  getGeographic(@Param('resultId') resultId: number) {
    return this.geographicLocationService.getGeoScope(resultId);
  }

}
