import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useCommunication, useDeleteCommunication } from '@/hooks/use-communications';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

const channelColors: Record<string, string> = {
  email: 'blue',
  sms: 'green',
  phone: 'orange',
  whatsapp: 'green',
  chat: 'purple',
};

const directionColors: Record<string, string> = {
  inbound: 'blue',
  outbound: 'green',
};

const statusColors: Record<string, string> = {
  pending: 'blue',
  sent: 'green',
  delivered: 'cyan',
  failed: 'red',
  read: 'purple',
};

function formatValue(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function CommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: communication, isLoading } = useCommunication(id!);
  const deleteCommunication = useDeleteCommunication();

  const handleDelete = () => {
    if (!communication) return;
    showConfirmDialog({
      title: 'Delete Communication',
      content: 'Are you sure you want to delete this communication record?',
      onOk: async () => {
        await deleteCommunication.mutateAsync(communication.id);
        navigate('/communications');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Communication Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!communication) {
    return (
      <div>
        <PageHeader title="Communication Not Found" />
        <Card>Communication record not found</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Communication Details"
        onBack={() => navigate('/communications')}
        extra={
          <Space>
            <PermissionGuard permission="communications:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Communication Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Contact">
            {communication.contact_id || <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag color={statusColors[communication.status] || 'default'}>
              {formatValue(communication.status)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Channel">
            <Tag color={channelColors[communication.channel] || 'default'}>
              {formatValue(communication.channel)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Direction">
            <Tag color={directionColors[communication.direction] || 'default'}>
              {formatValue(communication.direction)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Subject" span={2}>
            {communication.subject || <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Body" span={2}>
            <div style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
              {communication.body || <span style={{ color: '#999' }}>-</span>}
            </div>
          </Descriptions.Item>

          <Descriptions.Item label="Sent At">
            {communication.sent_at ? formatDateTime(communication.sent_at) : <span style={{ color: '#999' }}>Not sent yet</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Status Details" span={2}>
            <span style={{ color: '#999' }}>Additional communication metadata not available</span>
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(communication.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(communication.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
