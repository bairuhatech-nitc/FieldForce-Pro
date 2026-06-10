import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/check_in.dto';
import { AdjustAttendanceDto } from './dto/adjust_attendance.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { UserId } from '../shared/decorator/user.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── Self-service ──────────────────────────────────────────────────────────

  @Get('me/today')
  @ApiOperation({ summary: "Get the authenticated technician's attendance status for today" })
  async getMyToday(@UserId() userId: string, @TenantId() tenantId: string) {
    const result = await this.attendanceService.getMyToday(userId, tenantId);
    return DataResponseDto.success(result, "Today's attendance fetched successfully");
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Technician check-in — records GPS location and device info' })
  async checkIn(
    @UserId() userId: string,
    @TenantId() tenantId: string,
    @Body() dto: CheckInDto,
  ) {
    const punch = await this.attendanceService.checkIn(userId, tenantId, dto);
    return DataResponseDto.created(punch, 'Checked in successfully');
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Technician check-out — closes active punch and recalculates hours' })
  async checkOut(
    @UserId() userId: string,
    @TenantId() tenantId: string,
    @Body() dto: CheckOutDto,
  ) {
    const punch = await this.attendanceService.checkOut(userId, tenantId, dto);
    return DataResponseDto.success(punch, 'Checked out successfully');
  }

  // ── Manager views ─────────────────────────────────────────────────────────

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all attendance logs (manager view, paginated)' })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  async findAll(
    @TenantId() tenantId: string,
    @Query() pageOptionsDto: PageOptionsDto,
    @Query('user_id') user_id?: string,
    @Query('status') status?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ) {
    const result = await this.attendanceService.findAll(tenantId, pageOptionsDto, {
      user_id,
      status,
      date_from,
      date_to,
    });
    return DataResponseDto.success(result.data, 'Attendance logs fetched successfully', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get('timesheet')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Weekly timesheet roll-up for payroll reporting' })
  @ApiQuery({ name: 'week_start', required: true })
  @ApiQuery({ name: 'week_end', required: true })
  @ApiQuery({ name: 'user_id', required: false })
  async getWeeklyTimesheet(
    @TenantId() tenantId: string,
    @Query('week_start') weekStart: string,
    @Query('week_end') weekEnd: string,
    @Query('user_id') userId?: string,
  ) {
    const rows = await this.attendanceService.getWeeklyTimesheet(tenantId, weekStart, weekEnd, userId);
    return DataResponseDto.success(rows, 'Weekly timesheet fetched successfully');
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get a daily attendance log with all punch segments' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const log = await this.attendanceService.findById(id, tenantId);
    return DataResponseDto.success(log, 'Attendance log fetched successfully');
  }

  @Put(':id/adjust')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Manager override — edit punches and leave audit trail' })
  async adjust(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @UserId() managerId: string,
    @Body() dto: AdjustAttendanceDto,
  ) {
    const log = await this.attendanceService.adjust(id, tenantId, managerId, dto);
    return DataResponseDto.success(log, 'Attendance adjusted successfully');
  }
}
