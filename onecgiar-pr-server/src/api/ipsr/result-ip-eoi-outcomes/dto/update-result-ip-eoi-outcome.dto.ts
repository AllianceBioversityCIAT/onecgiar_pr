import { PartialType } from '@nestjs/mapped-types';
import { CreateResultIpEoiOutcomeDto } from './create-result-ip-eoi-outcome.dto';

export class UpdateResultIpEoiOutcomeDto extends PartialType(CreateResultIpEoiOutcomeDto) {}
