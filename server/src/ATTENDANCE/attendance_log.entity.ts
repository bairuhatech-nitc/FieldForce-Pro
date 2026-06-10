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
import { AttendancePunch } from './attendance_punch.entity';

export type AttendanceStatus = 'present' | 'absent' | 'half_day';

@Table({ tableName: 'attendance_logs', timestamps: true, underscored: true })
export class AttendanceLog extends Model {
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

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;

  @Default('present')
  @Column(DataType.ENUM('present', 'absent', 'half_day'))
  status: AttendanceStatus;

  @Default(0)
  @Column(DataType.DECIMAL(6, 2))
  total_regular_hours: number;

  @Default(0)
  @Column(DataType.DECIMAL(6, 2))
  total_overtime_hours: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  manager_adjusted: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  adjustment_reason: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  adjusted_by: string;

  @BelongsTo(() => User, 'adjusted_by')
  adjusted_by_user: User;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @HasMany(() => AttendancePunch)
  punches: AttendancePunch[];

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
