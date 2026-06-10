import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { User } from '../USERS/users.entity';
import { CrewMember } from './crew_members.entity';
import { CrewSkill } from './crew_skills.entity';
import { CrewEquipment } from './crew_equipment.entity';

@Table({ tableName: 'crews', timestamps: true, underscored: true })
export class Crew extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  crew_leader_id: string;

  @BelongsTo(() => User, 'crew_leader_id')
  crew_leader: User;

  @Default([])
  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true, comment: 'Territory IDs from settings' })
  territory_ids: string[];

  @Column({ type: DataType.STRING(100), allowNull: true, comment: 'Shift ID from settings' })
  shift_id: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  is_active: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @HasMany(() => CrewMember)
  members: CrewMember[];

  @HasMany(() => CrewSkill)
  skills: CrewSkill[];

  @HasMany(() => CrewEquipment)
  equipment: CrewEquipment[];
}
