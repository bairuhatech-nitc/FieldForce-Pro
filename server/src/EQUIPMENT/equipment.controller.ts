import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create_equipment.dto';
import { UpdateEquipmentDto } from './dto/update_equipment.dto';
import {
  AssignEquipmentDto,
  MaintenanceEquipmentDto,
  ReturnEquipmentDto,
  CreateEquipmentCategoryDto,
} from './dto/assign_equipment.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { UserId } from '../shared/decorator/user.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ── Categories ────────────────────────────────────────────────────────────

  @Get('categories')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get all equipment categories for this tenant' })
  async getCategories(@TenantId() tenantId: string) {
    const categories = await this.equipmentService.findAllCategories(tenantId);
    return DataResponseDto.success(categories, 'Categories fetched successfully');
  }

  @Post('categories')
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Create a new equipment category' })
  async createCategory(@TenantId() tenantId: string, @Body() dto: CreateEquipmentCategoryDto) {
    const category = await this.equipmentService.createCategory(tenantId, dto);
    return DataResponseDto.created(category, 'Category created successfully');
  }

  @Delete('categories/:id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Delete an equipment category' })
  async deleteCategory(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.equipmentService.deleteCategory(id, tenantId);
    return DataResponseDto.success(null, 'Category deleted');
  }

  // ── Equipment CRUD ────────────────────────────────────────────────────────

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'List all equipment (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'assigned', 'in_maintenance', 'retired'] })
  @ApiQuery({ name: 'equipment_category_id', required: false })
  @ApiQuery({ name: 'assigned_to', required: false, description: 'Filter by technician or crew UUID' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('status') status?: string,
    @Query('equipment_category_id') equipment_category_id?: string,
    @Query('assigned_to') assigned_to?: string,
  ) {
    const result = await this.equipmentService.findAll(tenantId, pageOptionsDto, {
      status,
      equipment_category_id,
      assigned_to,
    });
    return DataResponseDto.success(result.data, 'Equipment fetched successfully', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get equipment by ID with full assignment history' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const equipment = await this.equipmentService.findById(id, tenantId);
    return DataResponseDto.success(equipment, 'Equipment fetched successfully');
  }

  @Post()
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Add new equipment to the registry' })
  async create(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: CreateEquipmentDto,
  ) {
    const equipment = await this.equipmentService.create(tenantId, userId, dto);
    return DataResponseDto.created(equipment, 'Equipment created successfully');
  }

  @Put(':id')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Update equipment details' })
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    const equipment = await this.equipmentService.update(id, tenantId, dto);
    return DataResponseDto.success(equipment, 'Equipment updated successfully');
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Retire and soft-delete equipment' })
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
  ) {
    await this.equipmentService.remove(id, tenantId, userId);
    return DataResponseDto.success(null, 'Equipment retired successfully');
  }

  // ── Assignment lifecycle ──────────────────────────────────────────────────

  @Post(':id/assign')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Check-out: assign equipment to a technician or crew' })
  async assign(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: AssignEquipmentDto,
  ) {
    const equipment = await this.equipmentService.assign(id, tenantId, userId, dto);
    return DataResponseDto.success(equipment, 'Equipment assigned successfully');
  }

  @Post(':id/return')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Check-in: return equipment and mark it as available' })
  async return(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: ReturnEquipmentDto,
  ) {
    const equipment = await this.equipmentService.return(id, tenantId, userId, dto);
    return DataResponseDto.success(equipment, 'Equipment returned successfully');
  }

  @Post(':id/maintenance')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Flag equipment as IN_MAINTENANCE' })
  async sendToMaintenance(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: MaintenanceEquipmentDto,
  ) {
    const equipment = await this.equipmentService.sendToMaintenance(id, tenantId, userId, dto);
    return DataResponseDto.success(equipment, 'Equipment sent for maintenance');
  }

  @Patch(':id/maintenance/complete')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Mark maintenance as complete and return equipment to AVAILABLE' })
  async completeMaintenance(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body('notes') notes?: string,
  ) {
    const equipment = await this.equipmentService.completeMaintenance(id, tenantId, userId, notes);
    return DataResponseDto.success(equipment, 'Maintenance completed');
  }
}
