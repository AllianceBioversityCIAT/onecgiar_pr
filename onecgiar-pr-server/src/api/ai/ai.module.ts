import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiReviewEvent } from './entities/ai-review-event.entity';
import { AiReviewProposal } from './entities/ai-review-proposal.entity';
import { AiReviewSession } from './entities/ai-review-session.entity';
import { ResultFieldAiState } from './entities/result-field-ai-state.entity';
import { ResultFieldRevision } from './entities/result-field-revision.entity';
import { Result } from '../results/entities/result.entity';
import { ResultsInnovationsDev } from '../results/summary/entities/results-innovations-dev.entity';
import { ResultImpactAreaScore } from '../result-impact-area-scores/entities/result-impact-area-score.entity';
import { ImpactAreasScoresComponent } from '../results/impact_areas_scores_components/entities/impact_areas_scores_component.entity';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiReviewSession,
      AiReviewProposal,
      AiReviewEvent,
      ResultFieldRevision,
      ResultFieldAiState,
      Result,
      ResultsInnovationsDev,
      ResultImpactAreaScore,
      ImpactAreasScoresComponent,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, HandlersError],
  exports: [AiService],
})
export class AiModule {}
