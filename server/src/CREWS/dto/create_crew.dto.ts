import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsArray,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateCrewDto {
  @ApiProperty({ description: 'Crew name', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'UUID of the crew leader (must be in member_ids)' })
  @IsOptional()
  @IsUUID()
  crew_leader_id?: string;

  @ApiPropertyOptional({ description: 'Territory ID from settings' })
  @IsOptional()
  @IsString()
  territory_id?: string;

  @ApiPropertyOptional({ description: 'Shift ID from settings' })
  @IsOptional()
  @IsString()
  shift_id?: string;

  @ApiPropertyOptional({ description: 'Array of technician UUIDs to add as members' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  member_ids?: string[];

  @ApiPropertyOptional({ description: 'Array of category UUIDs representing skills' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skill_ids?: string[];

  @ApiPropertyOptional({ description: 'Array of asset UUIDs assigned to this crew' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  equipment_ids?: string[];

  @ApiPropertyOptional({ description: 'Whether the crew is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
