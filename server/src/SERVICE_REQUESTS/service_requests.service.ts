import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ServiceRequest } from './service_requests.entity';
import { CreateServiceRequestDto } from './dto/service_requests_create.dto';
import { UpdateServiceRequestDto } from './dto/service_requests_update.dto';
import { TriageServiceRequestDto } from './dto/service_requests_triage.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { PageDto } from '../shared/dto/page.dto';
import { PageMetaDto } from '../shared/dto/page-meta.dto';
import { KEYNAMES } from '../shared/constants/keynames';
import { Op, Sequelize } from 'sequelize';
import { Contact } from '../CONTACTS/contacts.entity';
import { ServiceLocation } from '../SERVICE_LOCATIONS/service_locations.entity';
import { DocumentApprovalsService } from '../WORKFLOW/WORKFLOW_DOCUMENT_APPROVALS/document_approvals.service';
import { WorkflowTemplate } from '../WORKFLOW/WORKFLOW_TEMPLATES/workflow_templates.entity';
import { WorkflowApprover } from '../WORKFLOW/WORKFLOW_APPROVERS/workflow_approvers.entity';
import { DocumentTypeEnum } from '../shared/enums/workflow.enum';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['triaged', 'rejected', 'closed', 'spam'],
  triaged: ['estimated', 'approved', 'rejected', 'closed', 'spam'],
  estimated: ['approved', 'rejected', 'closed'],
  approved: ['converted_to_wo', 'closed'],
  rejected: ['new', 'closed'],
  converted_to_wo: ['closed'],
  closed: [],
  spam: [],
};

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(
    @Inject(KEYNAMES.SERVICE_REQUESTS)
    private readonly serviceRequestRepository: typeof ServiceRequest,
    @Inject(KEYNAMES.WORKFLOW_TEMPLATES)
    private readonly templateRepository: typeof WorkflowTemplate,
    private readonly documentApprovalsService: DocumentApprovalsService,
  ) {}

  async findAllPaginated(
    tenantId: string,
    pageOptionsDto: PageOptionsDto,
    status?: string,
  ): Promise<PageDto<ServiceRequest>> {
    const where: Record<string, unknown> = {
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (status) {
      where.status = status;
    }

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { request_number: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { subject: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { description: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { category: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.serviceRequestRepository.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: ServiceLocation,
          attributes: ['id', 'address', 'lat', 'lng'],
        },
      ],
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findAll(tenantId: string): Promise<ServiceRequest[]> {
    return this.serviceRequestRepository.findAll({
      where: { tenant_id: tenantId, is_deleted: false },
      order: [['created_at', 'DESC']],
    });
  }

  async findMyPendingApprovals(
    tenantId: string,
    userId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<ServiceRequest>> {
    // Find service request IDs where the user has a PENDING approval and it's their turn
    const documentIds = await this.serviceRequestRepository.sequelize!.query(
      `SELECT DISTINCT da.document_id
       FROM workflow_document_approvals da
       WHERE da.tenant_id = :tenantId
         AND da.approver_id = :userId
         AND da.is_deleted = false
         AND da.document_type = 'SERVICE_REQUEST'
         AND da.status = 'PENDING'
         AND NOT EXISTS (
           SELECT 1 FROM workflow_document_approvals prev
           WHERE prev.document_id = da.document_id
             AND prev.tenant_id = da.tenant_id
             AND prev.order_no < da.order_no
             AND prev.status = 'PENDING'
             AND prev.is_deleted = false
         )`,
      {
        replacements: { tenantId, userId },
        type: 'SELECT' as unknown as undefined,
      },
    ) as unknown as Array<{ document_id: string }>;

    const ids = documentIds.map((r) => r.document_id);

    if (ids.length === 0) {
      const meta = new PageMetaDto({ pageOptionsDto, itemCount: 0 });
      return new PageDto([], meta);
    }

    const where: Record<string, unknown> = {
      id: { [Op.in]: ids },
      tenant_id: tenantId,
      is_deleted: false,
    };

    if (pageOptionsDto.search) {
      where[Op.or as unknown as string] = [
        { subject: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
        { description: { [Op.iLike]: `%${pageOptionsDto.search}%` } },
      ];
    }

    const { count, rows } = await this.serviceRequestRepository.findAndCountAll({
      where,
      include: [
        { model: Contact, attributes: ['id', 'first_name', 'last_name'] },
        { model: ServiceLocation, attributes: ['id', 'address'] },
      ],
      order: [['created_at', pageOptionsDto.order]],
      limit: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
    });

    const meta = new PageMetaDto({ pageOptionsDto, itemCount: count });
    return new PageDto(rows, meta);
  }

  async findById(id: string, tenantId: string): Promise<ServiceRequest> {
    const serviceRequest = await this.serviceRequestRepository.findOne({
      where: { id, tenant_id: tenantId, is_deleted: false },
      include: [
        {
          model: Contact,
          attributes: ['id', 'first_name', 'last_name'],
        },
        {
          model: ServiceLocation,
          attributes: ['id', 'address', 'lat', 'lng'],
        },
      ],
    });
    if (!serviceRequest) {
      throw new NotFoundException('Service request not found');
    }
    return serviceRequest;
  }

  async create(
    tenantId: string,
    dto: CreateServiceRequestDto,
    creatorUserId?: string,
  ): Promise<ServiceRequest> {
    // Auto-generate request_number: SR-YYYYMMDD-001 (resets daily)
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayCount = await this.serviceRequestRepository.count({
      where: {
        tenant_id: tenantId,
        created_at: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
      },
    });
    const shortTenant = tenantId.split('-')[0].toUpperCase();
    const requestNumber = `SR-${shortTenant}-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

    let serviceRequest;
    try {
      serviceRequest = await this.serviceRequestRepository.create({
        tenant_id: tenantId,
        request_number: requestNumber,
        ...dto,
      });
    } catch (error: any) {
      this.logger.error('Full Error during creation:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error.errors) {
        this.logger.error('Error Details:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }

    // Auto-trigger approval chain if an active template exists for SERVICE_REQUEST
    try {
      await this.triggerApprovalChain(tenantId, serviceRequest);
    } catch (error) {
      this.logger.error(
        `Failed to trigger approval chain for SR ${serviceRequest.id}: ${error.message}`,
        error.stack,
      );
    }

    return serviceRequest;
  }

  private async triggerApprovalChain(
    tenantId: string,
    serviceRequest: ServiceRequest,
  ): Promise<void> {
    // Find active template for SERVICE_REQUEST
    this.logger.log(`Looking for active SERVICE_REQUEST template for tenant ${tenantId}`);
    const template = await this.templateRepository.findOne({
      where: {
        tenant_id: tenantId,
        document_type: DocumentTypeEnum.SERVICE_REQUEST,
        is_active: true,
        is_deleted: false,
      },
      include: [
        {
          model: WorkflowApprover,
          where: { is_deleted: false, is_active: true },
          required: false,
        },
      ],
    });

    if (!template) {
      this.logger.log('No active SERVICE_REQUEST template found — skipping approval chain');
      return;
    }

    if (!template.approvers || template.approvers.length === 0) {
      this.logger.log(`Template "${template.name}" found but has no active approvers — skipping`);
      return;
    }

    this.logger.log(`Found template "${template.name}" with ${template.approvers.length} approvers`);

    // Create document approval records from the template
    // createDocumentApprovals() automatically notifies the first approver
    await this.documentApprovalsService.createDocumentApprovals(
      tenantId,
      {
        document_id: serviceRequest.id,
        document_type: DocumentTypeEnum.SERVICE_REQUEST,
        workflow_id: template.id,
      },
    );
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateServiceRequestDto,
  ): Promise<ServiceRequest> {
    const serviceRequest = await this.findById(id, tenantId);
    await serviceRequest.update(dto);
    return serviceRequest;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    dto: TriageServiceRequestDto,
  ): Promise<ServiceRequest> {
    const serviceRequest = await this.findById(id, tenantId);
    const currentStatus = serviceRequest.status;
    const newStatus = dto.status;

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions?.join(', ') || 'none (terminal state)'}`,
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (dto.priority !== undefined) {
      updateData.priority = dto.priority;
    }
    if (dto.category !== undefined) {
      updateData.category = dto.category;
    }
    if (dto.assigned_to !== undefined) {
      updateData.assigned_to = dto.assigned_to;
    }

    await serviceRequest.update(updateData);
    return serviceRequest;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const serviceRequest = await this.findById(id, tenantId);
    await serviceRequest.update({ is_deleted: true });
  }
}
