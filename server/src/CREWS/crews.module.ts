import { Module } from '@nestjs/common';
import { CrewsService } from './crews.service';
import { CrewsController } from './crews.controller';
import { crewsProviders } from './crews.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CrewsController],
  providers: [CrewsService, ...crewsProviders],
  exports: [CrewsService, ...crewsProviders],
})
export class CrewsModule {}
