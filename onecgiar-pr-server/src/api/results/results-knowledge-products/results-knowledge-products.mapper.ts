import { Injectable } from '@nestjs/common';
import { MQAPResultDto } from '../../m-qap/dtos/m-qap.dto';
import { MQAPAuthor } from './dto/mqap-author.dto';
import { ResultsKnowledgeProductAltmetricDto } from './dto/results-knowledge-product-altmetric.dto';
import { ResultsKnowledgeProductAuthorDto } from './dto/results-knowledge-product-author.dto';
import { ResultsKnowledgeProductInstitutionDto } from './dto/results-knowledge-product-institution.dto';
import { ResultsKnowledgeProductMetadataDto } from './dto/results-knowledge-product-metadata.dto';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { ResultsKnowledgeProductAltmetric } from './entities/results-knowledge-product-altmetrics.entity';
import { ResultsKnowledgeProductAuthor } from './entities/results-knowledge-product-authors.entity';
import { ResultsKnowledgeProductInstitution } from './entities/results-knowledge-product-institution.entity';
import { ResultsKnowledgeProductKeyword } from './entities/results-knowledge-product-keywords.entity';
import { ResultsKnowledgeProductMetadata } from './entities/results-knowledge-product-metadata.entity';
import { ResultsKnowledgeProduct } from './entities/results-knowledge-product.entity';

@Injectable()
export class ResultsKnowledgeProductMapper {
  mqapResponseToKnowledgeProductDto(
    mqapResponseDto: MQAPResultDto,
  ): ResultsKnowledgeProductDto {
    let knowledgeProductDto = new ResultsKnowledgeProductDto();

    knowledgeProductDto.accessible = mqapResponseDto?.FAIR?.score?.A;
    knowledgeProductDto.commodity = null; //TODO TBD
    knowledgeProductDto.description = mqapResponseDto?.Description;
    knowledgeProductDto.findable = mqapResponseDto?.FAIR?.score?.F;
    knowledgeProductDto.handle = mqapResponseDto?.handle;
    knowledgeProductDto.interoperable = mqapResponseDto?.FAIR?.score?.I;
    knowledgeProductDto.is_melia = null; //null, as this field is mapped by the user
    knowledgeProductDto.licence = mqapResponseDto?.Rights;
    knowledgeProductDto.melia_previous_submitted = null; //null, as this info is mapped by the user
    knowledgeProductDto.melia_type_id = null; //null, as this info is mapped by the user
    knowledgeProductDto.name = mqapResponseDto?.Title;
    knowledgeProductDto.reusable = mqapResponseDto?.FAIR?.score?.R;
    knowledgeProductDto.sponsor = null; //TODO TBD
    knowledgeProductDto.type = mqapResponseDto?.Type;

    knowledgeProductDto = this.fillRelatedMetadata(
      mqapResponseDto,
      knowledgeProductDto,
    );

    return knowledgeProductDto;
  }

