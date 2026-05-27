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

const superAdminProviders = [
  { provide: REPOSITORY.USERS, useValue: User },
  { provide: REPOSITORY.SERVICE_REQUESTS, useValue: ServiceRequest },
  { provide: REPOSITORY.WORK_ORDERS, useValue: WorkOrder },
  { provide: REPOSITORY.INVOICES, useValue: Invoice },
];

@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, ...superAdminProviders],
})
export class SuperAdminModule {}
