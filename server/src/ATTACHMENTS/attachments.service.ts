import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '../shared/constants/keynames';
import { RequestAttachment } from './request_attachments.entity';
import { ServiceRequest } from '../SERVICE_REQUESTS/service_requests.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(REPOSITORY.REQUEST_ATTACHMENTS)
    private readonly attachmentsRepository: typeof RequestAttachment,
    @Inject(REPOSITORY.SERVICE_REQUESTS)
    private readonly serviceRequestRepository: typeof ServiceRequest,
  ) {}

  async saveAttachments(
    requestId: string,
    tenantId: string,
    userId: string,
    filesData: any[],
  ): Promise<RequestAttachment[]> {
    const request = await this.serviceRequestRepository.findOne({
      where: { id: requestId, tenant_id: tenantId },
    });

    if (!request) {
      throw new NotFoundException('Service Request not found');
    }

    const attachments = filesData.map(file => ({
      request_id: requestId,
      tenant_id: tenantId,
      uploaded_by: userId,
      file_name: file.fileName,
      file_url: file.fileUrl,
      file_type: file.fileType,
      file_size: file.fileSize,
    }));

    return this.attachmentsRepository.bulkCreate(attachments);
  }

  async getAttachments(requestId: string, tenantId: string): Promise<RequestAttachment[]> {
    return this.attachmentsRepository.findAll({
      where: { request_id: requestId, tenant_id: tenantId },
      order: [['created_at', 'DESC']],
    });
  }
}
