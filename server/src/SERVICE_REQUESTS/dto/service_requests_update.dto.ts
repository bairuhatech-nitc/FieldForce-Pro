import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsNumber, IsDateString, IsArray } from 'class-validator';

export class UpdateServiceRequestDto {
  @ApiPropertyOptional({ description: 'Contact ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  contact_id?: string;

  @ApiPropertyOptional({ description: 'Service location ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Subject of the service request', example: 'AC not cooling' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'The air conditioning unit is running but not producing cold air.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: ['low', 'medium', 'high', 'urgent'],
    example: 'medium',
  })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'HVAC' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Status',
    enum: ['new', 'triaged', 'estimated', 'approved', 'converted_to_wo', 'closed', 'spam'],
    example: 'new',
  })
  @IsEnum(['new', 'triaged', 'estimated', 'approved', 'converted_to_wo', 'closed', 'spam'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Channel through which the request was received',
    enum: ['phone', 'email', 'portal', 'webform', 'api', 'whatsapp', 'sms'],
    example: 'phone',
  })
  @IsEnum(['phone', 'email', 'portal', 'webform', 'api', 'whatsapp', 'sms'])
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'List of assigned technician user IDs', type: [String], example: ['uuid1', 'uuid2'] })
  @IsUUID('4', { each: true })
  @IsArray()
  @IsOptional()
  technician_ids?: string[];

  @ApiPropertyOptional({ description: 'Latitude', example: 25.276987 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: 55.296249 })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Scheduled date',
    example: '2024-12-31T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduled_start?: string;

  @ApiPropertyOptional({
    description: 'Custom fields (JSONB)',
    example: { source_detail: 'Website contact form' },
  })
  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, unknown>;
}
