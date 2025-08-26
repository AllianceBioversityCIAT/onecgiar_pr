import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { InitiativeEntityMapService } from './initiative_entity_map.service';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { InitiativeEntityMap } from './entities/initiative_entity_map.entity';

@ApiTags('Initiative Entity Map')
@Controller()
export class InitiativeEntityMapController {
  constructor(private readonly service: InitiativeEntityMapService) {}

  @Post('link')
  @ApiOperation({ summary: 'Link an initiative to one or more entities' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        initiativeId: { type: 'integer', example: 1 },
        entityIds: {
          type: 'array',
          items: { type: 'integer', example: 30 },
          example: [30, 32, 45],
        },
      },
      required: ['initiativeId', 'entityIds'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mappings saved successfully',
    type: Array,
  })
  async linkInitiativeToEntities(
    @Body() body: { initiativeId: number; entityIds: number[] },
    @UserToken() user: TokenDto,
  ) {
    return this.service.linkInitiativeToEntities(
      body.initiativeId,
      body.entityIds,
      user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all initiative-entity mappings' })
  @ApiResponse({
    status: 200,
    description:
      'Returns all mappings between initiatives and entities, including related objects.',
    type: [InitiativeEntityMap],
  })
  async getAllMappings() {
    return this.service.getAllMappings();
  }
}
