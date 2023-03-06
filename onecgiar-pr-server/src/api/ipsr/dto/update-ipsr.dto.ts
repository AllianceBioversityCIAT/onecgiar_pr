import { PartialType } from '@nestjs/mapped-types';
import { CreateIpsrDto } from './create-ipsr.dto';

export class UpdateIpsrDto extends PartialType(CreateIpsrDto) {}
