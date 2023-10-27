import { PartialType } from '@nestjs/mapped-types';
import { CreateInvestmentDiscontinuedOptionDto } from './create-investment-discontinued-option.dto';

export class UpdateInvestmentDiscontinuedOptionDto extends PartialType(
  CreateInvestmentDiscontinuedOptionDto,
) {}
