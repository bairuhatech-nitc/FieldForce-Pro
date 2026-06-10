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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TimeOffService } from './time_off.service';
import { CreateTimeOffRequestDto } from './dto/create_time_off_request.dto';
import { UpdateTimeOffStatusDto } from './dto/update_time_off_status.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { UserId } from '../shared/decorator/user.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Time Off')
@ApiBearerAuth()
@Controller('time-off')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  // ── Self-service: request & balance ──────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Submit a new time-off request' })
  async create(
    @UserId() userId: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateTimeOffRequestDto,
  ) {
    const result = await this.timeOffService.create(userId, tenantId, dto);
    return DataResponseDto.created(result, 'Time-off request submitted');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending time-off request (own requests only)' })
  async cancel(
    @Param('id') id: string,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ) {
    await this.timeOffService.cancel(id, userId, tenantId);
    return DataResponseDto.success(null, 'Request cancelled');
  }

  // ── Manager: list, approve/reject ────────────────────────────────────────

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List time-off requests (manager view, paginated)' })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'leave_type', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  async findAll(
    @TenantId() tenantId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('user_id') user_id?: string,
    @Query('status') status?: string,
    @Query('leave_type') leave_type?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    const result = await this.timeOffService.findAll(tenantId, pageOptionsDto, {
      user_id,
      status,
      leave_type,
      date_from,
      date_to,
    });
    return DataResponseDto.success(result.data, 'Requests fetched', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get('balances/:userId')
  @Permissions('users:read')
  @ApiOperation({ summary: "Get a user's leave balances for the year" })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getBalances(
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
    @Query('year') year?: string,
  ) {
    const balances = await this.timeOffService.getBalances(
      userId,
      tenantId,
      year ? Number(year) : undefined,
    );
    return DataResponseDto.success(balances, 'Balances fetched');
  }

  @Get('my-balances')
  @ApiOperation({ summary: "Get the authenticated user's own leave balances" })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getMyBalances(
    @UserId() userId: string,
    @TenantId() tenantId: string,
    @Query('year') year?: string,
  ) {
    const balances = await this.timeOffService.getBalances(
      userId,
      tenantId,
      year ? Number(year) : undefined,
    );
    return DataResponseDto.success(balances, 'Balances fetched');
  }

  @Get('conflicts')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Check who else is on approved leave for a date range' })
  @ApiQuery({ name: 'start_date', required: true })
  @ApiQuery({ name: 'end_date', required: true })
  @ApiQuery({ name: 'exclude_user_id', required: false })
  async getConflicts(
    @TenantId() tenantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('exclude_user_id') excludeUserId?: string,
  ) {
    const conflicts = await this.timeOffService.getConflicts(
      tenantId,
      startDate,
      endDate,
      excludeUserId,
    );
    return DataResponseDto.success(conflicts, 'Conflicts fetched');
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check if a specific user is on approved leave for a date range (dispatch board)' })
  @ApiQuery({ name: 'user_id', required: true })
  @ApiQuery({ name: 'start_date', required: true })
  @ApiQuery({ name: 'end_date', required: true })
  async isOnLeave(
    @TenantId() tenantId: string,
    @Query('user_id') userId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const onLeave = await this.timeOffService.isOnLeave(userId, tenantId, startDate, endDate);
    return DataResponseDto.success({ on_leave: onLeave }, 'Availability checked');
  }

  @Get('leave-blocks')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get all technicians on approved leave for a specific date (dispatch board)' })
  @ApiQuery({ name: 'date', required: true })
  async getLeaveBlocksForDate(
    @TenantId() tenantId: string,
    @Query('date') date: string,
  ) {
    const blocks = await this.timeOffService.getLeaveBlocksForDate(tenantId, date);
    return DataResponseDto.success(blocks, 'Leave blocks fetched');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single time-off request' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const result = await this.timeOffService.findById(id, tenantId);
    return DataResponseDto.success(result, 'Request fetched');
  }

  @Put(':id/status')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Approve or reject a time-off request' })
  async updateStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() managerId: string,
    @Body() dto: UpdateTimeOffStatusDto,
  ) {
    const result = await this.timeOffService.updateStatus(id, tenantId, managerId, dto);
    return DataResponseDto.success(result, `Request ${dto.status}`);
  }
}
