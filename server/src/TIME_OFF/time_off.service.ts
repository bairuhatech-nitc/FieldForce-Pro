import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { REPOSITORY } from '../shared/constants/keynames';
import { TimeOffRequest } from './time_off_requests.entity';
import { TimeOffBalance } from './time_off_balances.entity';
import { User } from '../USERS/users.entity';
import { CreateTimeOffRequestDto } from './dto/create_time_off_request.dto';
import { UpdateTimeOffStatusDto } from './dto/update_time_off_status.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { PageDto } from '../shared/dto/page.dto';

const DEFAULT_ALLOWANCES: Record<string, number> = {
  vacation: 14,
  sick: 7,
  personal: 3,
};

@Injectable()
export class TimeOffService {
  constructor(
    @Inject(REPOSITORY.TIME_OFF_REQUESTS)
    private readonly requestRepo: typeof TimeOffRequest,
    @Inject(REPOSITORY.TIME_OFF_BALANCES)
    private readonly balanceRepo: typeof TimeOffBalance,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calcDaysDeducted(dto: CreateTimeOffRequestDto): number {
    if (dto.duration_type === 'morning_half' || dto.duration_type === 'afternoon_half') return 0.5;
    if (dto.duration_type === 'full_day') return 1;
    // multi_day: count calendar days inclusive
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }

  // ── Balance helpers ───────────────────────────────────────────────────────

  async ensureBalances(userId: string, tenantId: string, year: number): Promise<TimeOffBalance[]> {
    const existing = await this.balanceRepo.findAll({
      where: { user_id: userId, tenant_id: tenantId, year, is_deleted: false },
    });

    const existingTypes = new Set(existing.map((b) => b.leave_type));
    const missing = (['vacation', 'sick', 'personal'] as const).filter((t) => !existingTypes.has(t));

    if (missing.length > 0) {
      await this.balanceRepo.bulkCreate(
        missing.map((leave_type) => ({
          tenant_id: tenantId,
          user_id: userId,
          leave_type,
          total_allowance: DEFAULT_ALLOWANCES[leave_type],
          used_days: 0,
          year,
          is_deleted: false,
        })),
      );
      return this.balanceRepo.findAll({
        where: { user_id: userId, tenant_id: tenantId, year, is_deleted: false },
      });
    }

    return existing;
  }

  async getBalances(userId: string, tenantId: string, year?: number): Promise<TimeOffBalance[]> {
    const y = year ?? this.currentYear();
    return this.ensureBalances(userId, tenantId, y);
  }

  // ── Conflict detection ────────────────────────────────────────────────────

  async getConflicts(
    tenantId: string,
    startDate: string,
    endDate: string,
    excludeUserId?: string,
  ): Promise<TimeOffRequest[]> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      status: 'approved',
      is_deleted: false,
      start_date: { [Op.lte]: endDate },
      end_date: { [Op.gte]: startDate },
    };
    if (excludeUserId) where['user_id'] = { [Op.ne]: excludeUserId };

    return this.requestRepo.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
      ],
    });
  }

  /** Returns true if the given user has any approved time-off covering the given date range. */
  async isOnLeave(userId: string, tenantId: string, startDate: string, endDate: string): Promise<boolean> {
    const count = await this.requestRepo.count({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        status: 'approved',
        is_deleted: false,
        start_date: { [Op.lte]: endDate },
        end_date: { [Op.gte]: startDate },
      },
    });
    return count > 0;
  }

  /** For dispatch board: returns set of user_ids on approved leave for a date. */
  async getLeaveBlocksForDate(tenantId: string, date: string): Promise<TimeOffRequest[]> {
    return this.requestRepo.findAll({
      where: {
        tenant_id: tenantId,
        status: 'approved',
        is_deleted: false,
        start_date: { [Op.lte]: date },
        end_date: { [Op.gte]: date },
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
      ],
    });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
    filters?: {
      user_id?: string;
      status?: string;
      leave_type?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<PageDto<TimeOffRequest>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (filters?.user_id) where['user_id'] = filters.user_id;
    if (filters?.status) where['status'] = filters.status;
    if (filters?.leave_type) where['leave_type'] = filters.leave_type;

    if (filters?.date_from || filters?.date_to) {
      const range: Record<string, unknown> = {};
      if (filters.date_from) range[Op.gte as unknown as string] = filters.date_from;
      if (filters.date_to) range[Op.lte as unknown as string] = filters.date_to;
      where['start_date'] = range;
    }

    const { count, rows } = await this.requestRepo.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
        { model: User, as: 'approved_by_user', attributes: ['id', 'first_name', 'last_name'], required: false },
      ],
      distinct: true,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findById(id: string, tenantId: string): Promise<TimeOffRequest> {
    const req = await this.requestRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
        { model: User, as: 'approved_by_user', attributes: ['id', 'first_name', 'last_name'], required: false },
      ],
    });
    if (!req) throw new NotFoundException('Time-off request not found');
    return req;
  }

  async create(userId: string, tenantId: string, dto: CreateTimeOffRequestDto): Promise<TimeOffRequest> {
    const days = this.calcDaysDeducted(dto);

    if (new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new BadRequestException('End date cannot be before start date');
    }

    // Balance check for tracked leave types
    if (['vacation', 'sick', 'personal'].includes(dto.leave_type)) {
      const year = new Date(dto.start_date).getFullYear();
      const balances = await this.ensureBalances(userId, tenantId, year);
      const bal = balances.find((b) => b.leave_type === (dto.leave_type as 'vacation' | 'sick' | 'personal'));
      if (bal) {
        const remaining = bal.total_allowance - Number(bal.used_days);
        if (days > remaining) {
          throw new BadRequestException(
            `Insufficient ${dto.leave_type} balance. Requested: ${days} days, Remaining: ${remaining.toFixed(1)} days.`,
          );
        }
      }
    }

    const request = await this.requestRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      leave_type: dto.leave_type,
      start_date: dto.start_date,
      end_date: dto.end_date,
      duration_type: dto.duration_type,
      total_days_deducted: days,
      status: 'pending',
      reason: dto.reason ?? null,
      is_deleted: false,
    } as Partial<TimeOffRequest>);

    return this.findById(request.id, tenantId);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    managerId: string,
    dto: UpdateTimeOffStatusDto,
  ): Promise<TimeOffRequest> {
    const req = await this.findById(id, tenantId);

    if (req.status !== 'pending') {
      throw new BadRequestException(`Cannot update a request that is already ${req.status}`);
    }

    req.status = dto.status;
    req.approved_by = managerId;
    req.manager_notes = dto.manager_notes ?? null;
    await req.save();

    // If approved, deduct from balance
    if (dto.status === 'approved' && ['vacation', 'sick', 'personal'].includes(req.leave_type)) {
      const year = new Date(req.start_date).getFullYear();
      const balances = await this.ensureBalances(req.user_id, tenantId, year);
      const bal = balances.find((b) => b.leave_type === (req.leave_type as 'vacation' | 'sick' | 'personal'));
      if (bal) {
        bal.used_days = Number(bal.used_days) + Number(req.total_days_deducted);
        await bal.save();
      }
    }

    return this.findById(id, tenantId);
  }

  async cancel(id: string, userId: string, tenantId: string): Promise<void> {
    const req = await this.findById(id, tenantId);

    if (req.user_id !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }
    if (req.status === 'approved') {
      throw new BadRequestException('Cannot cancel an already-approved request. Contact your manager.');
    }
    if (req.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel a request with status: ${req.status}`);
    }

    req.status = 'cancelled';
    await req.save();
  }
}
