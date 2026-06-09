import { REPOSITORY } from '../shared/constants/keynames';
import { Equipment } from './equipment.entity';
import { EquipmentHistory } from './equipment_history.entity';
import { EquipmentCategory } from './equipment_category.entity';

export const equipmentProviders = [
  { provide: REPOSITORY.EQUIPMENT, useValue: Equipment },
  { provide: REPOSITORY.EQUIPMENT_HISTORY, useValue: EquipmentHistory },
  { provide: REPOSITORY.EQUIPMENT_CATEGORIES, useValue: EquipmentCategory },
];
