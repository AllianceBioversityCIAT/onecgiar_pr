import { Repository } from 'typeorm';
import { ResultScalingStudyUrl } from '../entities/result_scaling_study_url.entity';
import { Injectable } from '@nestjs/common';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultScalingStudyUrlsRepository 
    extends Repository<ResultScalingStudyUrl>
 {}