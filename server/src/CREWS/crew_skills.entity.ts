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
import { Category } from '../CATEGORIES/categories.entity';

@Table({ tableName: 'crew_skills', timestamps: false, underscored: true })
export class CrewSkill extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Crew)
  @Column({ type: DataType.UUID, allowNull: false })
  crew_id: string;

  @BelongsTo(() => Crew)
  crew: Crew;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false })
  category_id: string;

  @BelongsTo(() => Category)
  category: Category;

  @CreatedAt
  created_at: Date;
}
