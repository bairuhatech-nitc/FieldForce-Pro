import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { paymentsProviders } from './payments.provider';
import { DatabaseModule } from '../database/database.module';
import { InvoicesModule } from '../INVOICES/invoices.module';
import { NotificationsModule } from '../NOTIFICATIONS/notifications.module';

@Module({
  imports: [DatabaseModule, InvoicesModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ...paymentsProviders],
  exports: [PaymentsService],
})
export class PaymentsModule { }
