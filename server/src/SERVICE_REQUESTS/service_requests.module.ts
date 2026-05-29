import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './service_requests.controller';
import { QueueController } from './queue.controller';
import { ServiceRequestsService } from './service_requests.service';
import { serviceRequestsProviders } from './service_requests.provider';
import { workflowTemplatesProviders } from '../WORKFLOW/WORKFLOW_TEMPLATES/workflow_templates.provider';
import { DatabaseModule } from '../database/database.module';
import { WorkflowModule } from '../WORKFLOW/workflow.module';
import { ApiKeysModule } from '../API_KEYS/api_keys.module';
import { ApiKeyGuard } from '../shared/guards/api-key.guard';
import { NotificationsModule } from '../NOTIFICATIONS/notifications.module';
import { workOrdersProviders } from '../WORK_ORDERS/work_orders.provider';

@Module({
  imports: [DatabaseModule, WorkflowModule, ApiKeysModule, NotificationsModule],
  controllers: [ServiceRequestsController, QueueController],
  providers: [
    ServiceRequestsService,
    ApiKeyGuard,
    ...serviceRequestsProviders,
    ...workflowTemplatesProviders,
    ...workOrdersProviders,
  ],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
