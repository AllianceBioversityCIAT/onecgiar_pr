import { Injectable } from '@nestjs/common';
import { MQAPResultDto } from '../../m-qap/dtos/m-qap.dto';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
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
import { FairSpecificData, FullFairData } from './dto/fair-data.dto';
import { StringContentComparator } from '../../../shared/utils/string-content-comparator';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';
import { InstitutionRoleEnum } from '../results_by_institutions/entities/institution_role.enum';

@Injectable()
export class ResultsKnowledgeProductMapper {
  mqapResponseToKnowledgeProductDto(
    mqapResponseDto: MQAPResultDto,
  ): ResultsKnowledgeProductDto {
    let knowledgeProductDto = new ResultsKnowledgeProductDto();

    knowledgeProductDto.commodity = (mqapResponseDto?.Commodities ?? []).join(
      '; ',
    );
    knowledgeProductDto.description = mqapResponseDto?.Description;
    knowledgeProductDto.doi = mqapResponseDto?.DOI;
    const hasQuery = (mqapResponseDto?.Handle ?? '').indexOf('?');
    const linkSplit = (mqapResponseDto?.Handle ?? '')
      .slice(0, hasQuery != -1 ? hasQuery : mqapResponseDto?.Handle.length)
      .split('/');
    const handleId = linkSplit.slice(linkSplit.length - 2).join('/');
    knowledgeProductDto.handle = handleId;
    knowledgeProductDto.is_melia = null; //null, as this field is mapped by the user
    knowledgeProductDto.licence = mqapResponseDto?.Rights;
    knowledgeProductDto.melia_previous_submitted = null; //null, as this info is mapped by the user
    knowledgeProductDto.melia_type_id = null; //null, as this info is mapped by the user
    knowledgeProductDto.ost_melia_study_id = null; //null, as this info is mapped by the user
    knowledgeProductDto.title = mqapResponseDto?.Title;
    knowledgeProductDto.sponsor = (mqapResponseDto?.['Funding source'] ?? [])
      .map((f) => f.name)
      .join('; ');
    knowledgeProductDto.type = mqapResponseDto?.Type;

    knowledgeProductDto.cgspace_countries = this.getAsArray(
      mqapResponseDto?.['Country ISO code'],
    );

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
      author.orcid = a.orcid;

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
    metadataCGSpace.accessibility =
      StringContentComparator.contentCompare(
        'Open Access',
        dto?.['Open Access'],
      ) == 0;
    metadataCGSpace.doi = dto?.DOI;
    metadataCGSpace.is_isi =
      StringContentComparator.contentCompare('ISI Journal', dto?.ISI) == 0;
    metadataCGSpace.is_peer_reviewed =
      StringContentComparator.contentCompare(
        'Peer Review',
        dto?.['Peer-reviewed'],
      ) == 0;
    metadataCGSpace.issue_year = this.extractOnlyYearFromDateString(
      dto?.['Issued date'],
    );
    metadataCGSpace.online_year = dto?.['Online publication date']
      ? this.extractOnlyYearFromDateString(dto?.['Online publication date'])
      : null;

    metadataHolder.push(metadataCGSpace);
    knowledgeProductDto.metadataCG = metadataCGSpace;

    const mqapDOIData = dto?.DOI_Info;
    if (mqapDOIData) {
      const metadataWoS: ResultsKnowledgeProductMetadataDto =
        new ResultsKnowledgeProductMetadataDto();

      metadataWoS.source = mqapDOIData.source;
      metadataWoS.accessibility = mqapDOIData.is_oa
        ?.toLocaleLowerCase()
        ?.includes('yes');
      metadataWoS.doi = mqapDOIData.doi;
      metadataWoS.is_isi = mqapDOIData.is_isi
        ?.toLocaleLowerCase()
        ?.includes('yes');
      metadataWoS.is_peer_reviewed = metadataWoS.is_isi;
      metadataWoS.issue_year = mqapDOIData.publication_year;

      metadataHolder.push(metadataWoS);
      knowledgeProductDto.metadataWOS = metadataWoS;
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

    const regions = this.getAsArray(dto?.['Region of the research']);
    knowledgeProductDto.clarisa_regions = regions
      .filter((r) => r)
      .map((r) => r.clarisa_id);
    //knowledgeProductDto.cgspace_countries = this.getAsArray(dto?.Countries);

    const geoLocation = this.getAsArray(dto?.['Geographic location']);
    const isGlobal = geoLocation.find((r) => r.clarisa_id === 1);
    if (isGlobal) {
      knowledgeProductDto.is_global_geoscope = true;
      knowledgeProductDto.clarisa_regions =
        knowledgeProductDto.clarisa_regions.filter((r) => r === 1);
    }

    //start fair mapping
    const fair = new FullFairData();
    fair.total_score = dto?.FAIR?.score?.total;

    fair.F = new FairSpecificData();
    fair.F.score = dto?.FAIR?.score?.F;
    fair.F.indicators = this.getAsArray(dto?.FAIR?.F).map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.description;
      indicator.name = i?.name;
      indicator.score = i?.valid ? 1 : 0;

      return indicator;
    });

