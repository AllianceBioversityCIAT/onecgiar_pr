import { PartialType } from '@nestjs/mapped-types';
import { CreateCapdevsDeliveryMethodDto } from './create-capdevs-delivery-method.dto';

export class UpdateCapdevsDeliveryMethodDto extends PartialType(CreateCapdevsDeliveryMethodDto) {}
