import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TimeOffLeaveType, TimeOffDurationType } from '../time_off_requests.entity';

export class CreateTimeOffRequestDto {
  @ApiProperty({ enum: ['vacation', 'sick', 'personal', 'unpaid', 'other'] })
  @IsEnum(['vacation', 'sick', 'personal', 'unpaid', 'other'])
  leave_type: TimeOffLeaveType;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ enum: ['full_day', 'morning_half', 'afternoon_half', 'multi_day'] })
  @IsEnum(['full_day', 'morning_half', 'afternoon_half', 'multi_day'])
  duration_type: TimeOffDurationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
