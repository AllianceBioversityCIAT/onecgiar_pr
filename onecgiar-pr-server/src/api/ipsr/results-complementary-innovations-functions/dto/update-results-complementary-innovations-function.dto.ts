import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsComplementaryInnovationsFunctionDto } from './create-results-complementary-innovations-function.dto';

export class UpdateResultsComplementaryInnovationsFunctionDto extends PartialType(CreateResultsComplementaryInnovationsFunctionDto) {}
