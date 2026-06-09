import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { User } from '../USERS/users.entity';
import { Crew } from '../CREWS/crews.entity';
import { EquipmentCategory } from './equipment_category.entity';
import { EquipmentHistory } from './equipment_history.entity';

export type EquipmentStatus = 'available' | 'assigned' | 'in_maintenance' | 'retired';

@Table({ tableName: 'equipment', timestamps: true, underscored: true })
export class Equipment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenant_id: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Column({ type: DataType.STRING(200), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @ForeignKey(() => EquipmentCategory)
  @Column({ type: DataType.UUID, allowNull: true })
  equipment_category_id: string;

  @BelongsTo(() => EquipmentCategory)
  category: EquipmentCategory;

  @Column({ type: DataType.STRING(200), allowNull: true })
  serial_number: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  barcode: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  manufacturer: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  model_number: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  purchase_date: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  last_maintenance_date: string;

  @Default('available')
  @Column({ type: DataType.STRING(30), allowNull: false })
  status: EquipmentStatus;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true, comment: 'Currently assigned technician' })
  assigned_technician_id: string;

  @BelongsTo(() => User, 'assigned_technician_id')
  assigned_technician: User;

  @ForeignKey(() => Crew)
  @Column({ type: DataType.UUID, allowNull: true, comment: 'Currently assigned crew' })
  assigned_crew_id: string;

  @BelongsTo(() => Crew, 'assigned_crew_id')
  assigned_crew: Crew;

  @Column({ type: DataType.DATE, allowNull: true, comment: 'Expected return date when assigned' })
  expected_return_date: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.JSONB, allowNull: true, defaultValue: {} })
  custom_fields: Record<string, unknown>;

  @Default(false)
  @Column(DataType.BOOLEAN)
  is_deleted: boolean;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @HasMany(() => EquipmentHistory)
  history: EquipmentHistory[];
}
