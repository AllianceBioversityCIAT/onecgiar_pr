import { Module } from '@nestjs/common';
import { RolesUserByAplicationService } from './roles-user-by-aplication.service';
import { RolesUserByAplicationController } from './roles-user-by-aplication.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesUserByAplication } from './entities/roles-user-by-aplication.entity';
import { Repository } from 'typeorm';

@Module({
  controllers: [RolesUserByAplicationController],
  providers: [
    RolesUserByAplicationService,
    Repository
    
  ],
  imports: [
    TypeOrmModule.forFeature([RolesUserByAplication])
  ]
})
export class RolesUserByAplicationModule {}
