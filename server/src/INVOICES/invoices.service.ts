import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Invoice } from './invoices.entity';
import { CreateInvoiceDto } from './dto/invoices_create.dto';
import { UpdateInvoiceDto } from './dto/invoices_update.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageDto } from '../shared/dto/page.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { KEYNAMES } from '../shared/constants/keynames';
import { Op } from 'sequelize';
import { Contact } from '../CONTACTS/contacts.entity';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['viewed', 'overdue', 'void'],
  viewed: ['partially_paid', 'overdue', 'void'],
  partially_paid: ['paid'],
  paid: [],
  overdue: ['partially_paid', 'paid'],
  void: [],
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(KEYNAMES.INVOICES)
    private readonly invoiceRepository: typeof Invoice,
  ) { }

  async findAllPaginated(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<Invoice>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { invoice_number: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { notes: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.invoiceRepository.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findAll(tenantId: string): Promise<Invoice[]> {
    return this.invoiceRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false },
      include: [
        {
          model: Contact,
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findByWorkOrderId(workOrderId: string, tenantId: string): Promise<Invoice[]> {
    return this.invoiceRepository.findAll({
      where: {
        work_order_id: workOrderId,
        tenant_id: tenantId,
        is_deleted: false,
      },
      order: [['created_at', 'DESC']],
    });
  }

  async findById(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    if (!dto.invoice_number) {
      dto.invoice_number = await this.generateInvoiceNumber(tenantId);
    }

    return this.invoiceRepository.create({
      tenant_id: tenantId,
      ...dto,
    });
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findById(id, tenantId);
    await invoice.update(dto);
    return invoice;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: string,
  ): Promise<Invoice> {
    const invoice = await this.findById(id, tenantId);
    const currentStatus = invoice.status;

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
      throw new BadRequestException(
        `No transitions allowed from status '${currentStatus}'`,
      );
    }

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }

    await invoice.update({ status: newStatus });
    return invoice;
  }

  async recordPayment(
    id: string,
    tenantId: string,
    amount: number,
  ): Promise<Invoice> {
    const invoice = await this.findById(id, tenantId);

    const newPaidAmount = Number(invoice.paid_amount) + Number(amount);
    let newStatus = invoice.status;

    if (newPaidAmount >= Number(invoice.total)) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid';
    }

    await invoice.update({
      paid_amount: newPaidAmount,
      status: newStatus,
    });

    return invoice;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const invoice = await this.findById(id, tenantId);
    await invoice.update({ is_deleted: true });
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const lastInvoice = await this.invoiceRepository.findOne({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']],
      attributes: ['invoice_number'],
    });

    let nextNumber = 1;
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${nextNumber.toString().padStart(6, '0')}`;
  }
}
