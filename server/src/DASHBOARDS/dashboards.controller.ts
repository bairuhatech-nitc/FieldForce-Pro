import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { CreateDashboardDto } from './dto/dashboards_create.dto';
import { UpdateDashboardDto } from './dto/dashboards_update.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Dashboards')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get()
  @Permissions('dashboards:read')
  @ApiOperation({ summary: 'Get all dashboards (paginated)' })
  async findAll(@TenantId() tenantId: string, @Query() pageOptionsDto: PageOptionsDto) {
    const result = await this.dashboardsService.findAllPaginated(tenantId, pageOptionsDto);
    return DataResponseDto.success(result.data, 'Dashboards fetched successfully', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get('user/:userId')
  @Permissions('dashboards:read')
  @ApiOperation({ summary: 'Get dashboards by user ID' })
  async findByUserId(
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
  ) {
    const dashboards = await this.dashboardsService.findByUserId(userId, tenantId);
    return DataResponseDto.success(dashboards, 'User dashboards fetched successfully');
  }

  @Get(':id')
  @Permissions('dashboards:read')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const dashboard = await this.dashboardsService.findById(id, tenantId);
    return DataResponseDto.success(dashboard);
  }

  @Post()
  @Permissions('dashboards:create')
  @ApiOperation({ summary: 'Create a new dashboard' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateDashboardDto) {
    const dashboard = await this.dashboardsService.create(tenantId, dto);
    return DataResponseDto.created(dashboard, 'Dashboard created successfully');
  }

  @Put(':id')
  @Permissions('dashboards:update')
  @ApiOperation({ summary: 'Update a dashboard' })
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    const dashboard = await this.dashboardsService.update(id, tenantId, dto);
    return DataResponseDto.success(dashboard, 'Dashboard updated successfully');
  }

  @Delete(':id')
  @Permissions('dashboards:delete')
  @ApiOperation({ summary: 'Delete a dashboard (soft delete)' })
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.dashboardsService.delete(id, tenantId);
    return DataResponseDto.success(null, 'Dashboard deleted successfully');
  }
}
