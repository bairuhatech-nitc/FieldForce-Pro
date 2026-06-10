import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { REPOSITORY } from '../shared/constants/keynames';
import { AttendanceLog } from './attendance_log.entity';
import { AttendancePunch } from './attendance_punch.entity';
import { User } from '../USERS/users.entity';
import { CheckInDto, CheckOutDto } from './dto/check_in.dto';
import { AdjustAttendanceDto } from './dto/adjust_attendance.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { PageDto } from '../shared/dto/page.dto';

const OVERTIME_THRESHOLD_HOURS = 8;

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(REPOSITORY.ATTENDANCE_LOGS)
    private readonly logRepo: typeof AttendanceLog,
    @Inject(REPOSITORY.ATTENDANCE_PUNCHES)
    private readonly punchRepo: typeof AttendancePunch,
  ) {}

  // ── Hours Calculation ─────────────────────────────────────────────────────

  private calcHours(punches: AttendancePunch[]): { regular: number; overtime: number } {
    let totalMinutes = 0;
    for (const p of punches) {
      if (p.punch_in_time && p.punch_out_time) {
        const diffMs = new Date(p.punch_out_time).getTime() - new Date(p.punch_in_time).getTime();
        totalMinutes += diffMs / 60000;
      }
    }
    const totalHours = totalMinutes / 60;
    const regular = Math.min(totalHours, OVERTIME_THRESHOLD_HOURS);
    const overtime = Math.max(0, totalHours - OVERTIME_THRESHOLD_HOURS);
    return {
      regular: Math.round(regular * 100) / 100,
      overtime: Math.round(overtime * 100) / 100,
    };
  }

  private deriveStatus(totalRegular: number, totalOvertime: number): 'present' | 'half_day' | 'absent' {
    const total = totalRegular + totalOvertime;
    if (total >= 4) return 'present';
    if (total > 0) return 'half_day';
    return 'absent';
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Technician self-service ────────────────────────────────────────────────

  async getMyToday(userId: string, tenantId: string): Promise<{
    log: AttendanceLog | null;
    active_punch: AttendancePunch | null;
  }> {
    const today = this.todayStr();
    const log = await this.logRepo.findOne({
      where: { user_id: userId, tenant_id: tenantId, date: today, is_deleted: false },
      include: [
        { model: AttendancePunch, as: 'punches', required: false },
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
      ],
      order: [[{ model: AttendancePunch, as: 'punches' }, 'punch_in_time', 'ASC']],
    });

    let active_punch: AttendancePunch | null = null;
    if (log) {
      active_punch = await this.punchRepo.findOne({
        where: { attendance_log_id: log.id, punch_out_time: null },
        order: [['punch_in_time', 'DESC']],
      });
    }

    return { log, active_punch };
  }

  async checkIn(userId: string, tenantId: string, dto: CheckInDto): Promise<AttendancePunch> {
    const today = this.todayStr();

    let log = await this.logRepo.findOne({
      where: { user_id: userId, tenant_id: tenantId, date: today, is_deleted: false },
    });

    if (!log) {
      log = await this.logRepo.create({
        tenant_id: tenantId,
        user_id: userId,
        date: today,
        status: 'present',
        total_regular_hours: 0,
        total_overtime_hours: 0,
        manager_adjusted: false,
        is_deleted: false,
      } as Partial<AttendanceLog>);
    }

    // Check for an already-open punch
    const openPunch = await this.punchRepo.findOne({
      where: { attendance_log_id: log.id, punch_out_time: null },
    });
    if (openPunch) {
      throw new BadRequestException('You are already checked in. Please check out first.');
    }

    const punch = await this.punchRepo.create({
      attendance_log_id: log.id,
      punch_in_time: new Date(),
      punch_in_location: dto.location ?? null,
      device_info: dto.device_info ?? null,
    } as Partial<AttendancePunch>);

    return punch;
  }

  async checkOut(userId: string, tenantId: string, dto: CheckOutDto): Promise<AttendancePunch> {
    const today = this.todayStr();

    const log = await this.logRepo.findOne({
      where: { user_id: userId, tenant_id: tenantId, date: today, is_deleted: false },
    });
    if (!log) {
      throw new BadRequestException('No attendance log found for today. Please check in first.');
    }

    const openPunch = await this.punchRepo.findOne({
      where: { attendance_log_id: log.id, punch_out_time: null },
      order: [['punch_in_time', 'DESC']],
    });
    if (!openPunch) {
      throw new BadRequestException('No active check-in found. Please check in first.');
    }

    openPunch.punch_out_time = new Date();
    openPunch.punch_out_location = dto.location ?? null;
    await openPunch.save();

    // Recalculate hours
    const allPunches = await this.punchRepo.findAll({
      where: { attendance_log_id: log.id },
    });
    const { regular, overtime } = this.calcHours(allPunches);
    log.total_regular_hours = regular;
    log.total_overtime_hours = overtime;
    log.status = this.deriveStatus(regular, overtime);
    await log.save();

    return openPunch;
  }

  // ── Manager list/detail ───────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
    filters?: {
      user_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<PageDto<AttendanceLog>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (filters?.user_id) where['user_id'] = filters.user_id;
    if (filters?.status) where['status'] = filters.status;

    if (filters?.date_from || filters?.date_to) {
      const dateRange: Record<string, unknown> = {};
      if (filters.date_from) dateRange[Op.gte as unknown as string] = filters.date_from;
      if (filters.date_to) dateRange[Op.lte as unknown as string] = filters.date_to;
      where['date'] = dateRange;
    }

    const { count, rows } = await this.logRepo.findAndCountAll({
      where,
      order: [['date', 'DESC']],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
          required: false,
        },
        {
          model: User,
          as: 'adjusted_by_user',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
        {
          model: AttendancePunch,
          as: 'punches',
          required: false,
        },
      ],
      distinct: true,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findById(id: string, tenantId: string): Promise<AttendanceLog> {
    const log = await this.logRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
        },
        {
          model: User,
          as: 'adjusted_by_user',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
        {
          model: AttendancePunch,
          as: 'punches',
          required: false,
        },
      ],
      order: [[{ model: AttendancePunch, as: 'punches' }, 'punch_in_time', 'ASC']],
    });
    if (!log) throw new NotFoundException('Attendance log not found');
    return log;
  }

  // ── Manager override ──────────────────────────────────────────────────────

  async adjust(
    id: string,
    tenantId: string,
    managerId: string,
    dto: AdjustAttendanceDto,
  ): Promise<AttendanceLog> {
    const log = await this.findById(id, tenantId);

    if (dto.punch_id) {
      // Adjust an existing punch
      const punch = await this.punchRepo.findOne({
        where: { id: dto.punch_id, attendance_log_id: log.id },
      });
      if (!punch) throw new NotFoundException('Punch record not found');
      if (dto.punch_in_time) punch.punch_in_time = new Date(dto.punch_in_time);
      if (dto.punch_out_time) punch.punch_out_time = new Date(dto.punch_out_time);
      await punch.save();
    } else if (dto.punch_in_time) {
      // Create a new corrected punch entry
      await this.punchRepo.create({
        attendance_log_id: log.id,
        punch_in_time: new Date(dto.punch_in_time),
        punch_out_time: dto.punch_out_time ? new Date(dto.punch_out_time) : null,
        device_info: 'Manager Adjustment',
      } as Partial<AttendancePunch>);
    }

    // Recalculate hours from all punches
    const allPunches = await this.punchRepo.findAll({ where: { attendance_log_id: log.id } });
    const { regular, overtime } = this.calcHours(allPunches);

    log.total_regular_hours = regular;
    log.total_overtime_hours = overtime;
    log.manager_adjusted = true;
    log.adjustment_reason = dto.adjustment_reason;
    log.adjusted_by = managerId;
    if (dto.status) log.status = dto.status;
    else log.status = this.deriveStatus(regular, overtime);

    await log.save();
    return this.findById(id, tenantId);
  }

  // ── Weekly timesheet roll-up ──────────────────────────────────────────────

  async getWeeklyTimesheet(
    tenantId: string,
    weekStart: string,
    weekEnd: string,
    userId?: string,
  ): Promise<AttendanceLog[]> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
      date: { [Op.between]: [weekStart, weekEnd] },
    };
    if (userId) where['user_id'] = userId;

    return this.logRepo.findAll({
      where,
      order: [['date', 'ASC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: AttendancePunch, as: 'punches', required: false },
      ],
    });
  }
}
