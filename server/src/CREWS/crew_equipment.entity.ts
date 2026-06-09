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
import { Crew } from './crews.entity';
import { Asset } from '../ASSETS/assets.entity';

@Table({ tableName: 'crew_equipment', timestamps: false, underscored: true })
export class CrewEquipment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Crew)
  @Column({ type: DataType.UUID, allowNull: false })
  crew_id: string;

  @BelongsTo(() => Crew)
  crew: Crew;

  @ForeignKey(() => Asset)
  @Column({ type: DataType.UUID, allowNull: false })
  asset_id: string;

  @BelongsTo(() => Asset)
  asset: Asset;

  @CreatedAt
  created_at: Date;
}
