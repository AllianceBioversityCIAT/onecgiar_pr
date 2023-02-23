import { PartialType } from '@nestjs/mapped-types';
import { CreatePrimaryImpactAreaDto } from './create-primary-impact-area.dto';

export class UpdatePrimaryImpactAreaDto extends PartialType(CreatePrimaryImpactAreaDto) {
    id:number;
}
