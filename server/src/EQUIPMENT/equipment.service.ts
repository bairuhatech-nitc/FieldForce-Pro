import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { REPOSITORY } from '../shared/constants/keynames';
import { Equipment, EquipmentStatus } from './equipment.entity';
import { EquipmentHistory } from './equipment_history.entity';
import { EquipmentCategory } from './equipment_category.entity';
import { User } from '../USERS/users.entity';
import { Crew } from '../CREWS/crews.entity';
import { CreateEquipmentDto } from './dto/create_equipment.dto';
import { UpdateEquipmentDto } from './dto/update_equipment.dto';
import {
  AssignEquipmentDto,
  MaintenanceEquipmentDto,
  ReturnEquipmentDto,
  CreateEquipmentCategoryDto,
} from './dto/assign_equipment.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { PageDto } from '../shared/dto/page.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @Inject(REPOSITORY.EQUIPMENT)
    private readonly equipmentRepo: typeof Equipment,
    @Inject(REPOSITORY.EQUIPMENT_HISTORY)
    private readonly historyRepo: typeof EquipmentHistory,
    @Inject(REPOSITORY.EQUIPMENT_CATEGORIES)
    private readonly categoryRepo: typeof EquipmentCategory,
  ) {}

  private get baseIncludes() {
    return [
      {
        model: EquipmentCategory,
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: User,
        as: 'assigned_technician',
        attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
        required: false,
      },
      {
        model: Crew,
        as: 'assigned_crew',
        attributes: ['id', 'name'],
        required: false,
      },
    ];
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async findAllCategories(tenantId: string): Promise<EquipmentCategory[]> {
    return this.categoryRepo.findAll({
      where: { tenant_id: tenantId, is_deleted: false },
      order: [['name', 'ASC']],
    });
  }

  async createCategory(tenantId: string, dto: CreateEquipmentCategoryDto): Promise<EquipmentCategory> {
    return this.categoryRepo.create({ ...dto, tenant_id: tenantId });
  }

  async deleteCategory(id: string, tenantId: string): Promise<void> {
    await this.categoryRepo.update({ is_deleted: true }, { where: { id, tenant_id: tenantId } });
  }

  // ── Equipment CRUD ────────────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
    filters?: { status?: string; equipment_category_id?: string; assigned_to?: string },
  ): Promise<PageDto<Equipment>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (filters?.status) where['status'] = filters.status;
    if (filters?.equipment_category_id) where['equipment_category_id'] = filters.equipment_category_id;
    if (filters?.assigned_to) {
      where[Op.or as unknown as string] = [
        { assigned_technician_id: filters.assigned_to },
        { assigned_crew_id: filters.assigned_to },
      ];
    }

    if (pageOptionsDto.search) {
      const searchOr = [
        { name: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { serial_number: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { barcode: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { manufacturer: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { model_number: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
      if (filters?.status) {
        where[Op.and as unknown as string] = [
          { [Op.or]: searchOr },
        ];
        delete where[Op.or as unknown as string];
      } else {
        where[Op.or as unknown as string] = searchOr;
      }
    }

    const { count, rows } = await this.equipmentRepo.findAndCountAll({
      where,
      include: this.baseIncludes,
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      distinct: true,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findById(id: string, tenantId: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
      include: [
        ...this.baseIncludes,
        {
          model: EquipmentHistory,
          order: [['action_date', 'DESC']],
          required: false,
          include: [
            {
              model: User,
              as: 'assigned_to_user',
              attributes: ['id', 'first_name', 'last_name', 'email'],
              required: false,
            },
            {
              model: Crew,
              as: 'assigned_to_crew',
              attributes: ['id', 'name'],
              required: false,
            },
            {
              model: User,
              as: 'performed_by',
              attributes: ['id', 'first_name', 'last_name'],
              required: false,
            },
          ],
        },
      ],
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with id ${id} not found`);
    }

    return equipment;
  }

  async create(tenantId: string, userId: string, dto: CreateEquipmentDto): Promise<Equipment> {
    const equipment = await this.equipmentRepo.create({
      ...dto,
      tenant_id: tenantId,
      status: 'available' as EquipmentStatus,
    });

    await this.historyRepo.create({
      equipment_id: equipment.id,
      action: 'created',
      performed_by_id: userId,
      notes: 'Equipment added to registry',
      action_date: new Date(),
    });

    return this.findById(equipment.id, tenantId);
  }

  async update(id: string, tenantId: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    await equipment.update(dto);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    await equipment.update({ is_deleted: true, status: 'retired' as EquipmentStatus });

    await this.historyRepo.create({
      equipment_id: id,
      action: 'retired',
      performed_by_id: userId,
      notes: 'Equipment retired and removed from registry',
      action_date: new Date(),
    });
  }

  // ── Assignment lifecycle ──────────────────────────────────────────────────

  async assign(id: string, tenantId: string, userId: string, dto: AssignEquipmentDto): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    if (equipment.status === 'retired') {
      throw new BadRequestException('Cannot assign retired equipment');
    }

    if (equipment.status === 'in_maintenance') {
      throw new BadRequestException('Cannot assign equipment that is currently in maintenance');
    }

    if (!dto.technician_id && !dto.crew_id) {
      throw new BadRequestException('Must specify either a technician_id or crew_id to assign');
    }

    await equipment.update({
      status: 'assigned' as EquipmentStatus,
      assigned_technician_id: dto.technician_id ?? null,
      assigned_crew_id: dto.crew_id ?? null,
      expected_return_date: dto.expected_return_date ? new Date(dto.expected_return_date) : null,
    });

    await this.historyRepo.create({
      equipment_id: id,
      action: 'assigned',
      assigned_to_user_id: dto.technician_id ?? null,
      assigned_to_crew_id: dto.crew_id ?? null,
      performed_by_id: userId,
      expected_return_date: dto.expected_return_date ? new Date(dto.expected_return_date) : null,
      notes: dto.notes ?? null,
      action_date: new Date(),
    });

    return this.findById(id, tenantId);
  }

  async return(id: string, tenantId: string, userId: string, dto: ReturnEquipmentDto): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    if (equipment.status !== 'assigned') {
      throw new BadRequestException('Equipment is not currently assigned');
    }

    const prevTechnicianId = equipment.assigned_technician_id;
    const prevCrewId = equipment.assigned_crew_id;

    await equipment.update({
      status: 'available' as EquipmentStatus,
      assigned_technician_id: null,
      assigned_crew_id: null,
      expected_return_date: null,
    });

    await this.historyRepo.create({
      equipment_id: id,
      action: 'returned',
      assigned_to_user_id: prevTechnicianId ?? null,
      assigned_to_crew_id: prevCrewId ?? null,
      performed_by_id: userId,
      notes: dto.notes ?? null,
      action_date: new Date(),
    });

    return this.findById(id, tenantId);
  }

  async sendToMaintenance(
    id: string,
    tenantId: string,
    userId: string,
    dto: MaintenanceEquipmentDto,
  ): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    if (equipment.status === 'retired') {
      throw new BadRequestException('Cannot send retired equipment for maintenance');
    }

    const prevTechnicianId = equipment.assigned_technician_id;
    const prevCrewId = equipment.assigned_crew_id;

    await equipment.update({
      status: 'in_maintenance' as EquipmentStatus,
      assigned_technician_id: null,
      assigned_crew_id: null,
      expected_return_date: null,
    });

    await this.historyRepo.create({
      equipment_id: id,
      action: 'sent_for_maintenance',
      assigned_to_user_id: prevTechnicianId ?? null,
      assigned_to_crew_id: prevCrewId ?? null,
      performed_by_id: userId,
      expected_return_date: dto.expected_return_date ? new Date(dto.expected_return_date) : null,
      notes: dto.notes ?? null,
      action_date: new Date(),
    });

    return this.findById(id, tenantId);
  }

  async completeMaintenance(id: string, tenantId: string, userId: string, notes?: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!equipment) throw new NotFoundException(`Equipment with id ${id} not found`);

    if (equipment.status !== 'in_maintenance') {
      throw new BadRequestException('Equipment is not currently in maintenance');
    }

    await equipment.update({
      status: 'available' as EquipmentStatus,
      last_maintenance_date: new Date().toISOString().slice(0, 10),
    });

    await this.historyRepo.create({
      equipment_id: id,
      action: 'maintenance_completed',
      performed_by_id: userId,
      notes: notes ?? 'Maintenance completed',
      action_date: new Date(),
    });

    return this.findById(id, tenantId);
  }

  async getEquipmentForTechnicianOrCrew(tenantId: string, assigneeId: string): Promise<Equipment[]> {
    return this.equipmentRepo.findAll({
      where: {
        tenant_id: tenantId,
        is_deleted: false,
        [Op.or]: [
          { assigned_technician_id: assigneeId },
          { assigned_crew_id: assigneeId },
        ],
      },
      include: this.baseIncludes,
      order: [['name', 'ASC']],
    });
  }
}