  fillRelatedMetadata(
    dto: MQAPResultDto,
    knowledgeProductDto: ResultsKnowledgeProductDto,
  ): ResultsKnowledgeProductDto {
    const authors: ResultsKnowledgeProductAuthorDto[] =
      this.getAuthorsFromMQAPResponse(dto);
    knowledgeProductDto.authors = (authors ?? []).map((a) => {
      const author: ResultsKnowledgeProductAuthorDto =
        new ResultsKnowledgeProductAuthorDto();

      author.name = a.name;
      author.orcid = a.name;

      return author;
    });

    const keywords = dto?.agrovoc_keywords?.results;
    knowledgeProductDto.keywords = (keywords ?? [])
      .filter((k) => !k.is_agrovoc)
      .map((k) => k.keyword);

    knowledgeProductDto.agrovoc_keywords = (keywords ?? [])
      .filter((k) => k.is_agrovoc)
      .map((k) => k.keyword);

    // init metadata parsing
    const metadataHolder: ResultsKnowledgeProductMetadataDto[] = [];

    const metadataCGSpace: ResultsKnowledgeProductMetadataDto =
      new ResultsKnowledgeProductMetadataDto();

    metadataCGSpace.source = 'CGSpace';
    metadataCGSpace.accessibility = dto?.['Open Access'];
    metadataCGSpace.doi = dto?.DOI;
    metadataCGSpace.is_isi = dto?.ISI === 'ISI Journal';
    metadataCGSpace.is_peer_reviewed = dto?.['Peer-reviewed'] === 'Peer Review';
    metadataCGSpace.issue_year = this.getPublicationYearFromMQAPResponse(dto);

    metadataHolder.push(metadataCGSpace);

    const mqapDOIData = dto?.DOI_Info;
    if (mqapDOIData) {
      const metadataWoS: ResultsKnowledgeProductMetadataDto =
        new ResultsKnowledgeProductMetadataDto();

      metadataWoS.source = mqapDOIData.source;
      metadataWoS.accessibility = mqapDOIData.is_oa;
      metadataWoS.doi = mqapDOIData.doi;
      metadataWoS.is_isi = mqapDOIData.is_isi
        ?.toLocaleLowerCase()
        ?.includes('yes');
      metadataWoS.is_peer_reviewed = null; //TODO implement the convoluted logic regarding this field
      metadataWoS.issue_year = mqapDOIData.publication_year;

      metadataHolder.push(metadataWoS);
    }

    knowledgeProductDto.metadata = metadataHolder;
    //finished metadata parsing

    const altmetric = this.getAltmetricInfoFromMQAPResponse(dto);
    knowledgeProductDto.altmetric_full_data = altmetric;
    if (altmetric) {
      knowledgeProductDto.altmetric_detail_url = `https://www.altmetric.com/details/${altmetric.altmetric_id}`;
      knowledgeProductDto.altmetric_image_url =
        altmetric.image_large ??
        altmetric.image_medium ??
        altmetric.image_small;
    }

    const institutions = dto?.Affiliation;
    knowledgeProductDto.institutions = (institutions ?? []).map((i) => {
      const institution: ResultsKnowledgeProductInstitutionDto =
        new ResultsKnowledgeProductInstitutionDto();

      institution.source_name = i.name;
      institution.confidence_percentage = i.prediction?.confidant;
      institution.possible_matched_institution_id = i.prediction?.value?.code;

      return institution;
    });

    //TODO map country and region information

    return knowledgeProductDto;
  }

  private getAltmetricInfoFromMQAPResponse(
    dto: MQAPResultDto,
  ): ResultsKnowledgeProductAltmetricDto {
    const altmetricDto = dto?.handle_altmetric;
    if (!altmetricDto) {
      return undefined;
    }

    const altmetric: ResultsKnowledgeProductAltmetricDto =
      new ResultsKnowledgeProductAltmetricDto();

    altmetric.altmetric_id = altmetricDto?.altmetric_id;

    altmetric.cited_by_blogs = altmetricDto?.cited_by_feeds_count;
    altmetric.cited_by_delicious = altmetricDto?.cited_by_delicious_count;
    altmetric.cited_by_facebook_pages = altmetricDto?.cited_by_fbwalls_count;
    altmetric.cited_by_forum_users = altmetricDto?.cited_by_forum_count;
    altmetric.cited_by_google_plus_users = altmetricDto?.cited_by_gplus_count;
    altmetric.cited_by_linkedin_users = altmetricDto?.cited_by_linkedin_count;
    altmetric.cited_by_news_outlets = altmetricDto?.cited_by_msm_count;
    altmetric.cited_by_peer_review_sites =
      altmetricDto?.cited_by_peer_review_sites_count;
    altmetric.cited_by_pinterest_users = altmetricDto?.cited_by_pinners_count;
    altmetric.cited_by_policies = altmetricDto?.cited_by_policies_count;
    altmetric.cited_by_posts = altmetricDto?.cited_by_posts_count;
    altmetric.cited_by_reddit_users = altmetricDto?.cited_by_rdts_count;
    altmetric.cited_by_research_highlight_platforms =
      altmetricDto?.cited_by_rh_count;
    altmetric.cited_by_stack_exchange_resources =
      altmetricDto?.cited_by_qs_count;
    altmetric.cited_by_twitter_users = altmetricDto?.cited_by_tweeters_count;
    altmetric.cited_by_weibo_users = altmetricDto?.cited_by_weibo_count;
    altmetric.cited_by_wikipedia_pages = altmetricDto?.cited_by_wikipedia_count;
    altmetric.cited_by_youtube_channels = altmetricDto?.cited_by_videos_count;

    altmetric.image_large = altmetricDto?.images?.large;
    altmetric.image_medium = altmetricDto?.images?.medium;
    altmetric.image_small = altmetricDto?.images?.small;

    altmetric.journal = altmetricDto?.journal;
    altmetric.score = altmetricDto?.score;

    return altmetric;
  }

