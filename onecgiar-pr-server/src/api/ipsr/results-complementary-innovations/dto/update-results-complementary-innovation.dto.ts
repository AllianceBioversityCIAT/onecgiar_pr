import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsComplementaryInnovationDto } from './create-results-complementary-innovation.dto';

export class UpdateResultsComplementaryInnovationDto extends PartialType(CreateResultsComplementaryInnovationDto) {}
