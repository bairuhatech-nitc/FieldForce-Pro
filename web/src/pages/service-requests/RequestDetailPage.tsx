import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Steps, Modal, Input, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import {
  useServiceRequest,
  useDeleteServiceRequest,
  useUpdateServiceRequestStatus,
  useServiceRequestApprovals,
  useProcessServiceRequestApproval,
} from '@/hooks/use-service-requests';
import { useAuthStore } from '@/store/auth.store';
import { usePermission } from '@/components/permissions/usePermission';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/utils/format-date';
import FileUploadZone from '@/components/service-requests/FileUploadZone';

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
  closed: 'default',
  spam: 'red',
};

const statusTransitions: Record<string, string[]> = {
  new: ['triaged', 'spam'],
  triaged: ['estimated', 'closed', 'spam'],
  estimated: ['approved', 'closed'],
  approved: ['converted_to_wo', 'closed'],
  converted_to_wo: ['closed'],
  closed: [],
  spam: [],
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isAdmin } = usePermission();
  const { data: request, isLoading, error: requestError } = useServiceRequest(id!);
  const { data: approvals, refetch: refetchApprovals } = useServiceRequestApprovals(id!);
  const deleteRequest = useDeleteServiceRequest();
  const updateStatus = useUpdateServiceRequestStatus();
  const processApproval = useProcessServiceRequestApproval();

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvalComments, setApprovalComments] = useState('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');

  const handleDelete = () => {
    if (!request) return;
    showConfirmDialog({
      title: 'Delete Service Request',
      content: `Are you sure you want to delete "${request.subject}"?`,
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
        <PageHeader title="Service Request Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!request) {
    const errorStatus = (requestError as { response?: { status?: number } })?.response?.status;
    const errorMessage = errorStatus === 403
      ? 'You do not have permission to view this service request.'
      : errorStatus === 404
        ? 'Service request not found.'
        : requestError
          ? `Failed to load service request: ${(requestError as Error).message}`
          : 'Service request not found.';
    return (
      <div>
        <PageHeader title={errorStatus === 403 ? 'Access Denied' : 'Service Request Not Found'} onBack={() => navigate('/service-requests')} />
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
              <Button icon={<EditOutlined />} onClick={() => navigate(`/service-requests/${request.id}/edit`)}>
                Edit
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </Space>
          ) : undefined
        }
      />

      {request.is_spam && (
        <Alert
          message="This request was flagged as potential spam/duplicate"
          description={
            <div>
              <strong>Reason:</strong> {request.spam_reason || 'Similarity detected'}<br/>
              <strong>Confidence:</strong> {request.spam_confidence ? `${(request.spam_confidence * 100).toFixed(1)}%` : 'N/A'}
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
            <span style={{ fontWeight: 500 }}>Transition to:</span>
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
          title="Your Approval Required"
          style={{ marginBottom: 16, borderColor: '#faad14' }}
        >
          <p>This service request is awaiting your approval.</p>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => openApprovalModal(myPendingApproval.id, 'APPROVE')}
            >
              Approve
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => openApprovalModal(myPendingApproval.id, 'REJECT')}
            >
              Reject
            </Button>
          </Space>
        </Card>
      )}

      <Card title="Service Request Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Request ID">
            <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#1890ff' }}>
              {request.request_number || '-'}
            </span>
          </Descriptions.Item>

          <Descriptions.Item label="Subject">
            {request.subject}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag color={statusColors[request.status] || 'default'}>
              {formatStatus(request.status)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Priority">
            <Tag color={priorityColors[request.priority] || 'default'}>
              {request.priority?.charAt(0).toUpperCase() + request.priority?.slice(1)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Channel">
            {request.channel ? (
              <Tag>{request.channel.charAt(0).toUpperCase() + request.channel.slice(1)}</Tag>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Category">
            {request.category ? <Tag>{request.category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Customer">
            {request.contact
              ? `${request.contact.first_name} ${request.contact.last_name}`
              : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Location">
            {request.location?.address || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Description" span={2}>
            {request.description || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Scheduled Date">
            {request.scheduled_start ? formatDateTime(request.scheduled_start) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Assigned To">
            {request.assigned_to || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(request.created_at)}
          </Descriptions.Item>

          <Descriptions.Item label="Updated At">
            {formatDateTime(request.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {typedApprovals && typedApprovals.length > 0 && (
        <Card title="Approval Status" style={{ marginTop: 16 }}>
          <Steps
            direction="vertical"
            size="small"
            current={typedApprovals.findIndex((a) => a.status === 'PENDING')}
            items={typedApprovals.map((approval) => {
              const approverName = approval.approver
                ? `${approval.approver.first_name || ''} ${approval.approver.last_name || ''}`.trim()
                : 'Unknown';

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
                      {approval.status}
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

      <Card title="Attachments" style={{ marginTop: 16 }}>
        <FileUploadZone requestId={request.id} />
      </Card>

      {/* Approval Action Modal */}
      <Modal
        title={approvalAction === 'APPROVE' ? 'Approve Service Request' : 'Reject Service Request'}
        open={approvalModalOpen}
        onOk={handleProcessApproval}
        onCancel={() => setApprovalModalOpen(false)}
        confirmLoading={processApproval.isPending}
        okText={approvalAction === 'APPROVE' ? 'Approve' : 'Reject'}
        okButtonProps={{
          danger: approvalAction === 'REJECT',
        }}
      >
        <p>
          {approvalAction === 'APPROVE'
            ? 'Are you sure you want to approve this service request?'
            : 'Are you sure you want to reject this service request? This will skip all remaining approvers.'}
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Add comments (optional)"
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
        />
      </Modal>
    </div>
  );
}
