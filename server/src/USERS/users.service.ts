import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { REPOSITORY } from '../shared/constants/keynames';
import { User } from './users.entity';
import { CreateUserDto } from './dto/users_create.dto';
import { UpdateUserDto } from './dto/users_update.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { PageDto } from '../shared/dto/page.dto';
import { Role } from '../ROLES/roles.entity';
import { Permission } from '../PERMISSIONS/permissions.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(REPOSITORY.USERS)
    private readonly userRepository: typeof User,
  ) {}

  async findAllPaginated(tenantId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<User>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { first_name: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { last_name: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { email: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.userRepository.findAndCountAll({
      where,
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      distinct: true,
      attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires'] },
      include: [
        {
          model: Role,
          through: { attributes: [] },
        },
      ],
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findAgents(tenantId: string): Promise<User[]> {
    return this.userRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false, is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email'],
      order: [['first_name', 'ASC']],
    });
  }

  async findAdmins(tenantId: string): Promise<User[]> {
    return this.userRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false, is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email'],
      include: [
        {
          model: Role,
          through: { attributes: [] },
          where: { name: { [Op.iLike]: '%admin%' } },
          required: true,
        },
      ],
      order: [['first_name', 'ASC']],
    });
  }

  async findAdminsAndDispatchers(tenantId: string): Promise<User[]> {
    return this.userRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false, is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email'],
      include: [
        {
          model: Role,
          through: { attributes: [] },
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: '%admin%' } },
              { name: { [Op.iLike]: '%dispatcher%' } },
            ],
          },
          required: true,
        },
      ],
      order: [['first_name', 'ASC']],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
      attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires'] },
      include: [
        {
          model: Role,
          through: { attributes: [] },
          include: [{ model: Permission, through: { attributes: [] } }],
        },
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, is_deleted: false },
      include: [
        {
          model: Role,
          through: { attributes: [] },
          include: [{ model: Permission, through: { attributes: [] } }],
        },
      ],
    });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, is_deleted: false },
    });
  }

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, tenant_id: tenantId, is_deleted: false },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepository.create({
      tenant_id: tenantId,
      email: dto.email,
      password_hash: passwordHash,
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      timezone: dto.timezone || 'UTC',
      language: dto.language || 'en',
    });

    // Return without password
    const { password_hash, ...result } = user.toJSON();
    return result as User;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await user.update(dto);

    const { password_hash, password_reset_token, password_reset_expires, ...result } =
      user.toJSON();
    return result as User;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await user.update({ is_deleted: true, is_active: false });
  }

  async activate(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await user.update({ is_active: true });
    return user;
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await user.update({ is_active: false });
    return user;
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, is_deleted: false },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await user.update({ avatar_url: avatarUrl });
    return user;
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await this.userRepository.findByPk(userId);
    if (user) {
      await user.update({
        failed_login_attempts: user.failed_login_attempts + 1,
      });
    }
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.userRepository.update(
      { failed_login_attempts: 0, locked_until: null },
      { where: { id: userId } },
    );
  }

  async lockAccount(userId: string, lockDurationMinutes: number): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes);
    await this.userRepository.update(
      { locked_until: lockedUntil },
      { where: { id: userId } },
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(
      { last_login_at: new Date() },
      { where: { id: userId } },
    );
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.update(
      {
        password_hash: newPasswordHash,
        password_changed_at: new Date(),
        password_reset_token: null,
        password_reset_expires: null,
      },
      { where: { id: userId } },
    );
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userRepository.update(
      { password_reset_token: token, password_reset_expires: expires },
      { where: { id: userId } },
    );
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: { [Op.gt]: new Date() },
        is_deleted: false,
      },
    });
  }
}
