import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString, IsString } from 'class-validator';

export class AssignEquipmentDto {
  @ApiPropertyOptional({ description: 'Technician UUID to assign to' })
  @IsOptional()
  @IsUUID()
  technician_id?: string;

  @ApiPropertyOptional({ description: 'Crew UUID to assign to' })
  @IsOptional()
  @IsUUID()
  crew_id?: string;

  @ApiPropertyOptional({ description: 'Expected return date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expected_return_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MaintenanceEquipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Expected completion date' })
  @IsOptional()
  @IsDateString()
  expected_return_date?: string;
}

export class ReturnEquipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateEquipmentCategoryDto {
  @ApiPropertyOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
