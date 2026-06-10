import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { REPOSITORY } from '../shared/constants/keynames';
import { Crew } from './crews.entity';
import { CrewMember } from './crew_members.entity';
import { CrewSkill } from './crew_skills.entity';
import { CrewEquipment } from './crew_equipment.entity';
import { User } from '../USERS/users.entity';
import { Category } from '../CATEGORIES/categories.entity';
import { Asset } from '../ASSETS/assets.entity';
import { CreateCrewDto } from './dto/create_crew.dto';
import { UpdateCrewDto } from './dto/update_crew.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { PageDto } from '../shared/dto/page.dto';

@Injectable()
export class CrewsService {
  constructor(
    @Inject(REPOSITORY.CREWS)
    private readonly crewRepo: typeof Crew,
    @Inject(REPOSITORY.CREW_MEMBERS)
    private readonly crewMemberRepo: typeof CrewMember,
    @Inject(REPOSITORY.CREW_SKILLS)
    private readonly crewSkillRepo: typeof CrewSkill,
    @Inject(REPOSITORY.CREW_EQUIPMENT)
    private readonly crewEquipmentRepo: typeof CrewEquipment,
  ) {}

  async findAll(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
    filters?: { territory_id?: string; shift_id?: string; is_active?: boolean },
  ): Promise<PageDto<Crew>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (filters?.territory_id) where['territory_ids'] = { [Op.contains]: [filters.territory_id] };
    if (filters?.shift_id) where['shift_id'] = filters.shift_id;
    if (filters?.is_active !== undefined) where['is_active'] = filters.is_active;

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.crewRepo.findAndCountAll({
      where,
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      distinct: true,
      include: [
        {
          model: User,
          as: 'crew_leader',
          attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'],
          required: false,
        },
        {
          model: CrewMember,
          where: { is_deleted: false },
          required: false,
          include: [
            {
              model: User,
              as: 'technician',
              attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar_url'],
            },
          ],
        },
      ],
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findById(id: string, tenantId: string): Promise<Crew> {
    const crew = await this.crewRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
      include: [
        {
          model: User,
          as: 'crew_leader',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar_url'],
          required: false,
        },
        {
          model: CrewMember,
          where: { is_deleted: false },
          required: false,
          include: [
            {
              model: User,
              as: 'technician',
              attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar_url'],
            },
          ],
        },
        {
          model: CrewSkill,
          required: false,
          include: [
            {
              model: Category,
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: CrewEquipment,
          required: false,
          include: [
            {
              model: Asset,
              attributes: ['id', 'name', 'model', 'serial_number', 'category'],
            },
          ],
        },
      ],
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found`);
    }

    return crew;
  }

  async create(tenantId: string, dto: CreateCrewDto): Promise<Crew> {
    const { member_ids = [], skill_ids = [], equipment_ids = [], crew_leader_id, ...crewData } = dto;

    if (crew_leader_id && member_ids.length > 0 && !member_ids.includes(crew_leader_id)) {
      throw new BadRequestException('Crew leader must be one of the crew members');
    }

    const crew = await this.crewRepo.create({
      ...crewData,
      crew_leader_id: crew_leader_id || null,
      tenant_id: tenantId,
    });

    if (member_ids.length > 0) {
      await this.crewMemberRepo.bulkCreate(
        member_ids.map((technicianId) => ({
          crew_id: crew.id,
          tenant_id: tenantId,
          technician_id: technicianId,
        })),
      );
    }

    if (skill_ids.length > 0) {
      await this.crewSkillRepo.bulkCreate(
        skill_ids.map((categoryId) => ({
          crew_id: crew.id,
          category_id: categoryId,
        })),
      );
    }

    if (equipment_ids.length > 0) {
      await this.crewEquipmentRepo.bulkCreate(
        equipment_ids.map((assetId) => ({
          crew_id: crew.id,
          asset_id: assetId,
        })),
      );
    }

    return this.findById(crew.id, tenantId);
  }

  async update(id: string, tenantId: string, dto: UpdateCrewDto): Promise<Crew> {
    const crew = await this.crewRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found`);
    }

    const { member_ids, skill_ids, equipment_ids, crew_leader_id, ...crewData } = dto;

    if (crew_leader_id !== undefined) {
      const currentMembers = await this.crewMemberRepo.findAll({
        where: { crew_id: id, is_deleted: false },
      });
      const memberIdsToCheck = member_ids ?? currentMembers.map((m) => m.technician_id);
      if (crew_leader_id && !memberIdsToCheck.includes(crew_leader_id)) {
        throw new BadRequestException('Crew leader must be one of the crew members');
      }
    }

    await crew.update({ ...crewData, crew_leader_id });

    if (member_ids !== undefined) {
      await this.crewMemberRepo.update({ is_deleted: true }, { where: { crew_id: id } });
      if (member_ids.length > 0) {
        for (const technicianId of member_ids) {
          await this.crewMemberRepo.findOrCreate({
            where: { crew_id: id, technician_id: technicianId },
            defaults: { crew_id: id, tenant_id: tenantId, technician_id: technicianId, is_deleted: false },
          });
          await this.crewMemberRepo.update(
            { is_deleted: false },
            { where: { crew_id: id, technician_id: technicianId } },
          );
        }
      }
    }

    if (skill_ids !== undefined) {
      await this.crewSkillRepo.destroy({ where: { crew_id: id } });
      if (skill_ids.length > 0) {
        await this.crewSkillRepo.bulkCreate(
          skill_ids.map((categoryId) => ({ crew_id: id, category_id: categoryId })),
        );
      }
    }

    if (equipment_ids !== undefined) {
      await this.crewEquipmentRepo.destroy({ where: { crew_id: id } });
      if (equipment_ids.length > 0) {
        await this.crewEquipmentRepo.bulkCreate(
          equipment_ids.map((assetId) => ({ crew_id: id, asset_id: assetId })),
        );
      }
    }

    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const crew = await this.crewRepo.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${id} not found`);
    }

    await crew.update({ is_deleted: true, is_active: false });
  }

  async addMembers(crewId: string, tenantId: string, technicianIds: string[]): Promise<Crew> {
    const crew = await this.crewRepo.findOne({
      where: { id: crewId, tenant_id: tenantId, is_deleted: false },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${crewId} not found`);
    }

    for (const technicianId of technicianIds) {
      await this.crewMemberRepo.findOrCreate({
        where: { crew_id: crewId, technician_id: technicianId },
        defaults: { crew_id: crewId, tenant_id: tenantId, technician_id: technicianId, is_deleted: false },
      });
      await this.crewMemberRepo.update(
        { is_deleted: false },
        { where: { crew_id: crewId, technician_id: technicianId } },
      );
    }

    return this.findById(crewId, tenantId);
  }

