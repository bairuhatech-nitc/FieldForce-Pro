import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { Crew } from './crews.entity';
import { User } from '../USERS/users.entity';

@Table({ tableName: 'crew_members', timestamps: true, underscored: true })
export class CrewMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id: string;

  @ForeignKey(() => Crew)
  @Column({ type: DataType.UUID, allowNull: false })
  crew_id: string;

  @BelongsTo(() => Crew)
  crew: Crew;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  technician_id: string;

  @BelongsTo(() => User, 'technician_id')
  technician: User;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
