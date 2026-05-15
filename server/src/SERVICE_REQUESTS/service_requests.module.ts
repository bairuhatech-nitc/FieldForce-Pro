import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './service_requests.controller';
import { ServiceRequestsService } from './service_requests.service';
import { serviceRequestsProviders } from './service_requests.provider';
import { workflowTemplatesProviders } from '../WORKFLOW/WORKFLOW_TEMPLATES/workflow_templates.provider';
import { DatabaseModule } from '../database/database.module';
import { WorkflowModule } from '../WORKFLOW/workflow.module';

@Module({
  imports: [DatabaseModule, WorkflowModule],
  controllers: [ServiceRequestsController],
  providers: [
    ServiceRequestsService,
    ...serviceRequestsProviders,
    ...workflowTemplatesProviders,
  ],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
