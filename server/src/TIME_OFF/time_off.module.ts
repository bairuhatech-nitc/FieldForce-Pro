import { Module } from '@nestjs/common';
import { TimeOffService } from './time_off.service';
import { TimeOffController } from './time_off.controller';
import { timeOffProviders } from './time_off.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TimeOffController],
  providers: [TimeOffService, ...timeOffProviders],
  exports: [TimeOffService, ...timeOffProviders],
})
export class TimeOffModule {}
