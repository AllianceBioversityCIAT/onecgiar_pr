import { Module } from '@nestjs/common';
import { InnovationPathwayService } from './innovation-pathway.service';
import { InnovationPathwayController } from './innovation-pathway.controller';

@Module({
  controllers: [InnovationPathwayController],
  providers: [InnovationPathwayService]
})
export class InnovationPathwayModule {}