    fair.A = new FairSpecificData();
    fair.A.score = dto?.FAIR?.score?.A;
    fair.A.indicators = this.getAsArray(dto?.FAIR?.A).map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.description;
      indicator.name = i?.name;
      indicator.score = i?.valid ? 1 : 0;

      return indicator;
    });

    fair.I = new FairSpecificData();
    fair.I.score = dto?.FAIR?.score?.I;
    fair.I.indicators = this.getAsArray(dto?.FAIR?.I).map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.description;
      indicator.name = i?.name;
      indicator.score = i?.valid ? 1 : 0;

      return indicator;
    });

    fair.R = new FairSpecificData();
    fair.R.score = dto?.FAIR?.score?.R;
    fair.R.indicators = this.getAsArray(dto?.FAIR?.R).map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.description;
      indicator.name = i?.name;
      indicator.score = i?.valid ? 1 : 0;

      return indicator;
    });

    knowledgeProductDto.fair_data = fair;

    return knowledgeProductDto;
  }

  private getAsArray<T>(arg: T | T[]): T[] {
    if (arg == null) {
      return [];
    } else if (!Array.isArray(arg)) {
      return [arg];
    } else {
      return arg;
    }
  }

  private getAltmetricInfoFromMQAPResponse(
    dto: MQAPResultDto,
  ): ResultsKnowledgeProductAltmetricDto {
    const altmetricDto = dto?.DOI_Info?.altmetric;
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

  public getPublicationYearFromMQAPResponse(dto: MQAPResultDto): {
    field_name: string;
    year: number;
  } {
    let publicationDate = dto?.['Online publication date'];
    let fieldName = 'online_publication_date';

    if (!publicationDate) {
      publicationDate = dto?.['Issued date'];
      fieldName = 'issued_date';
    }

    if (!publicationDate) {
      publicationDate = dto?.['Publication Date'];
      fieldName = 'publication_date';
    }

    const numericYear = this.extractOnlyYearFromDateString(publicationDate);

    return {
      field_name: fieldName,
      year: numericYear,
    };
  }

  private extractOnlyYearFromDateString(dateString: string): number {
    const isComposed: boolean = (dateString ?? '').indexOf('-') > 0;
    let year = 0;

    if (isComposed) {
      year = Number(dateString.slice(0, dateString.indexOf('-')));
    } else {
      year = Number(dateString);
    }

    return Number.isNaN(year) ? undefined : year;
  }

  getAuthorsFromMQAPResponse(dto: MQAPResultDto): MQAPAuthor[] {
    const authorDto = dto?.Authors;
    if (!authorDto) {
      return undefined;
    }

    let authors: string[] = null;
    if (typeof authorDto === 'string') {
      authors = [authorDto];
    } else {
      authors = authorDto;
    }

    const authorDtos: MQAPAuthor[] = (authors ?? []).map((a) => {
      const author = new MQAPAuthor();

      author.name = a;
      //TODO extract ORCID from the ORCID field
      author.orcid = null;

      return author;
    });

    return authorDtos;
  }

  entityToDto(entity: ResultsKnowledgeProduct): ResultsKnowledgeProductDto {
    const knowledgeProductDto: ResultsKnowledgeProductDto =
      new ResultsKnowledgeProductDto();

    knowledgeProductDto.id = entity.result_knowledge_product_id;

    //knowledgeProductDto.accessible = entity.accesible;
    knowledgeProductDto.commodity = entity.comodity;
    knowledgeProductDto.description = entity.description;
    //knowledgeProductDto.findable = entity.findable;
    knowledgeProductDto.handle = entity.handle;
    //knowledgeProductDto.interoperable = entity.interoperable;
    knowledgeProductDto.licence = entity.licence;
    knowledgeProductDto.title = entity.name;
    knowledgeProductDto.references_other_knowledge_products = null; //TODO TBD
    //knowledgeProductDto.reusable = entity.reusable;
    knowledgeProductDto.sponsor = entity.sponsors;
    knowledgeProductDto.type = entity.knowledge_product_type;
    knowledgeProductDto.is_melia = entity.is_melia;
    knowledgeProductDto.melia_previous_submitted =
      entity.melia_previous_submitted;
    knowledgeProductDto.melia_type_id = entity.melia_type_id;
    knowledgeProductDto.ost_melia_study_id = entity.ost_melia_study_id;
    knowledgeProductDto.cgspace_phase_year =
      entity?.result_object?.obj_version?.cgspace_year;
    //knowledgeProductDto.cgspace_countries = entity.cgspace_countries;
    //knowledgeProductDto.cgspace_regions = entity.cgspace_regions;

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

      metadataDto.accessibility = m.accesibility === 'yes';
      metadataDto.doi = m.doi;
      metadataDto.is_isi = m.is_isi;
      metadataDto.is_peer_reviewed = m.is_peer_reviewed;
      metadataDto.issue_year = m.year;
      metadataDto.online_year = m.online_year;

      return metadataDto;
    });
    knowledgeProductDto.metadataCG = knowledgeProductDto.metadata.find(
      (m) => m.source === 'CGSpace',
    );
    knowledgeProductDto.metadataWOS = knowledgeProductDto.metadata.find(
      (m) => m.source !== 'CGSpace',
    );

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

      return institutionDto;
    });

    //knowledgeProductDto.cgspace_countries = null;

    const regions = entity.result_object?.result_region_array;
    knowledgeProductDto.clarisa_regions = (regions ?? []).map(
      (r) => r.region_id,
    );
    knowledgeProductDto.is_global_geoscope =
      entity.result_object?.geographic_scope_id === 1;

    //start fair mapping
    let currentFairValue =
      entity.result_knowledge_product_fair_score_array.find(
        (rkpfs) => rkpfs.fair_field_object.short_name == 'total',
      );
    const fair = new FullFairData();
    fair.total_score = currentFairValue?.fair_value;

    currentFairValue = entity.result_knowledge_product_fair_score_array.find(
      (rkpfs) => rkpfs.fair_field_object.short_name == 'F',
    );
    let currentFairIndicators =
      entity.result_knowledge_product_fair_score_array.filter(
        (rkpfs) =>
          rkpfs.fair_field_object.parent_id == currentFairValue.fair_field_id,
      );
    fair.F = new FairSpecificData();
    fair.F.score = currentFairValue?.fair_value;
    fair.F.indicators = currentFairIndicators.map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.fair_field_object?.description;
      indicator.name = i?.fair_field_object?.short_name;
      indicator.score = i?.fair_value;

      return indicator;
    });

    currentFairValue = entity.result_knowledge_product_fair_score_array.find(
      (rkpfs) => rkpfs.fair_field_object.short_name == 'A',
    );
    currentFairIndicators =
      entity.result_knowledge_product_fair_score_array.filter(
        (rkpfs) =>
          rkpfs.fair_field_object.parent_id == currentFairValue.fair_field_id,
      );
    fair.A = new FairSpecificData();
    fair.A.score = currentFairValue?.fair_value;
    fair.A.indicators = currentFairIndicators.map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.fair_field_object?.description;
      indicator.name = i?.fair_field_object?.short_name;
      indicator.score = i?.fair_value;

      return indicator;
    });

    currentFairValue = entity.result_knowledge_product_fair_score_array.find(
      (rkpfs) => rkpfs.fair_field_object.short_name == 'I',
    );
    currentFairIndicators =
      entity.result_knowledge_product_fair_score_array.filter(
        (rkpfs) =>
          rkpfs.fair_field_object.parent_id == currentFairValue.fair_field_id,
      );
    fair.I = new FairSpecificData();
    fair.I.score = currentFairValue?.fair_value;
    fair.I.indicators = currentFairIndicators.map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.fair_field_object?.description;
      indicator.name = i?.fair_field_object?.short_name;
      indicator.score = i?.fair_value;

      return indicator;
    });

    currentFairValue = entity.result_knowledge_product_fair_score_array.find(
      (rkpfs) => rkpfs.fair_field_object.short_name == 'R',
    );
    currentFairIndicators =
      entity.result_knowledge_product_fair_score_array.filter(
        (rkpfs) =>
          rkpfs.fair_field_object.parent_id == currentFairValue.fair_field_id,
      );
    fair.R = new FairSpecificData();
    fair.R.score = currentFairValue?.fair_value;
    fair.R.indicators = currentFairIndicators.map((i) => {
      const indicator = new FairSpecificData();

      indicator.description = i?.fair_field_object?.description;
      indicator.name = i?.fair_field_object?.short_name;
      indicator.score = i?.fair_value;

      return indicator;
    });

    knowledgeProductDto.fair_data = fair;

    return knowledgeProductDto;
  }

  updateEntity(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    userId: number,
    resultId: number,
  ): ResultsKnowledgeProduct {
    knowledgeProduct.comodity = dto.commodity;
    knowledgeProduct.description = dto.description;
    knowledgeProduct.doi = dto.doi;
    knowledgeProduct.handle = dto.handle;
    //knowledgeProduct.is_melia = null;
    knowledgeProduct.knowledge_product_type = dto.type;
    knowledgeProduct.licence = dto.licence;
    //knowledgeProduct.melia_previous_submitted = null;
    //knowledgeProduct.melia_type_id = null;
    //knowledgeProduct.ost_melia_study_id = null;
    knowledgeProduct.name = dto.title;
    knowledgeProduct.sponsors = dto.sponsor;

    if (!knowledgeProduct.result_knowledge_product_id) {
      knowledgeProduct.created_by = userId;
    } else {
      knowledgeProduct.last_updated_by = userId;
    }

    knowledgeProduct.results_id = resultId;

    //knowledgeProduct.cgspace_countries = dto.cgspace_countries;
    //knowledgeProduct.cgspace_regions = dto.cgspace_regions;

    return knowledgeProduct;
  }

  populateKPRelations(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    confidenceThreshold: number,
  ): ResultsKnowledgeProduct {
    this.patchAuthors(knowledgeProduct, dto);
    this.patchKeywords(knowledgeProduct, dto);
    this.patchMetadata(knowledgeProduct, dto);
    this.patchAltmetricData(knowledgeProduct, dto);
    this.patchInstitutions(knowledgeProduct, dto, confidenceThreshold);
    this.patchRegions(knowledgeProduct, dto);

    return knowledgeProduct;
  }

  public patchInstitutions(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    confidenceThreshold: number,
    upsert = false,
  ) {
    const institutions = (dto.institutions ?? []).map((i) => {
      let kpInstitution: ResultsKnowledgeProductInstitution;
      if (upsert) {
        kpInstitution = (
          knowledgeProduct.result_knowledge_product_institution_array ?? []
        ).find(
          (oi) =>
            StringContentComparator.contentCompare(
              oi.intitution_name,
              i.source_name,
            ) === 0,
        );
        if (kpInstitution) {
          kpInstitution['matched'] = true;
        }
      }

      if (
        !upsert ||
        !kpInstitution ||
        (kpInstitution.result_kp_mqap_institution_id &&
          !kpInstitution.result_by_institution_object) ||
        (kpInstitution.result_kp_mqap_institution_id &&
          kpInstitution.result_by_institution_object &&
          !kpInstitution.result_by_institution_object.institutions_id)
      ) {
        kpInstitution ??= new ResultsKnowledgeProductInstitution();

        kpInstitution.intitution_name = i.source_name;
        kpInstitution.confidant = i.confidence_percentage;
        kpInstitution.predicted_institution_id =
          i.possible_matched_institution_id;

        const isPredicted = kpInstitution.confidant >= confidenceThreshold;
        const resultInstitution =
          kpInstitution.result_by_institution_object ??
          new ResultsByInstitution();

        resultInstitution.result_id = knowledgeProduct.results_id;
        resultInstitution.institutions_id = isPredicted
          ? kpInstitution.predicted_institution_id
          : null;
        resultInstitution.institution_roles_id = InstitutionRoleEnum.PARTNER;
        resultInstitution.is_predicted = isPredicted;
        resultInstitution.is_active = true;

        if (!knowledgeProduct.last_updated_by) {
          kpInstitution.created_by = knowledgeProduct.created_by;
          resultInstitution.created_by = knowledgeProduct.created_by;
        } else {
          if (!kpInstitution.result_kp_mqap_institution_id) {
            kpInstitution.created_by = knowledgeProduct.created_by;
            resultInstitution.created_by = knowledgeProduct.created_by;
          } else {
            if (!resultInstitution.id) {
              resultInstitution.created_by = knowledgeProduct.last_updated_by;
            }
            kpInstitution.last_updated_by = knowledgeProduct.last_updated_by;
            resultInstitution.last_updated_by =
              knowledgeProduct.last_updated_by;
          }
        }

        kpInstitution.result_by_institution_object = resultInstitution;

        kpInstitution.result_knowledge_product_id =
          knowledgeProduct.result_knowledge_product_id;
      }

      return kpInstitution;
    });

    (knowledgeProduct.result_knowledge_product_institution_array ?? []).forEach(
      (oi) => {
        if (!oi['matched']) {
          if (oi.result_by_institution_object) {
            oi.result_by_institution_object.is_active = false;
          }

          oi.is_active = false;

          institutions.push(oi);
        } else {
          oi.is_active = true;
          if (oi.result_by_institution_object) {
            oi.result_by_institution_object.is_active = true;
          }

          delete oi['matched'];
        }
      },
    );

    knowledgeProduct.result_knowledge_product_institution_array = institutions;
  }

  public patchRegions(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const regions = (dto.clarisa_regions ?? []).map((r) => {
      let region: ResultRegion;
      if (upsert) {
        region = (
          knowledgeProduct.result_object.result_region_array ?? []
        ).find((orr) => orr.region_id == r);
        if (region) {
          region['matched'] = true;
        }
      }

      region ??= new ResultRegion();

      region.region_id = r;
      region.result_id = knowledgeProduct.results_id;

      return region;
    });

    (knowledgeProduct.result_object.result_region_array ?? []).forEach((or) => {
      if (!or['matched']) {
        if (or.result_region_id) {
          or.is_active = false;
        }

        regions.push(or);
      } else {
        delete or['matched'];
      }
    });

    knowledgeProduct.result_object.result_region_array = regions;
  }

  public patchAltmetricData(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    let altmetric: ResultsKnowledgeProductAltmetric;
    if (upsert) {
      altmetric =
        knowledgeProduct.result_knowledge_product_altmetric_array?.[0] ??
        new ResultsKnowledgeProductAltmetric();
    } else {
      altmetric = new ResultsKnowledgeProductAltmetric();
    }

    altmetric = Object.assign(altmetric, dto.altmetric_full_data);

    if (!knowledgeProduct.last_updated_by) {
      altmetric.created_by = knowledgeProduct.created_by;
    } else {
      if (!altmetric.result_kp_altmetrics_id) {
        altmetric.created_by = knowledgeProduct.created_by;
      } else {
        altmetric.last_updated_by = knowledgeProduct.last_updated_by;
      }
    }

    altmetric.result_knowledge_product_id =
      knowledgeProduct.result_knowledge_product_id;

    knowledgeProduct.result_knowledge_product_altmetric_array = [altmetric];
  }

  public patchMetadata(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const metadataArray = (dto.metadata ?? []).map((m) => {
      let metadata: ResultsKnowledgeProductMetadata;
      if (upsert) {
        metadata = (
          knowledgeProduct.result_knowledge_product_metadata_array ?? []
        ).find((om) => om.source == m.source);
        if (metadata) {
          metadata['matched'] = true;
        }
      }

      metadata ??= new ResultsKnowledgeProductMetadata();

      metadata.source = m.source;
      metadata.accesibility = m.accessibility ? 'yes' : 'no';
      metadata.doi = m.doi;
      metadata.is_isi = m.is_isi;
      metadata.is_peer_reviewed = m.is_peer_reviewed;
      metadata.year = m.issue_year;
      metadata.online_year = m.online_year;

      if (!knowledgeProduct.last_updated_by) {
        metadata.created_by = knowledgeProduct.created_by;
      } else {
        if (!metadata.result_kp_metadata_id) {
          metadata.created_by = knowledgeProduct.created_by;
        } else {
          metadata.last_updated_by = knowledgeProduct.last_updated_by;
        }
      }

      metadata.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return metadata;
    });

    (knowledgeProduct.result_knowledge_product_metadata_array ?? []).forEach(
      (om) => {
        if (!om['matched']) {
          om.is_active = false;
          metadataArray.push(om);
        } else {
          delete om['matched'];
        }
      },
    );

    knowledgeProduct.result_knowledge_product_metadata_array = metadataArray;
  }

  public patchKeywords(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const incomingKeywords: { keyword: string; agrovoc: boolean }[] = [
      ...(dto.agrovoc_keywords ?? []).map((ag) => {
        return { keyword: ag, agrovoc: true };
      }),
      ...(dto.keywords ?? []).map((ag) => {
        return { keyword: ag, agrovoc: false };
      }),
    ];

    const keywordArray = incomingKeywords.map((k) => {
      let keyword: ResultsKnowledgeProductKeyword;
      if (upsert) {
        keyword = (
          knowledgeProduct.result_knowledge_product_keyword_array ?? []
        ).find((ok) => ok.keyword == k.keyword);
        if (keyword) {
          keyword['matched'] = true;
        }
      }

      keyword ??= new ResultsKnowledgeProductKeyword();

      keyword.keyword = k.keyword;
      keyword.is_agrovoc = k.agrovoc;

      if (!knowledgeProduct.last_updated_by) {
        keyword.created_by = knowledgeProduct.created_by;
      } else {
        if (!keyword.result_kp_keyword_id) {
          keyword.created_by = knowledgeProduct.created_by;
        } else {
          keyword.last_updated_by = knowledgeProduct.last_updated_by;
        }
      }

      keyword.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return keyword;
    });

    (knowledgeProduct.result_knowledge_product_keyword_array ?? []).forEach(
      (ok) => {
        if (!ok['matched']) {
          ok.is_active = false;
          keywordArray.push(ok);
        } else {
          delete ok['matched'];
        }
      },
    );

    knowledgeProduct.result_knowledge_product_keyword_array = keywordArray;
  }

  public patchAuthors(
    knowledgeProduct: ResultsKnowledgeProduct,
    dto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const authors = (dto.authors ?? []).map((a) => {
      let author: ResultsKnowledgeProductAuthor;
      if (upsert) {
        author = (
          knowledgeProduct.result_knowledge_product_author_array ?? []
        ).find((oa) => oa.author_name == a.name);
        if (author) {
          author['matched'] = true;
        }
      }
      author ??= new ResultsKnowledgeProductAuthor();

      author.author_name = a.name;
      author.orcid = a.orcid;

      if (!knowledgeProduct.last_updated_by) {
        author.created_by = knowledgeProduct.created_by;
      } else {
        if (!author.result_kp_author_id) {
          author.created_by = knowledgeProduct.created_by;
        } else {
          author.last_updated_by = knowledgeProduct.last_updated_by;
        }
      }

      author.result_knowledge_product_id =
        knowledgeProduct.result_knowledge_product_id;

      return author;
    });

    (knowledgeProduct.result_knowledge_product_author_array ?? []).forEach(
      (oa) => {
        if (!oa['matched']) {
          oa.is_active = false;
          authors.push(oa);
        } else {
          delete oa['matched'];
        }
      },
    );

    knowledgeProduct.result_knowledge_product_author_array = authors;
  }
}
