import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogsService } from './audit_logs.service';
import { AuditLogQueryDto } from './dto/audit_logs_query.dto';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { TenantId } from '../shared/decorator/tenant.decorator';
import { Permissions } from '../shared/decorator/permission.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

  @Get()
  @Permissions('audit_logs:read')
  @ApiOperation({ summary: 'Get all audit logs (paginated, with filters)' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() queryDto: AuditLogQueryDto,
  ) {
    const result = await this.auditLogsService.findAllPaginated(tenantId, queryDto, queryDto);
    return DataResponseDto.success(result.data, 'Audit logs fetched successfully', {
      ...result.meta,
    } as unknown as Record<string, unknown>);
  }

  @Get(':id')
  @Permissions('audit_logs:read')
  @ApiOperation({ summary: 'Get audit log by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    const auditLog = await this.auditLogsService.findById(id, tenantId);
    return DataResponseDto.success(auditLog);
  }
}
