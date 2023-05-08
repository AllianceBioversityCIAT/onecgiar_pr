import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsIpActorDto } from './create-results-ip-actor.dto';

export class UpdateResultsIpActorDto extends PartialType(CreateResultsIpActorDto) {}
