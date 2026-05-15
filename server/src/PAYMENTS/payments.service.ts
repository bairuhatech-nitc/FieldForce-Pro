import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Payment } from './payments.entity';
import { CreatePaymentDto } from './dto/payments_create.dto';
import { UpdatePaymentDto } from './dto/payments_update.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageDto } from '../shared/dto/page.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { KEYNAMES } from '../shared/constants/keynames';
import { Op } from 'sequelize';
import { Invoice } from '../INVOICES/invoices.entity';
import { InvoicesService } from '../INVOICES/invoices.service';
import { Contact } from '../CONTACTS/contacts.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(KEYNAMES.PAYMENTS)
    private readonly paymentRepository: typeof Payment,
    private readonly invoicesService: InvoicesService,
  ) { }

  async findAllPaginated(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<Payment>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { gateway_transaction_id: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { notes: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.paymentRepository.findAndCountAll({
      where,
      include: [
        {
          model: Invoice,
          attributes: ['id', 'invoice_number', 'contact_id'],
          include: [
            {
              model: Contact,
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        },
      ],
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findAll(tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false },
      include: [
        {
          model: Invoice,
          attributes: ['id', 'invoice_number', 'contact_id'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findById(id: string, tenantId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findByInvoiceId(invoiceId: string, tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.findAll({
      where: {
        invoice_id: invoiceId,
        tenant_id: tenantId,
        is_deleted: false,
      },
      order: [['created_at', 'ASC']],
    });
  }

  async create(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const payment = await this.paymentRepository.create({
      tenant_id: tenantId,
      ...dto,
    });

    // Record payment in the invoice to update balance and status
    if (dto.invoice_id) {
      await this.invoicesService.recordPayment(dto.invoice_id, tenantId, dto.amount);
    }

    return payment;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePaymentDto,
  ): Promise<Payment> {
    const payment = await this.findById(id, tenantId);
    await payment.update(dto);
    return payment;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const payment = await this.findById(id, tenantId);
    await payment.update({ is_deleted: true });
  }
}
