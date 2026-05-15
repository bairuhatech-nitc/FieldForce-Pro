import { Module } from '@nestjs/common';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { estimatesProviders } from './estimates.provider';
import { DatabaseModule } from '../database/database.module';
import { WorkflowModule } from '../WORKFLOW/workflow.module';
import { workflowTemplatesProviders } from '../WORKFLOW/WORKFLOW_TEMPLATES/workflow_templates.provider';
import { WorkOrdersModule } from '../WORK_ORDERS/work_orders.module';
import { WorkOrderLineItemsModule } from '../WORK_ORDER_LINE_ITEMS/work_order_line_items.module';

@Module({
  imports: [DatabaseModule, WorkflowModule, WorkOrdersModule, WorkOrderLineItemsModule],
  controllers: [EstimatesController],
  providers: [EstimatesService, ...estimatesProviders, ...workflowTemplatesProviders],
  exports: [EstimatesService],
})
export class EstimatesModule {}
