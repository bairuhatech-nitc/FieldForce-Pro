import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Steps, Modal, Input, Alert, Select } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, MinusCircleOutlined, UserAddOutlined, SwapOutlined, EnvironmentOutlined } from '@ant-design/icons';
import {
  useServiceRequest,
  useDeleteServiceRequest,
  useUpdateServiceRequestStatus,
  useServiceRequestApprovals,
  useProcessServiceRequestApproval,
  useAssignServiceRequestTechnician,
  useApproveAndConvert,
  useUpdateServiceRequest,
} from '@/hooks/use-service-requests';
import { useAgents } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth.store';
import { usePermission } from '@/components/permissions/usePermission';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/utils/format-date';
import FileUploadZone from '@/components/service-requests/FileUploadZone';
import { useTranslation } from 'react-i18next'; // Rule 1

const priorityColors: Record<string, string> = {
  urgent: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const statusColors: Record<string, string> = {
  new: 'blue',
  triaged: 'cyan',
  estimated: 'gold',
  approved: 'green',
  converted_to_wo: 'purple',
  rejected: 'red',
  closed: 'default',
  spam: 'red',
};

// statusLabels will be populated inside the component using t()
let statusLabels: Record<string, string>;

// This function needs to be declared after 't' is available, or use the populated statusLabels
function formatStatus(status: string): string {
  // `statusLabels` is populated within the component using `t()`, so this is fine.
  // The fallback is a programmatic string transformation, not a hardcoded user-facing string.
  return statusLabels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

interface ApprovalItem {
  id: string;
  status: string;
  order_no: number;
  approver_id: string;
  approver?: { id: string; first_name?: string; last_name?: string };
  action_date?: string;
  comments?: string;
}

export default function RequestDetailPage() {
  const { t } = useTranslation(); // Rule 2

  // Populate statusLabels here after t() is available
  statusLabels = {
    new: t('serviceRequests.detailPage.status.pendingApproval'),
    triaged: t('serviceRequests.detailPage.status.triaged'),
    estimated: t('serviceRequests.detailPage.status.estimated'),
    approved: t('serviceRequests.detailPage.status.approved'),
    converted_to_wo: t('serviceRequests.detailPage.status.convertedToWo'),
    rejected: t('serviceRequests.detailPage.status.rejected'),
    closed: t('serviceRequests.detailPage.status.closed'),
    spam: t('serviceRequests.detailPage.status.flagged'),
  };

  const statusTransitions: Record<string, string[]> = {
    new: ['triaged', 'rejected', 'spam'],
    triaged: ['estimated', 'rejected', 'closed', 'spam'],
    estimated: ['approved', 'rejected', 'closed'],
    approved: ['converted_to_wo', 'closed'],
    converted_to_wo: ['closed'],
    rejected: ['new', 'closed'],
    closed: [],
    spam: [],
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isAdmin } = usePermission();
  const { data: request, isLoading, error: requestError } = useServiceRequest(id!);
  const { data: approvals, refetch: refetchApprovals } = useServiceRequestApprovals(id!);
  const { data: agents = [] } = useAgents();
  const deleteRequest = useDeleteServiceRequest();
  const updateStatus = useUpdateServiceRequestStatus();
  const processApproval = useProcessServiceRequestApproval();
  const assignTechnician = useAssignServiceRequestTechnician();
  const updateRequest = useUpdateServiceRequest();
  const approveAndConvert = useApproveAndConvert();

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalComments, setApprovalComments] = useState('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);

  const handleDelete = () => {
    if (!request) return;
    showConfirmDialog({
      title: t('serviceRequests.detailPage.deleteConfirm.title'),
      content: t('serviceRequests.detailPage.deleteConfirm.content', { subject: request.subject }),
      onOk: async () => {
        await deleteRequest.mutateAsync(request.id);
        navigate('/service-requests');
      },
      danger: true,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!request) return;
    await updateStatus.mutateAsync({ id: request.id, status: newStatus });
  };

  const handleAssignTechnician = async () => {
    if (!request || selectedTechnicianIds.length === 0) return;
    await updateRequest.mutateAsync({ id: request.id, technician_ids: selectedTechnicianIds });
    setAssignModalOpen(false);
    setSelectedTechnicianIds([]);
  };

  const openAssignModal = () => {
    // Pre-populate with already assigned technicians
    setSelectedTechnicianIds(request?.technicians?.map((t) => t.id) || []);
    setAssignModalOpen(true);
  };

  const handleApproveAndConvert = () => {
    if (!request) return;
    showConfirmDialog({
      title: t('serviceRequests.detailPage.approveAndConvertConfirm.title'),
      content: t('serviceRequests.detailPage.approveAndConvertConfirm.content'),
      onOk: async () => {
        const response = await approveAndConvert.mutateAsync(request.id);
        const wo = response.data.data?.workOrder;
        if (wo) {
          navigate(`/work-orders/${wo.id}`);
        }
      },
    });
  };

  const openApprovalModal = (approvalId: string, action: 'APPROVE' | 'REJECT') => {
    setSelectedApprovalId(approvalId);
    setApprovalAction(action);
    setApprovalComments('');
    setApprovalModalOpen(true);
  };

  const handleProcessApproval = async () => {
    if (!id) return;
    await processApproval.mutateAsync({
      serviceRequestId: id,
      approvalId: selectedApprovalId,
      action: approvalAction,
      comments: approvalComments || undefined,
    });
    setApprovalModalOpen(false);
    refetchApprovals();
  };

  // Find the current user's pending approval (if any)
  const typedApprovals = approvals as ApprovalItem[] | undefined;
  const myPendingApproval = typedApprovals?.find(
    (a) => a.approver_id === user?.id && a.status === 'PENDING',
  );

  // Check if this approval is the next in sequence (all previous must be done)
  const canActOnApproval = myPendingApproval && typedApprovals
    ? !typedApprovals.some(
        (a) => a.order_no < myPendingApproval.order_no && a.status === 'PENDING',
      )
    : false;

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('serviceRequests.detailPage.pageHeader.details')} />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!request) {
    const errorStatus = (requestError as { response?: { status?: number } })?.response?.status;
    const errorMessage = errorStatus === 403
      ? t('serviceRequests.detailPage.errors.permissionDenied')
      : errorStatus === 404
        ? t('serviceRequests.detailPage.errors.notFound')
        : requestError
          ? t('serviceRequests.detailPage.errors.failedToLoad', { message: (requestError as Error).message })
          : t('serviceRequests.detailPage.errors.notFound');
    return (
      <div>
        <PageHeader
          title={errorStatus === 403 ? t('serviceRequests.detailPage.errors.accessDeniedTitle') : t('serviceRequests.detailPage.errors.notFoundTitle')}
          onBack={() => navigate('/service-requests')}
        />
        <Card>{errorMessage}</Card>
      </div>
    );
  }

  const availableTransitions = statusTransitions[request.status] || [];

  return (
    <div>
      <PageHeader
        title={request.subject}
        onBack={() => navigate('/service-requests')}
        extra={
          isAdmin ? (
            <Space>
              <Button
                icon={<UserAddOutlined />}
                onClick={openAssignModal}
              >
                {t('serviceRequests.detailPage.assignTechnicianButton')}
              </Button>
              {!['converted_to_wo', 'closed', 'spam', 'rejected'].includes(request.status) && (
                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  loading={approveAndConvert.isPending}
                  onClick={handleApproveAndConvert}
                >
                  {t('serviceRequests.detailPage.approveAndCreateWoButton')}
                </Button>
              )}
              <Button icon={<EditOutlined />} onClick={() => navigate(`/service-requests/${request.id}/edit`)}>
                {t('common.edit')}
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </Space>
          ) : undefined
        }
      />

      {request.is_spam && (
        <Alert
          message={t('serviceRequests.detailPage.spamAlert.message')}
          description={
            <div>
              <strong>{t('serviceRequests.detailPage.spamAlert.reason')}:</strong> {request.spam_reason || t('serviceRequests.detailPage.spamAlert.defaultReason')}<br/>
              <strong>{t('serviceRequests.detailPage.spamAlert.confidence')}:</strong> {request.spam_confidence ? `${(request.spam_confidence * 100).toFixed(1)}%` : t('common.na')}
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isAdmin && availableTransitions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span style={{ fontWeight: 500 }}>{t('serviceRequests.detailPage.transitionTo')}:</span>
            {availableTransitions.map((status) => (
              <Button
                key={status}
                type="primary"
                size="small"
                loading={updateStatus.isPending}
                onClick={() => handleStatusChange(status)}
              >
                {formatStatus(status)}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      {/* Approval Action Card — shown ONLY when current user is the active approver */}
      {canActOnApproval && myPendingApproval && (
        <Card
          title={t('serviceRequests.detailPage.approvalRequiredCard.title')}
          style={{ marginBottom: 16, borderColor: '#faad14' }}
        >
          <p>{t('serviceRequests.detailPage.approvalRequiredCard.description')}</p>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => openApprovalModal(myPendingApproval.id, 'APPROVE')}
            >
              {t('common.approve')}
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => openApprovalModal(myPendingApproval.id, 'REJECT')}
            >
              {t('common.reject')}
            </Button>
          </Space>
        </Card>
      )}

      <Card title={t('serviceRequests.detailPage.infoCard.title')}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.requestId')}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#1890ff' }}>
              {request.request_number || '-'}
            </span>
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.subject')}>
            {request.subject}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.status')}>
            <Tag color={statusColors[request.status] || 'default'}>
              {formatStatus(request.status)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.priority')}>
            <Tag color={priorityColors[request.priority] || 'default'}>
              {request.priority?.charAt(0).toUpperCase() + request.priority?.slice(1)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.channel')}>
            {request.channel ? (
              <Tag>{request.channel.charAt(0).toUpperCase() + request.channel.slice(1)}</Tag>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.category')}>
            {request.category ? <Tag>{request.category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.customer')}>
            {request.contact
              ? `${request.contact.first_name} ${request.contact.last_name}`
              : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.location')}>
            {request.location?.address || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.description')} span={2}>
            {request.description || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.scheduledDate')}>
            {request.scheduled_start ? formatDateTime(request.scheduled_start) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.assignedTechnicians')}>
            {request.technicians && request.technicians.length > 0 ? (
              <Space wrap>
                {request.technicians.map((t) => (
                  <Tag key={t.id} color="blue">
                    {t.first_name} {t.last_name}
                  </Tag>
                ))}
              </Space>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.createdAt')}>
            {formatDateTime(request.created_at)}
          </Descriptions.Item>

          <Descriptions.Item label={t('serviceRequests.detailPage.infoCard.updatedAt')}>
            {formatDateTime(request.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {(() => {
        const lat = (request.location?.lat ?? (request as any).lat) as number | undefined;
        const lng = (request.location?.lng ?? (request as any).lng) as number | undefined;
        const address = request.location?.address || ((request as any).custom_fields as Record<string, unknown>)?.service_address as string | undefined;
        if (!lat || !lng) return null;
        const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01},${Number(lat) - 0.01},${Number(lng) + 0.01},${Number(lat) + 0.01}&layer=mapnik&marker=${lat},${lng}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        return (
          <Card
            title={<><EnvironmentOutlined style={{ marginRight: 6 }} />{t('serviceRequests.detailPage.locationCard.title')}</>}
            style={{ marginTop: 16 }}
          >
            {address && <p style={{ marginBottom: 8, fontWeight: 500 }}>{address}</p>}
            <p style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
              {t('serviceRequests.detailPage.locationCard.gps')}: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
            </p>
            <iframe
              src={mapSrc}
              title={t('serviceRequests.detailPage.locationCard.mapTitle')}
              style={{ width: '100%', height: 200, border: '1px solid #e8e8e8', borderRadius: 4, marginBottom: 12 }}
              loading="lazy"
            />
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button type="primary" icon={<EnvironmentOutlined />}>{t('serviceRequests.detailPage.locationCard.getDirections')}</Button>
            </a>
          </Card>
        );
      })()}

      {typedApprovals && typedApprovals.length > 0 && (
        <Card title={t('serviceRequests.detailPage.approvalStatusCard.title')} style={{ marginTop: 16 }}>
          <Steps
            direction="vertical"
            size="small"
            current={typedApprovals.findIndex((a) => a.status === 'PENDING')}
            items={typedApprovals.map((approval) => {
              const approverName = approval.approver
                ? `${approval.approver.first_name || ''} ${approval.approver.last_name || ''}`.trim()
                : t('common.unknown');

              const statusMap: Record<string, { status: 'finish' | 'process' | 'wait' | 'error'; icon: React.ReactNode }> = {
                APPROVED: { status: 'finish', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> },
                REJECTED: { status: 'error', icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> },
                PENDING: { status: 'process', icon: <ClockCircleOutlined style={{ color: '#faad14' }} /> },
                SKIPPED: { status: 'wait', icon: <MinusCircleOutlined style={{ color: '#d9d9d9' }} /> },
                CORRECTION_REQUIRED: { status: 'error', icon: <CloseCircleOutlined style={{ color: '#fa8c16' }} /> },
              };

              const stepInfo = statusMap[approval.status] || { status: 'wait' as const, icon: null };

              return {
                title: (
                  <Space>
                    <span>{approverName}</span>
                    <Tag color={
                      approval.status === 'APPROVED' ? 'green' :
                      approval.status === 'REJECTED' ? 'red' :
                      approval.status === 'PENDING' ? 'orange' :
                      approval.status === 'SKIPPED' ? 'default' : 'gold'
                    }>
                      {t(`serviceRequests.detailPage.approvalStatus.${approval.status.toLowerCase()}`)}
                    </Tag>
                  </Space>
                ),
                description: (
                  <div>
                    {approval.action_date && (
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {formatDateTime(approval.action_date)}
                      </div>
                    )}
                    {approval.comments && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        {approval.comments}
                      </div>
                    )}
                  </div>
                ),
                status: stepInfo.status,
                icon: stepInfo.icon,
              };
            })}
          />
        </Card>
      )}

      <Card title={t('serviceRequests.detailPage.attachmentsCard.title')} style={{ marginTop: 16 }}>
        <FileUploadZone requestId={request.id} />
      </Card>

      <Modal
        title={t('serviceRequests.detailPage.assignModal.title')}
        open={assignModalOpen}
        onOk={handleAssignTechnician}
        onCancel={() => { setAssignModalOpen(false); setSelectedTechnicianIds([]); }}
        confirmLoading={updateRequest.isPending}
        okText={t('common.save')}
        okButtonProps={{ disabled: selectedTechnicianIds.length === 0 }}
      >
        <p style={{ marginBottom: 12 }}>{t('serviceRequests.detailPage.assignModal.description')}</p>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder={t('serviceRequests.detailPage.assignModal.placeholder')}
          showSearch
          optionFilterProp="label"
          value={selectedTechnicianIds}
          onChange={(val) => setSelectedTechnicianIds(val)}
          options={agents.map((a) => ({
            value: a.id,
            label: `${a.first_name} ${a.last_name}${a.email ? ` (${a.email})` : ''}`,
          }))}
        />
      </Modal>

      {/* Approval Action Modal */}
      <Modal
        title={approvalAction === 'APPROVE' ? t('serviceRequests.detailPage.processApprovalModal.approveTitle') : t('serviceRequests.detailPage.processApprovalModal.rejectTitle')}
        open={approvalModalOpen}
        onOk={handleProcessApproval}
        onCancel={() => setApprovalModalOpen(false)}
        confirmLoading={processApproval.isPending}
        okText={approvalAction === 'APPROVE' ? t('common.approve') : t('common.reject')}
        okButtonProps={{
          danger: approvalAction === 'REJECT',
        }}
      >
        <p>
          {approvalAction === 'APPROVE'
            ? t('serviceRequests.detailPage.processApprovalModal.approveContent')
            : t('serviceRequests.detailPage.processApprovalModal.rejectContent')}
        </p>
        <Input.TextArea
          rows={3}
          placeholder={t('serviceRequests.detailPage.processApprovalModal.commentsPlaceholder')}
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
        />
      </Modal>
    </div>
  );
}