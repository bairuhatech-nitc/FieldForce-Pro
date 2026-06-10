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

export type TimeOffLeaveType = 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
export type TimeOffDurationType = 'full_day' | 'morning_half' | 'afternoon_half' | 'multi_day';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

@Table({ tableName: 'time_off_requests', timestamps: true, underscored: true })
export class TimeOffRequest extends Model {
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

  @Column(DataType.ENUM('vacation', 'sick', 'personal', 'unpaid', 'other'))
  leave_type: TimeOffLeaveType;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  start_date: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  end_date: string;

  @Column(DataType.ENUM('full_day', 'morning_half', 'afternoon_half', 'multi_day'))
  duration_type: TimeOffDurationType;

  @Default(1)
  @Column(DataType.DECIMAL(6, 2))
  total_days_deducted: number;

  @Default('pending')
  @Column(DataType.ENUM('pending', 'approved', 'rejected', 'cancelled'))
  status: TimeOffStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  reason: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  approved_by: string | null;

  @BelongsTo(() => User, 'approved_by')
  approved_by_user: User;

  @Column({ type: DataType.TEXT, allowNull: true })
  manager_notes: string | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
