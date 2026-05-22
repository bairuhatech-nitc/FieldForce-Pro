import { useNavigate } from 'react-router-dom';
import { Modal, Descriptions, Tag, Timeline, Spin, Typography, Button } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useDocumentApproval, useApprovalHistory } from '@/hooks/use-workflow';
import { formatDateTime } from '@/utils/format-date';

const { Text } = Typography;

const documentRoutes: Record<string, (docId: string) => string> = {
  SERVICE_REQUEST: (id) => `/service-requests/${id}`,
  WORK_ORDER: (id) => `/work-orders/${id}`,
  ESTIMATE: (id) => `/estimates/${id}`,
  ESTIMATE_APPROVAL: (id) => `/estimates/${id}`,
  SCHEDULE: (id) => `/scheduling?tab=review&appointment_id=${id}`,
  FIELD_WORKFLOW: (id) => `/work-orders?wo_id=${id}#field-workflow`,
};

interface ApprovalDetailsModalProps {
  open: boolean;
  onClose: () => void;
  approvalId: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  SKIPPED: 'default',
  CORRECTION_REQUIRED: 'gold',
};

const actionIcons: Record<string, React.ReactNode> = {
  APPROVE: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  REJECT: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  REQUEST_CORRECTION: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  SKIP: <ClockCircleOutlined style={{ opacity: 0.5 }} />,
  DELEGATE: <SwapOutlined style={{ color: '#1890ff' }} />,
  ESCALATE: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
};

export default function ApprovalDetailsModal({
  open,
  onClose,
  approvalId,
}: ApprovalDetailsModalProps) {
  const navigate = useNavigate();
  const { data: approval, isLoading: approvalLoading } = useDocumentApproval(approvalId);
  const { data: history, isLoading: historyLoading } = useApprovalHistory(approvalId);

  return (
    <Modal
      title="Approval Details"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {approvalLoading ? (
        <Spin />
      ) : approval ? (
        <>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Document ID">
              <Text copyable>{approval.document_id}</Text>
              {documentRoutes[approval.document_type] && (
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => {
                    onClose();
                    navigate(documentRoutes[approval.document_type](approval.document_id));
                  }}
                >
                  View
                </Button>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Document Type">
              <Tag>{approval.document_type.replace(/_/g, ' ')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Approver">
              {approval.approver
                ? `${approval.approver.first_name} ${approval.approver.last_name}`
                : approval.approver_id}
            </Descriptions.Item>
            <Descriptions.Item label="Step">#{approval.order_no}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[approval.status]}>{approval.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Workflow">
              {approval.workflow_template?.name || approval.workflow_id}
            </Descriptions.Item>
            {approval.comments && (
              <Descriptions.Item label="Comments" span={2}>
                {approval.comments}
              </Descriptions.Item>
            )}
            {approval.action_date && (
              <Descriptions.Item label="Action Date">
                {formatDateTime(approval.action_date)}
              </Descriptions.Item>
            )}
            {approval.due_date && (
              <Descriptions.Item label="Due Date">
                {formatDateTime(approval.due_date)}
              </Descriptions.Item>
            )}
            {approval.delegated_from_id && (
              <Descriptions.Item label="Delegated From" span={2}>
                {approval.delegated_from_id}
              </Descriptions.Item>
            )}
          </Descriptions>

          <h4>History</h4>
          {historyLoading ? (
            <Spin />
          ) : history && history.length > 0 ? (
            <Timeline
              items={history.map((h) => ({
                dot: actionIcons[h.action] || <ClockCircleOutlined />,
                children: (
                  <div>
                    <Text strong>{h.action.replace(/_/g, ' ')}</Text>
                    <span style={{ marginLeft: 8, opacity: 0.5 }}>
                      {h.actor
                        ? `by ${h.actor.first_name} ${h.actor.last_name}`
                        : h.actor_id}
                    </span>
                    <br />
                    <Text type="secondary">{formatDateTime(h.created_at)}</Text>
                    {h.comments && (
                      <>
                        <br />
                        <Text italic>{h.comments}</Text>
                      </>
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">No history available</Text>
          )}
        </>
      ) : (
        <Text type="secondary">Approval not found</Text>
      )}
    </Modal>
  );
}
