import { PartialType } from '@nestjs/mapped-types';
import { CreateResultActorDto } from './create-result-actor.dto';

export class UpdateResultActorDto extends PartialType(CreateResultActorDto) {}
