import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MQAPService } from './m-qap.service';

@Module({
  imports: [HttpModule],
  providers: [MQAPService],
  exports: [HttpModule],
})
export class MQAPModule {}
