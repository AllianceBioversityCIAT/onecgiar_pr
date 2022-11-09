import { Injectable } from '@nestjs/common';
import { MQAPResultDto } from '../../m-qap/dtos/m-qap.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProduct } from './entities/results-knowledge-product.entity';

@Injectable()
export class ResultsKnowledgeProductMapper {
  dtoToEntity(dto: MQAPResultDto): ResultsKnowledgeProduct {
    const knowledgeProduct: ResultsKnowledgeProduct =
      new ResultsKnowledgeProduct();

    knowledgeProduct.accesibility = dto['Open Access'];
    knowledgeProduct.accesible = dto?.FAIR?.score?.A;
    knowledgeProduct.comodity = null; //TODO TBD
    knowledgeProduct.doi = dto.DOI;
    knowledgeProduct.findable = dto?.FAIR?.score?.F;
    knowledgeProduct.handle = dto?.handle;
    knowledgeProduct.interoperable = dto?.FAIR?.score?.I;
    knowledgeProduct.is_isi = dto?.ISI === 'ISI Journal';
    knowledgeProduct.is_melia = false; //TODO TBD
    knowledgeProduct.is_peer_reviewed =
      dto?.['Peer-reviewed'] === 'Peer Review';

    const publicationYear: string = dto?.['Publication Date'] ?? '';
    knowledgeProduct.issue_date = Number(
      publicationYear.slice(0, publicationYear.indexOf('-')),
    );
    knowledgeProduct.issue_date =
      knowledgeProduct.issue_date === 0
        ? undefined
        : knowledgeProduct.issue_date;

    knowledgeProduct.knowledge_product_type = dto?.Type;
    knowledgeProduct.licence = dto?.Rights;
    knowledgeProduct.melia_previous_submitted = false; //TODO TBD
    knowledgeProduct.melia_type_id = null; //TODO TBD
    knowledgeProduct.reusable = dto?.FAIR?.score?.R;
    knowledgeProduct.sponsors = null; //TODO TBD

    return knowledgeProduct;
  }

  entityToDto(entity: ResultsKnowledgeProduct): ResultsKnowledgeProductDto {
    const knowledgeProductDto: ResultsKnowledgeProductDto =
      new ResultsKnowledgeProductDto();

    return knowledgeProductDto;
  }
}
