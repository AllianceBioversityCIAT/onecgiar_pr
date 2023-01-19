import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ClarisaCredentialsBiService } from './clarisa-credentials-bi.service';
import { BiReportsModule } from './bi-reports/bi-reports.module';

@Module({
    imports:[
        HttpModule,
        BiReportsModule,
    
    ],
    providers: [ClarisaCredentialsBiService],
    exports:[ClarisaCredentialsBiService]
})
export class ResultDashboardBIdModule {}
