import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeProductFairBaselineDto } from './create-knowledge_product_fair_baseline.dto';

export class UpdateKnowledgeProductFairBaselineDto extends PartialType(CreateKnowledgeProductFairBaselineDto) {}
