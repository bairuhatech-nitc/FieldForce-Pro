import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AttendanceStatus } from '../attendance_log.entity';

export class AdjustAttendanceDto {
  @ApiProperty({ description: 'Reason for the manual adjustment' })
  @IsString()
  @IsNotEmpty()
  adjustment_reason: string;

  @ApiPropertyOptional({ enum: ['present', 'absent', 'half_day'] })
  @IsOptional()
  @IsEnum(['present', 'absent', 'half_day'])
  status?: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Override punch-in time (ISO string)' })
  @IsOptional()
  @IsDateString()
  punch_in_time?: string;

  @ApiPropertyOptional({ description: 'Override punch-out time (ISO string)' })
  @IsOptional()
  @IsDateString()
  punch_out_time?: string;

  @ApiPropertyOptional({ description: 'Punch ID to adjust (omit to create a new punch)' })
  @IsOptional()
  @IsString()
  punch_id?: string;
}
