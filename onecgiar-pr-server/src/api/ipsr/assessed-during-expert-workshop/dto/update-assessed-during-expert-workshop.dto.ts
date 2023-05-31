import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessedDuringExpertWorkshopDto } from './create-assessed-during-expert-workshop.dto';

export class UpdateAssessedDuringExpertWorkshopDto extends PartialType(CreateAssessedDuringExpertWorkshopDto) {}