  async removeMember(crewId: string, tenantId: string, technicianId: string): Promise<Crew> {
    const crew = await this.crewRepo.findOne({
      where: { id: crewId, tenant_id: tenantId, is_deleted: false },
    });

    if (!crew) {
      throw new NotFoundException(`Crew with id ${crewId} not found`);
    }

    if (crew.crew_leader_id === technicianId) {
      throw new BadRequestException(
        'Cannot remove the crew leader. Please assign a new leader before removing this member.',
      );
    }

    await this.crewMemberRepo.update(
      { is_deleted: true },
      { where: { crew_id: crewId, technician_id: technicianId } },
    );

    return this.findById(crewId, tenantId);
  }

  async getCrewsForDispatch(tenantId: string): Promise<Crew[]> {
    return this.crewRepo.findAll({
      where: { tenant_id: tenantId, is_deleted: false, is_active: true },
      attributes: ['id', 'name', 'territory_ids', 'shift_id', 'crew_leader_id'],
      include: [
        {
          model: User,
          as: 'crew_leader',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
        {
          model: CrewMember,
          where: { is_deleted: false },
          required: false,
          include: [
            {
              model: User,
              as: 'technician',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        },
        {
          model: CrewSkill,
          required: false,
          include: [{ model: Category, attributes: ['id', 'name'] }],
        },
      ],
      order: [['name', 'ASC']],
    });
  }
}
