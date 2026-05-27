import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super_admin.service';
import { SuperAdminGuard } from '../shared/guards/super-admin.guard';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { CurrentUser } from '../shared/decorator/current-user.decorator';
import { UpdateSuperAdminProfileDto, ChangeSuperAdminEmailDto } from './dto/super-admin-profile.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with basic stats' })
  async listTenants() {
    const tenants = await this.superAdminService.listTenants();
    return DataResponseDto.success(tenants, 'Tenants fetched successfully');
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get single tenant details with usage stats' })
  async getTenant(@Param('id') id: string) {
    const tenant = await this.superAdminService.getTenant(id);
    return DataResponseDto.success(tenant);
  }

  @Get('tenants/:id/overview')
  @ApiOperation({ summary: 'Get comprehensive read-only overview of a tenant (for Super Admin tenant view)' })
  async getTenantOverview(@Param('id') id: string) {
    const overview = await this.superAdminService.getTenantOverview(id);
    return DataResponseDto.success(overview, 'Tenant overview fetched successfully');
  }

  @Patch('tenants/:id/suspend')
  @ApiOperation({ summary: 'Suspend a tenant — disables their access' })
  async suspendTenant(@Param('id') id: string) {
    const tenant = await this.superAdminService.suspendTenant(id);
    return DataResponseDto.success(tenant, 'Tenant suspended successfully');
  }

  @Patch('tenants/:id/activate')
  @ApiOperation({ summary: 'Re-activate a suspended tenant' })
  async activateTenant(@Param('id') id: string) {
    const tenant = await this.superAdminService.activateTenant(id);
    return DataResponseDto.success(tenant, 'Tenant activated successfully');
  }

  @Get('platform-health')
  @ApiOperation({ summary: 'Basic platform-wide stats for the Super Admin' })
  async platformHealth() {
    const stats = await this.superAdminService.getPlatformHealth();
    return DataResponseDto.success(stats, 'Platform health fetched successfully');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update super admin profile details (first name, last name)' })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSuperAdminProfileDto,
  ) {
    const result = await this.superAdminService.updateProfile(user.id, dto);
    return DataResponseDto.success(result, 'Profile updated successfully');
  }

  @Patch('profile/email')
  @ApiOperation({ summary: 'Change super admin email address with password verification' })
  async changeEmail(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangeSuperAdminEmailDto,
  ) {
    const result = await this.superAdminService.changeSuperAdminEmail(user.id, dto.current_password, dto.new_email);
    return DataResponseDto.success(result, 'Email updated successfully');
  }
}
