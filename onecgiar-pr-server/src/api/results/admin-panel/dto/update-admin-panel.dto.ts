import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminPanelDto } from './create-admin-panel.dto';

export class UpdateAdminPanelDto extends PartialType(CreateAdminPanelDto) {}
