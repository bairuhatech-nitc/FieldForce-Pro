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
import { AttendanceLog } from './attendance_log.entity';

@Table({ tableName: 'attendance_punches', timestamps: true, underscored: true })
export class AttendancePunch extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => AttendanceLog)
  @Column({ type: DataType.UUID, allowNull: false })
  attendance_log_id: string;

  @BelongsTo(() => AttendanceLog)
  attendance_log: AttendanceLog;

  @Column({ type: DataType.DATE, allowNull: false })
  punch_in_time: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  punch_out_time: Date;

  @Column({ type: DataType.JSONB, allowNull: true })
  punch_in_location: { lat: number; lng: number } | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  punch_out_location: { lat: number; lng: number } | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  device_info: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
