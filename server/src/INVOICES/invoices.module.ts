import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AutoInvoiceService } from './auto_invoice.service';
import { invoicesProviders } from './invoices.provider';
import { invoiceLineItemsProviders } from '../INVOICE_LINE_ITEMS/invoice_line_items.provider';
import { workOrdersProviders } from '../WORK_ORDERS/work_orders.provider';
import { workOrderLineItemsProviders } from '../WORK_ORDER_LINE_ITEMS/work_order_line_items.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    AutoInvoiceService,
    ...invoicesProviders,
    ...invoiceLineItemsProviders,
    ...workOrdersProviders,
    ...workOrderLineItemsProviders,
  ],
  exports: [InvoicesService, AutoInvoiceService],
})
export class InvoicesModule {}
