import { Injectable } from '@nestjs/common';
import { env } from 'process';

@Injectable()
export class ClarisaTaskService { 
    private clarisaHost: string = env.CLA_URL || 'https://clarisa.cgiar.org/api/';
}
