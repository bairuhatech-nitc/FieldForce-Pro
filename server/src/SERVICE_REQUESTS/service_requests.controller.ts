import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServiceRequestsService } from './service_requests.service';
import { CreateServiceRequestDto } from './dto/service_requests_create.dto';
import { UpdateServiceRequestDto } from './dto/service_requests_update.dto';
import { TriageServiceRequestDto } from './dto/service_requests_triage.dto';
import { PageOptionsDto } from '../shared/dto/page-options.dto';
import { ServiceRequestQueryDto } from './dto/service_requests_query.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { UserId } from '../shared/decorator/user.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';
import { DocumentApprovalsService } from '../WORKFLOW/WORKFLOW_DOCUMENT_APPROVALS/document_approvals.service';
import { ApprovalActionEnum } from '../shared/enums/workflow.enum';

@ApiTags('Service Requests')
@ApiBearerAuth()
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
    private readonly documentApprovalsService: DocumentApprovalsService,
  ) {}

  @Get()
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Get all service requests (paginated)' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() queryDto: ServiceRequestQueryDto,
  ) {
    const result = await this.serviceRequestsService.findAllPaginated(
      tenantId,
      queryDto,
      queryDto.status,
    );
    return DataResponseDto.success(
      result.data,
      'Service requests fetched successfully',
      { ...result.meta } as unknown as Record<string, unknown>,
    );
  }

  @Get('my-approvals')
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Get service requests pending my approval (only those where it is my turn)' })
  async findMyPendingApprovals(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    const result = await this.serviceRequestsService.findMyPendingApprovals(
      tenantId,
      userId,
      pageOptionsDto,
    );
    return DataResponseDto.success(
      result.data,
      'Pending approval requests fetched successfully',
      { ...result.meta } as unknown as Record<string, unknown>,
    );
  }

  @Get('all')
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Get all service requests (non-paginated)' })
  async findAllNonPaginated(@TenantId() tenantId: string) {
    const serviceRequests = await this.serviceRequestsService.findAll(tenantId);
    return DataResponseDto.success(
      serviceRequests,
      'Service requests fetched successfully',
    );
  }

  @Get(':id/approvals')
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Get approval chain for a service request' })
  async getApprovals(@Param('id') id: string, @TenantId() tenantId: string) {
    const approvals = await this.documentApprovalsService.getApprovalsByDocument(
      id,
      tenantId,
    );
    return DataResponseDto.success(approvals, 'Approvals fetched successfully');
  }

  @Post(':id/approvals/:approvalId/process')
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Process an approval (approve/reject) for a service request' })
  async processApproval(
    @Param('id') _id: string,
    @Param('approvalId') approvalId: string,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: { action: string; comments?: string },
  ) {
    const approval = await this.documentApprovalsService.processApproval(
      approvalId,
      tenantId,
      userId,
      { action: dto.action as ApprovalActionEnum, comments: dto.comments },
    );
    return DataResponseDto.success(approval, 'Approval processed successfully');
  }

  @Get(':id')
  @Permissions('service_requests:read')
  @ApiOperation({ summary: 'Get service request by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const serviceRequest = await this.serviceRequestsService.findById(
      id,
      tenantId,
    );
    return DataResponseDto.success(serviceRequest);
  }

  @Post()
  @Permissions('service_requests:create')
  @ApiOperation({ summary: 'Create a new service request' })
  async create(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: CreateServiceRequestDto,
  ) {
    const serviceRequest = await this.serviceRequestsService.create(
      tenantId,
      dto,
      userId,
    );
    return DataResponseDto.created(
      serviceRequest,
      'Service request created successfully',
    );
  }

  @Put(':id')
  @Permissions('service_requests:update')
  @ApiOperation({ summary: 'Update a service request' })
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    const serviceRequest = await this.serviceRequestsService.update(
      id,
      tenantId,
      dto,
    );
    return DataResponseDto.success(
      serviceRequest,
      'Service request updated successfully',
    );
  }

  @Patch(':id/status')
  @Permissions('service_requests:update')
  @ApiOperation({ summary: 'Update service request status with validation' })
  async updateStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: TriageServiceRequestDto,
  ) {
    const serviceRequest = await this.serviceRequestsService.updateStatus(
      id,
      tenantId,
      dto,
    );
    return DataResponseDto.success(
      serviceRequest,
      'Service request status updated successfully',
    );
  }

  @Delete(':id')
  @Permissions('service_requests:delete')
  @ApiOperation({ summary: 'Delete a service request (soft delete)' })
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.serviceRequestsService.delete(id, tenantId);
    return DataResponseDto.success(
      null,
      'Service request deleted successfully',
    );
  }
}
