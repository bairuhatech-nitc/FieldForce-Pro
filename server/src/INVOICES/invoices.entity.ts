import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { Contact } from '../CONTACTS/contacts.entity';

@Table({
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
})
export class Invoice extends Model {
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
    comment: 'Reference to work_orders (no formal FK)',
  })
  work_order_id: string;

  @ForeignKey(() => Contact)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Reference to contacts',
  })
  contact_id: string;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Auto-generated invoice number, unique per tenant',
  })
  invoice_number: string;

  @Column({
    type: DataType.ENUM(
      'draft',
      'sent',
      'viewed',
      'partially_paid',
      'paid',
      'overdue',
      'void',
    ),
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
  due_date: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  })
  paid_amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  pdf_url: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  custom_fields: Record<string, unknown>;

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
