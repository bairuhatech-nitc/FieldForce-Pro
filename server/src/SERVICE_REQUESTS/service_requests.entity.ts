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
import { ServiceLocation } from '../SERVICE_LOCATIONS/service_locations.entity';
import { User } from '../USERS/users.entity';

@Table({
  tableName: 'service_requests',
  timestamps: true,
  underscored: true,
})
export class ServiceRequest extends Model {
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

  @ForeignKey(() => Contact)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  contact_id: string;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => ServiceLocation)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  location_id: string;

  @BelongsTo(() => ServiceLocation)
  location: ServiceLocation;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    unique: true,
  })
  request_number: string;

  @Column({
    type: DataType.STRING(300),
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
  })
  priority: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  category: string;

  @Column({
    type: DataType.ENUM(
      'new',
      'triaged',
      'estimated',
      'approved',
      'rejected',
      'converted_to_wo',
      'closed',
      'spam',
    ),
    allowNull: false,
    defaultValue: 'new',
  })
  status: string;

  @Column({
    type: DataType.ENUM(
      'phone',
      'email',
      'portal',
      'webform',
      'api',
      'whatsapp',
      'sms',
    ),
    allowNull: false,
    defaultValue: 'phone',
  })
  channel: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  assigned_to: string;

  @BelongsTo(() => User)
  assignee: User;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
  })
  custom_fields: Record<string, unknown>;

  @Column({
    type: DataType.DECIMAL(10, 7),
    allowNull: true,
  })
  lat: number;

  @Column({
    type: DataType.DECIMAL(10, 7),
    allowNull: true,
  })
  lng: number;

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
