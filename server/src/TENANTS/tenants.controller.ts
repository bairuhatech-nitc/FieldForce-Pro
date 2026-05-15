import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body() dto: CreateTenantDto) {
    const tenant = await this.tenantsService.create(dto);
    return DataResponseDto.created(tenant, 'Tenant created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants' })
  async findAll() {
    const tenants = await this.tenantsService.findAll();
    return DataResponseDto.success(tenants);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(@Param('id') id: string) {
    const tenant = await this.tenantsService.findById(id);
    return DataResponseDto.success(tenant);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.update(id, dto);
    return DataResponseDto.success(tenant, 'Tenant updated successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a tenant' })
  async remove(@Param('id') id: string) {
    await this.tenantsService.remove(id);
    return DataResponseDto.success(null, 'Tenant deactivated successfully');
  }
}
