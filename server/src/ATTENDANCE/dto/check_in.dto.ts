import { IsOptional, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  lat: number;
  lng: number;
}

export class CheckInDto {
  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device_info?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device_info?: string;
}
