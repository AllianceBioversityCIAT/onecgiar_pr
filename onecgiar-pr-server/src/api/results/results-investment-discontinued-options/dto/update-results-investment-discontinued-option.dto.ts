import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsInvestmentDiscontinuedOptionDto } from './create-results-investment-discontinued-option.dto';

export class UpdateResultsInvestmentDiscontinuedOptionDto extends PartialType(CreateResultsInvestmentDiscontinuedOptionDto) {}
