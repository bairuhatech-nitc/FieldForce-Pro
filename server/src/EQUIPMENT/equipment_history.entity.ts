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
} from 'sequelize-typescript';
import { Equipment } from './equipment.entity';
import { User } from '../USERS/users.entity';
import { Crew } from '../CREWS/crews.entity';

export type EquipmentAction =
  | 'assigned'
  | 'returned'
  | 'sent_for_maintenance'
  | 'maintenance_completed'
  | 'retired'
  | 'created';

@Table({ tableName: 'equipment_history', timestamps: false, underscored: true })
export class EquipmentHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Equipment)
  @Column({ type: DataType.UUID, allowNull: false })
  equipment_id: string;

  @BelongsTo(() => Equipment)
  equipment: Equipment;

  @Column({ type: DataType.STRING(50), allowNull: false })
  action: EquipmentAction;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true, comment: 'Technician this was assigned to or returned from' })
  assigned_to_user_id: string;

  @BelongsTo(() => User, 'assigned_to_user_id')
  assigned_to_user: User;

  @ForeignKey(() => Crew)
  @Column({ type: DataType.UUID, allowNull: true, comment: 'Crew this was assigned to or returned from' })
  assigned_to_crew_id: string;

  @BelongsTo(() => Crew, 'assigned_to_crew_id')
  assigned_to_crew: Crew;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true, comment: 'User who performed this action' })
  performed_by_id: string;

  @BelongsTo(() => User, 'performed_by_id')
  performed_by: User;

  @Column({ type: DataType.DATE, allowNull: true })
  expected_return_date: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  action_date: Date;

  @CreatedAt
  created_at: Date;
}
