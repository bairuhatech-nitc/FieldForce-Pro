import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentDto } from './create_equipment.dto';

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
