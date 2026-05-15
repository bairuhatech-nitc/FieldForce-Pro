import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Tenant } from '../TENANTS/tenants.entity';
import { Invoice } from '../INVOICES/invoices.entity';

@Table({
  tableName: 'payments',
  timestamps: true,
  underscored: true,
})
export class Payment extends Model {
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

  @ForeignKey(() => Invoice)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to invoices',
  })
  invoice_id: string;

  @BelongsTo(() => Invoice)
  invoice: Invoice;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.ENUM('card', 'cash', 'bank_transfer', 'online', 'check', 'other'),
    allowNull: false,
    defaultValue: 'card',
  })
  method: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  gateway_transaction_id: string;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  paid_at: Date;

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
