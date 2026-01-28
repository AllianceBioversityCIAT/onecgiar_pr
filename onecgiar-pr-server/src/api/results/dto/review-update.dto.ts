import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { CreateGeographicLocationDto } from '../../results-framework-reporting/geographic-location/dto/create-geographic-location.dto';
import { ResultsCenterDto } from '../results-centers/dto/results-center.dto';
import { CreateResultsTocResultDto } from '../../results/results-toc-results/dto/create-results-toc-result.dto';
import { BilateralProjectLinkDto } from '../results_by_institutions/dto/save-partners-v2.dto';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { CapdevDto } from '../summary/dto/create-capacity-developents.dto';
import { CreateInnovationDevDtoV2 } from '../../results-framework-reporting/innovation_dev/dto/create-innovation_dev_v2.dto';
import { PolicyChangesDto } from '../summary/dto/create-policy-changes.dto';
import { CreateInnovationUseDto } from '../../results-framework-reporting/innovation-use/dto/create-innovation-use.dto';
import { Type } from 'class-transformer';

export class CommonFieldsDto {
    @ApiProperty({
        description: 'Result identifier',
        example: 9270,
    })
    @IsNotEmpty()
    @IsNumber()
    id: number;
    
    @ApiPropertyOptional({
        description: 'Description of the result (Minimum Data Standard field)',
        example: 'Updated result description',
    })
    @IsOptional()
    @IsString()
    result_description?: string;

    @ApiProperty({
        description: 'Result type identifier',
        example: 1,
    })
    @IsNotEmpty()
    @IsNumber()
    result_type_id: number;
}

export class EvidenceDto {
    @ApiProperty({
        description: 'Evidence identifier',
        example: 11179,
    })
    @IsString()
    id: string;

    @ApiProperty({
        description: 'Evidence link or URL',
        example: 'https://example.org/paper-123',
    })
    @IsString()
    link: string;

    @ApiProperty({
        description: 'Indicates whether the evidence is stored in SharePoint',
        example: false,
    })
    @IsNumber()
    is_sharepoint: number;
}

export class ReviewUpdateDto {

    @ApiProperty({
        type: () => CommonFieldsDto,
        description: 'Common fields of the result',
        example: {
            id: 9270,
            result_description: 'Updated result description',
        },
    })
    @IsNotEmpty()
    @Type(() => CommonFieldsDto)
    @ValidateNested()
    commonFields: CommonFieldsDto;

    @ApiPropertyOptional({
        type: () => CreateGeographicLocationDto,
        description: 'Geographic scope of the result',
        example: {
            has_countries: true,
            has_regions: true,
            regions: [
            { id: 53 },
            { id: 29 },
            ],
            countries: [
            { id: 4 },
            { id: 248 },
            ],
            geo_scope_id: 2,
            extra_geo_scope_id: 2,
            extra_regions: [
            { id: 61 },
            { id: 154 },
            ],
            extra_countries: [
            { id: 36 },
            ],
            has_extra_countries: true,
            has_extra_regions: true,
            has_extra_geo_scope: true,
        },
    })
    @IsOptional()
    geographicScope?: CreateGeographicLocationDto;

    @ApiPropertyOptional({
        type: () => [ResultsCenterDto],
        description: 'List of contributing CGIAR centers associated with the result.',
        example: [
            {
            id: 12362,
            primary: 1,
            from_cgspace: 0,
            is_active: 1,
            created_date: '2026-01-22T20:45:22.944Z',
            last_updated_date: '2026-01-22T20:45:22.944Z',
            result_id: '9270',
            created_by: 1028,
            last_updated_by: null,
            code: 'CENTER-03',
            name:
                'Alliance of Bioversity and CIAT - Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical)',
            acronym: 'CIAT (Alliance)',
            is_leading_result: 1,
            },
            {
            id: 12364,
            primary: 0,
            from_cgspace: 1,
            is_active: 1,
            created_date: '2026-01-22T20:45:24.849Z',
            last_updated_date: '2026-01-22T20:45:24.849Z',
            result_id: '9270',
            created_by: 1028,
            last_updated_by: null,
            code: 'CENTER-07',
            name:
                'International Center for Agricultural Research in the Dry Areas',
            acronym: 'ICARDA',
            is_leading_result: null,
            },
        ],
    })
    @IsOptional()
    contributingCenters?: ResultsCenterDto[];

    @ApiPropertyOptional({
        description:
        'Contributing initiatives grouped by accepted and pending status.',
        type: () => Object,
        example: {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: [
            {
            id: 54,
            official_code: 'SP05',
            name: 'Better Diets and Nutrition',
            short_name: 'Better Diets and Nutrition',
            active: 1,
            action_area_id: null,
            toc_id: null,
            portfolio_name: 'CGIAR portfolio 2025-2030',
            portfolio_start_date: 2025,
            portfolio_end_date: 2030,
            portfolio_is_active: 0,
            full_name:
                'SP05 - <strong>Better Diets and Nutrition</strong> - Better Diets and Nutrition',
            selected: true,
            new: true,
            is_active: true,
            },
            {
            id: 55,
            official_code: 'SP06',
            name: 'Climate Action',
            short_name: 'Climate Action',
            active: 1,
            action_area_id: null,
            toc_id: null,
            portfolio_name: 'CGIAR portfolio 2025-2030',
            portfolio_start_date: 2025,
            portfolio_end_date: 2030,
            portfolio_is_active: 0,
            full_name:
                'SP06 - <strong>Climate Action</strong> - Climate Action',
            selected: true,
            new: true,
            is_active: true,
            },
        ],
        },
    })
    @IsOptional()
    contributingInitiatives?: CreateResultsTocResultDto['contributing_initiatives'];

    @ApiPropertyOptional({
        type: () => [BilateralProjectLinkDto],
        description: 'Bilateral projects linked to the result.',
        example: [
            { project_id: 142 },
            { project_id: 4 },
        ],
    })
    @IsOptional()
    contributingProjects?: Array<number | string | BilateralProjectLinkDto>;

    @ApiPropertyOptional({
        type: () => [ResultsByInstitution],
        description: 'Institutions contributing to the result.',
    })
    @IsOptional()
    contributingInstitutions?: ResultsByInstitution[];

    @ApiPropertyOptional({
        type: () => [EvidenceDto],
        description: 'List of evidences associated with the result',
        example: [
        {
            id: 11179,
            link: 'https://example.org/paper-123',
            is_sharepoint: false,
        },
        ],
    })
    @ValidateNested({ each: true })
    @Type(() => EvidenceDto)
    evidence: EvidenceDto[];

    @ApiPropertyOptional({
        description: 'Capacity development of the result.',
        example: {
            result_capacity_development_id: 123,
            male_using: 1,
            female_using: 1,
            non_binary_using: 1,
        },
    })
    @IsOptional()
    resultTypeResponse?: CapdevDto | CreateInnovationDevDtoV2 | PolicyChangesDto | CreateInnovationUseDto;

    @ApiProperty({
        description:
        'Explanation for the update. Required if any ToC or Minimum Data Standard field was modified.',
        example: 'Updated title and ToC mapping based on reviewer feedback',
        required: false,
    })
    @IsString()
    @IsNotEmpty()
    updateExplanation: string;
}


