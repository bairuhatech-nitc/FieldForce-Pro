import { Module } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { equipmentProviders } from './equipment.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EquipmentController],
  providers: [EquipmentService, ...equipmentProviders],
  exports: [EquipmentService, ...equipmentProviders],
})
export class EquipmentModule {}
