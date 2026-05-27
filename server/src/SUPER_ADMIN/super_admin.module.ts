import { Module } from '@nestjs/common';
import { SuperAdminController } from './super_admin.controller';
import { SuperAdminService } from './super_admin.service';
import { TenantsModule } from '../TENANTS/tenants.module';
import { DatabaseModule } from '../database/database.module';
import { REPOSITORY } from '../shared/constants/keynames';
import { User } from '../USERS/users.entity';
import { ServiceRequest } from '../SERVICE_REQUESTS/service_requests.entity';
import { WorkOrder } from '../WORK_ORDERS/work_orders.entity';
import { Invoice } from '../INVOICES/invoices.entity';
import { SuperAdminAnalyticsService } from './SUPER_ADMIN_ANALYTICS/super_admin_analytics.service';
import { SuperAdminHealthService } from './SUPER_ADMIN_HEALTH/super_admin_health.service';
import { SuperAdminApiKeysService } from './SUPER_ADMIN_API_KEYS/super_admin_api_keys.service';
import { SuperAdminAuditLogsService } from './SUPER_ADMIN_AUDIT_LOGS/super_admin_audit_logs.service';
import { SuperAdminApiKey } from './SUPER_ADMIN_API_KEYS/super_admin_api_keys.entity';
import { SuperAdminAuditLog } from './SUPER_ADMIN_AUDIT_LOGS/super_admin_audit_logs.entity';

const superAdminProviders = [
  { provide: REPOSITORY.USERS, useValue: User },
  { provide: REPOSITORY.SERVICE_REQUESTS, useValue: ServiceRequest },
  { provide: REPOSITORY.WORK_ORDERS, useValue: WorkOrder },
  { provide: REPOSITORY.INVOICES, useValue: Invoice },
  { provide: REPOSITORY.SUPER_ADMIN_API_KEYS, useValue: SuperAdminApiKey },
  { provide: REPOSITORY.SUPER_ADMIN_AUDIT_LOGS, useValue: SuperAdminAuditLog },
];

@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [SuperAdminController],
  providers: [
    SuperAdminService, 
    SuperAdminAnalyticsService,
    SuperAdminHealthService,
    SuperAdminApiKeysService,
    SuperAdminAuditLogsService,
    ...superAdminProviders
  ],
})
export class SuperAdminModule {}
