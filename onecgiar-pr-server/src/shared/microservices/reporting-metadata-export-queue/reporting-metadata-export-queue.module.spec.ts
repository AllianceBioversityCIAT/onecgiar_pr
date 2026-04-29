import { Test, TestingModule } from '@nestjs/testing';
import { ReportingMetadataExportQueueModule } from './reporting-metadata-export-queue.module';
import { ReportingMetadataExportQueuePublisherService } from './reporting-metadata-export-queue-publisher.service';

describe('ReportingMetadataExportQueueModule', () => {
  it('compiles and exposes ReportingMetadataExportQueuePublisherService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ReportingMetadataExportQueueModule],
    }).compile();

    const publisher = module.get(ReportingMetadataExportQueuePublisherService);
    expect(publisher).toBeInstanceOf(ReportingMetadataExportQueuePublisherService);
    expect(typeof publisher.isEnabled).toBe('function');
    await module.close();
  });
});
