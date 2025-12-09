import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { RootResultsDto } from './dto/create-bilateral.dto';

@Controller()
@ApiTags('Bilaterals')
@UseInterceptors(ResponseInterceptor)
export class BilateralController {
  constructor(private readonly bilateralService: BilateralService) {}

  @Post('create')
  @ApiBody({ type: RootResultsDto })
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RootResultsDto,
  ) {
    return this.bilateralService.create(body);
  }

  @Patch('update/:id')
  @ApiOperation({
    summary: 'Update bilateral result',
    description:
      'Updates an existing bilateral-created result. Body is identical to the create payload.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  @ApiBody({ type: RootResultsDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    )
    body: RootResultsDto,
  ) {
    return this.bilateralService.update(id, body);
  }

  @Patch('delete/:id')
  @ApiOperation({
    summary: 'Soft delete bilateral result',
    description: 'Marks a bilateral-created result as inactive.',
  })
  @ApiParam({ name: 'id', type: Number, required: true })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.bilateralService.delete(id);
  }
}
