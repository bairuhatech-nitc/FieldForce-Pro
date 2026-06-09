import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work_orders.controller';
import { WorkOrdersService } from './work_orders.service';
import { workOrdersProviders } from './work_orders.provider';
import { workflowTemplatesProviders } from '../WORKFLOW/WORKFLOW_TEMPLATES/workflow_templates.provider';
import { DatabaseModule } from '../database/database.module';
import { InvoicesModule } from '../INVOICES/invoices.module';
import { WorkflowModule } from '../WORKFLOW/workflow.module';
import { NotificationsModule } from '../NOTIFICATIONS/notifications.module';
import { SlaModule } from '../SLA_MODULE/sla.module';

@Module({
  imports: [DatabaseModule, InvoicesModule, WorkflowModule, NotificationsModule, SlaModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, ...workOrdersProviders, ...workflowTemplatesProviders],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
