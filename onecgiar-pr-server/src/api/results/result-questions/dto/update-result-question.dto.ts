import { PartialType } from '@nestjs/mapped-types';
import { CreateResultQuestionDto } from './create-result-question.dto';

export class UpdateResultQuestionDto extends PartialType(CreateResultQuestionDto) {}
