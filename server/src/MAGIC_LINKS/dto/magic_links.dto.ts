import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GenerateMagicLinkDto {
  @ApiProperty({ description: 'UUID of the target user who will receive the magic link' })
  @IsUUID()
  @IsNotEmpty()
  target_user_id: string;

  @ApiProperty({ enum: ['super_admin_access', 'admin_onboarding', 'user_access'] })
  @IsEnum(['super_admin_access', 'admin_onboarding', 'user_access'])
  purpose: 'super_admin_access' | 'admin_onboarding' | 'user_access';
}

export class CompleteOnboardingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @IsNotEmpty()
  new_password: string;
}
