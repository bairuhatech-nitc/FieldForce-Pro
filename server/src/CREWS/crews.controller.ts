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
import { CrewsService } from './crews.service';
import { CreateCrewDto } from './dto/create_crew.dto';
import { UpdateCrewDto } from './dto/update_crew.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Crews')
@ApiBearerAuth()
@Controller('crews')
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all crews (paginated)' })
  @ApiQuery({ name: 'territory_id', required: false })
  @ApiQuery({ name: 'shift_id', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  async findAll(
    @TenantId() tenantId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('territory_id') territory_id?: string,
    @Query('shift_id') shift_id?: string,
    @Query('is_active') is_active?: string,
  ) {
    const filters = {
      territory_id,
      shift_id,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    };

    const result = await this.crewsService.findAll(tenantId, pageOptionsDto, filters);
    return DataResponseDto.success(result.data, 'Crews fetched successfully', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get('dispatch')
  @Permissions('scheduling:read')
  @ApiOperation({ summary: 'Get all active crews as schedulable resources for the dispatch board' })
  async getCrewsForDispatch(@TenantId() tenantId: string) {
    const crews = await this.crewsService.getCrewsForDispatch(tenantId);
    return DataResponseDto.success(crews, 'Dispatch crews fetched successfully');
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get crew by ID with members, skills, and equipment' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const crew = await this.crewsService.findById(id, tenantId);
    return DataResponseDto.success(crew, 'Crew fetched successfully');
  }

  @Post()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Create a new crew' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateCrewDto) {
    const crew = await this.crewsService.create(tenantId, dto);
    return DataResponseDto.created(crew, 'Crew created successfully');
  }

  @Put(':id')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Update crew details' })
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateCrewDto,
  ) {
    const crew = await this.crewsService.update(id, tenantId, dto);
    return DataResponseDto.success(crew, 'Crew updated successfully');
  }

  @Delete(':id')
  @Permissions('users:delete')
  @ApiOperation({ summary: 'Soft-delete (deactivate) a crew' })
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.crewsService.remove(id, tenantId);
    return DataResponseDto.success(null, 'Crew deleted successfully');
  }

  @Post(':id/members')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Add technicians to a crew' })
  async addMembers(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body('technician_ids') technicianIds: string[],
  ) {
    const crew = await this.crewsService.addMembers(id, tenantId, technicianIds);
    return DataResponseDto.success(crew, 'Members added successfully');
  }

  @Delete(':id/members/:technicianId')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Remove a technician from a crew (cannot remove current leader)' })
  async removeMember(
    @Param('id') id: string,
    @Param('technicianId') technicianId: string,
    @TenantId() tenantId: string,
  ) {
    const crew = await this.crewsService.removeMember(id, tenantId, technicianId);
    return DataResponseDto.success(crew, 'Member removed successfully');
  }
}