  private getPublicationYearFromMQAPResponse(dto: MQAPResultDto): number {
    const publicationDate = dto?.['Publication Date'] ?? '';
    const isComposed: boolean = publicationDate.indexOf('-') > 0;
    let year: number = 0;

    if (isComposed) {
      year = Number(publicationDate.slice(0, publicationDate.indexOf('-')));
    } else {
      year = Number(publicationDate);
    }

    return Number.isNaN(year) ? undefined : year;
  }

  getAuthorsFromMQAPResponse(dto: MQAPResultDto): MQAPAuthor[] {
    const authorDto = dto?.Authors;
    if (authorDto) {
      return undefined;
    }

    const authorDtos: MQAPAuthor[] = [];
    //TODO implement the logic :s
    return authorDtos;
  }

  entityToDto(entity: ResultsKnowledgeProduct): ResultsKnowledgeProductDto {
    const knowledgeProductDto: ResultsKnowledgeProductDto =
      new ResultsKnowledgeProductDto();

    knowledgeProductDto.id = entity.result_knowledge_product_id;

    knowledgeProductDto.accessible = entity.accesible;
    knowledgeProductDto.commodity = null; //TODO TBD
    knowledgeProductDto.description = entity.description;
    knowledgeProductDto.findable = entity.findable;
    knowledgeProductDto.handle = entity.handle;
    knowledgeProductDto.interoperable = entity.interoperable;
    knowledgeProductDto.licence = entity.licence;
    knowledgeProductDto.name = entity.name;
    knowledgeProductDto.references_other_knowledge_products = null; //TODO TBD
    knowledgeProductDto.reusable = entity.reusable;
    knowledgeProductDto.sponsor = null; //TODO TBD
    knowledgeProductDto.type = entity.knowledge_product_type;

    const authors = entity.result_knowledge_product_author_array;
    knowledgeProductDto.authors = (authors ?? []).map((a) => {
      const authorDto: ResultsKnowledgeProductAuthorDto =
        new ResultsKnowledgeProductAuthorDto();

      authorDto.name = a.author_name;
      authorDto.orcid = a.orcid;

      return authorDto;
    });

    const keywords = entity.result_knowledge_product_keyword_array;
    knowledgeProductDto.agrovoc_keywords = (keywords ?? [])
      .filter((k) => k.is_agrovoc)
      .map((k) => k.keyword);
    knowledgeProductDto.keywords = (keywords ?? [])
      .filter((k) => !k.is_agrovoc)
      .map((k) => k.keyword);

    const metadata = entity.result_knowledge_product_metadata_array;
    knowledgeProductDto.metadata = (metadata ?? []).map((m) => {
      const metadataDto: ResultsKnowledgeProductMetadataDto =
        new ResultsKnowledgeProductMetadataDto();

      metadataDto.source = m.source;

      metadataDto.accessibility = m.accesibility;
      metadataDto.doi = m.doi;
      metadataDto.is_isi = m.is_isi;
      metadataDto.is_peer_reviewed = m.is_peer_reviewed;
      metadataDto.issue_year = m.year;

      return metadataDto;
    });

    const altmetric =
      entity.result_knowledge_product_altmetric_array[0] ?? undefined;
    knowledgeProductDto.altmetric_detail_url = altmetric?.detail_url;
    knowledgeProductDto.altmetric_image_url =
      altmetric?.image_large ??
      altmetric?.image_medium ??
      altmetric?.image_small;

    const institutions = entity.result_knowledge_product_institution_array;
    knowledgeProductDto.institutions = (institutions ?? []).map((i) => {
      const institutionDto: ResultsKnowledgeProductInstitutionDto =
        new ResultsKnowledgeProductInstitutionDto();

      institutionDto.confidence_percentage = i.confidant;
      institutionDto.possible_matched_institution_id =
        i.predicted_institution_id;
      institutionDto.source_name = i.intitution_name;
      institutionDto.user_matched_institution_id =
        i.results_by_institutions_object?.institutions_id;

      return institutionDto;
    });

    knowledgeProductDto.countries = null; //TODO TBD
    knowledgeProductDto.regions = null; //TODO TBD

    return knowledgeProductDto;
  }

