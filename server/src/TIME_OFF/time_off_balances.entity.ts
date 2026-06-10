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
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { User } from '../USERS/users.entity';

export type LeaveType = 'vacation' | 'sick' | 'personal';

@Table({ tableName: 'time_off_balances', timestamps: true, underscored: true })
export class TimeOffBalance extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @Column(DataType.ENUM('vacation', 'sick', 'personal'))
  leave_type: LeaveType;

  @Default(0)
  @Column(DataType.INTEGER)
  total_allowance: number;

  @Default(0)
  @Column(DataType.DECIMAL(6, 2))
  used_days: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  year: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
