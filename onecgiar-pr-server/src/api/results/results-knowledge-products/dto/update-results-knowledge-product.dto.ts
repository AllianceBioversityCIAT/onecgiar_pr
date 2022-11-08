import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsKnowledgeProductDto } from './create-results-knowledge-product.dto';

export class UpdateResultsKnowledgeProductDto extends PartialType(CreateResultsKnowledgeProductDto) {}
