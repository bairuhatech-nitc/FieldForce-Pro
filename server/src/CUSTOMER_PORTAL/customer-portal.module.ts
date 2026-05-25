import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';
import { KEYNAMES } from '../shared/constants/keynames';
import { Contact } from '../CONTACTS/contacts.entity';
import { ServiceRequest } from '../SERVICE_REQUESTS/service_requests.entity';
import { Invoice } from '../INVOICES/invoices.entity';
import { Payment } from '../PAYMENTS/payments.entity';
import { WorkOrder } from '../WORK_ORDERS/work_orders.entity';
import { ServiceLocation } from '../SERVICE_LOCATIONS/service_locations.entity';
import { ServiceAppointment } from '../SERVICE_APPOINTMENTS/service_appointments.entity';
import { WorkOrderLineItem } from '../WORK_ORDER_LINE_ITEMS/work_order_line_items.entity';
import { WorkOrderNote } from '../WORK_ORDER_NOTES/work_order_notes.entity';
import { WorkOrderAttachment } from '../WORK_ORDER_ATTACHMENTS/work_order_attachments.entity';
import { WorkOrderTechnicianSession } from '../WORK_ORDER_TECHNICIAN_SESSIONS/work_order_technician_sessions.entity';
import { Review } from '../REVIEWS/reviews.entity';
import { RequestAttachment } from '../ATTACHMENTS/request_attachments.entity';

const portalProviders = [
  { provide: KEYNAMES.CONTACTS, useValue: Contact },
  { provide: KEYNAMES.SERVICE_REQUESTS, useValue: ServiceRequest },
  { provide: KEYNAMES.INVOICES, useValue: Invoice },
  { provide: KEYNAMES.PAYMENTS, useValue: Payment },
  { provide: KEYNAMES.WORK_ORDERS, useValue: WorkOrder },
  { provide: KEYNAMES.SERVICE_LOCATIONS, useValue: ServiceLocation },
  { provide: KEYNAMES.SERVICE_APPOINTMENTS, useValue: ServiceAppointment },
  { provide: KEYNAMES.WORK_ORDER_LINE_ITEMS, useValue: WorkOrderLineItem },
  { provide: KEYNAMES.WORK_ORDER_NOTES, useValue: WorkOrderNote },
  { provide: KEYNAMES.WORK_ORDER_ATTACHMENTS, useValue: WorkOrderAttachment },
  { provide: KEYNAMES.WORK_ORDER_TECHNICIAN_SESSIONS, useValue: WorkOrderTechnicianSession },
  { provide: KEYNAMES.REVIEWS, useValue: Review },
  { provide: KEYNAMES.REQUEST_ATTACHMENTS, useValue: RequestAttachment },
];

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService, ...portalProviders],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
