import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { Contact } from '../CONTACTS/contacts.entity';
import { EstimateLineItem } from '../ESTIMATE_LINE_ITEMS/estimate_line_items.entity';

@Table({
  tableName: 'estimates',
  timestamps: true,
  underscored: true,
})
export class Estimate extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tenant_id: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Reference to service request (no formal FK)',
  })
  request_id: string;

  @ForeignKey(() => Contact)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  contact_id: string;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Auto-generated estimate number',
  })
  estimate_number: string;

  @Column({
    type: DataType.ENUM('draft', 'sent', 'viewed', 'approved', 'rejected', 'expired', 'converted_to_wo'),
    allowNull: false,
    defaultValue: 'draft',
  })
  status: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  subtotal: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  tax: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discount: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  total: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  expiry_date: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  scheduled_start: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  scheduled_end: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  signature_url: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    unique: true,
  })
  public_token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  public_token_expires_at: Date;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User ID of the assigned estimate creator',
  })
  created_by: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  custom_fields: Record<string, unknown>;

  @HasMany(() => EstimateLineItem, { foreignKey: 'estimate_id', as: 'line_items' })
  line_items: EstimateLineItem[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_deleted: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updated_at: Date;
}
