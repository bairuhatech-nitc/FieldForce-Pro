import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { attendanceProviders } from './attendance.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, ...attendanceProviders],
  exports: [AttendanceService, ...attendanceProviders],
})
export class AttendanceModule {}
