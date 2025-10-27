import { PartialType } from '@nestjs/mapped-types';
import { CreateResultScalingStudyUrlDto } from './create-result_scaling_study_url.dto';

export class UpdateResultScalingStudyUrlDto extends PartialType(CreateResultScalingStudyUrlDto) {}