  dtoToEntity(
    dto: ResultsKnowledgeProductDto,
    userId: number,
    resultId: number,
    versionId: number,
  ): ResultsKnowledgeProduct {
    let knowledgeProduct: ResultsKnowledgeProduct =
      new ResultsKnowledgeProduct();

    knowledgeProduct.accesible = dto.accessible;
    knowledgeProduct.comodity = dto.commodity;
    knowledgeProduct.description = dto.description;
    knowledgeProduct.findable = dto.findable;
    knowledgeProduct.handle = dto.handle;
    knowledgeProduct.interoperable = dto.interoperable;
    knowledgeProduct.is_melia = null;
    knowledgeProduct.knowledge_product_type = dto.type;
    knowledgeProduct.licence = dto.licence;
    knowledgeProduct.melia_previous_submitted = null;
    knowledgeProduct.melia_type_id = null;
    knowledgeProduct.name = dto.name;
    knowledgeProduct.reusable = dto.reusable;
    knowledgeProduct.sponsors = dto.sponsor;

    knowledgeProduct.created_by = userId;
    knowledgeProduct.results_id = resultId;
    knowledgeProduct.version_id = versionId;

    return knowledgeProduct;
  }

  fillOutRelations(
    dto: ResultsKnowledgeProductDto,
    knowledgeProduct: ResultsKnowledgeProduct,
  ): ResultsKnowledgeProduct {
    knowledgeProduct.result_knowledge_product_author_array = (
      dto.authors ?? []
    ).map((a) => {
      const author: ResultsKnowledgeProductAuthor =
        new ResultsKnowledgeProductAuthor();

      author.author_name = a.name;
      author.orcid = a.name;

      author.created_by = knowledgeProduct.created_by;
      author.version_id = knowledgeProduct.version_id;
      author.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return author;
    });

    const keywords: { keyword: string; agrovoc: boolean }[] = [
      ...(dto.agrovoc_keywords ?? []).map((ag) => {
        return { keyword: ag, agrovoc: true };
      }),
      ...(dto.keywords ?? []).map((ag) => {
        return { keyword: ag, agrovoc: false };
      }),
    ];

    knowledgeProduct.result_knowledge_product_keyword_array = keywords.map(
      (k) => {
        const keyword: ResultsKnowledgeProductKeyword =
          new ResultsKnowledgeProductKeyword();

        keyword.keyword = k.keyword;
        keyword.is_agrovoc = k.agrovoc;

        keyword.created_by = knowledgeProduct.created_by;
        keyword.version_id = knowledgeProduct.version_id;
        keyword.result_knowledge_product_id =
          knowledgeProduct.result_knowledge_product_id;

        return keyword;
      },
    );

    knowledgeProduct.result_knowledge_product_metadata_array = (
      dto.metadata ?? []
    ).map((m) => {
      const metadata: ResultsKnowledgeProductMetadata =
        new ResultsKnowledgeProductMetadata();

      metadata.source = m.source;
      metadata.accesibility = m.accessibility;
      metadata.doi = m.doi;
      metadata.is_isi = m.is_isi;
      metadata.is_peer_reviewed = m.is_peer_reviewed;
      metadata.year = m.issue_year;

      metadata.created_by = knowledgeProduct.created_by;
      metadata.version_id = knowledgeProduct.version_id;
      metadata.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return metadata;
    });

    let altmetric: ResultsKnowledgeProductAltmetric =
      new ResultsKnowledgeProductAltmetric();
    altmetric = Object.assign(altmetric, dto.altmetric_full_data);

    altmetric.created_by = knowledgeProduct.created_by;
    altmetric.version_id = knowledgeProduct.version_id;
    altmetric.result_knowledge_product_id =
      knowledgeProduct.result_knowledge_product_id;

    knowledgeProduct.result_knowledge_product_altmetric_array = [altmetric];

    knowledgeProduct.result_knowledge_product_institution_array = (
      dto.institutions ?? []
    ).map((i) => {
      const institution: ResultsKnowledgeProductInstitution =
        new ResultsKnowledgeProductInstitution();

      institution.intitution_name = i.source_name;

      institution.confidant = i.confidence_percentage;
      institution.predicted_institution_id = i.possible_matched_institution_id;

      institution.created_by = knowledgeProduct.created_by;
      institution.version_id = knowledgeProduct.version_id;
      institution.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return institution;
    });

    //TODO map country and region information

    return knowledgeProduct;
  }
}
