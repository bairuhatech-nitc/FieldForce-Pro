import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useWebform, useDeleteWebform } from '@/hooks/use-webforms';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import { useNotificationStore } from '@/store/notification.store';

const { Paragraph, Text } = Typography;

export default function WebformDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: webform, isLoading } = useWebform(id!);
  const deleteWebform = useDeleteWebform();
  const addNotification = useNotificationStore((s) => s.add);

  const handleDelete = () => {
    if (!webform) return;
    showConfirmDialog({
      title: 'Delete Webform',
      content: `Are you sure you want to delete "${webform.name}"?`,
      onOk: async () => {
        await deleteWebform.mutateAsync(webform.id);
        navigate('/webforms');
      },
      danger: true,
    });
  };

  const handleCopyEmbedCode = () => {
    if (!webform) return;
    const embedCode = `<iframe src="${window.location.origin}/embed/webform/${webform.id}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    addNotification({ type: 'success', message: 'Embed code copied to clipboard' });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Webform Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!webform) {
    return (
      <div>
        <PageHeader title="Webform Not Found" />
        <Card>Webform not found</Card>
      </div>
    );
  }

  const embedCode = `<iframe src="${window.location.origin}/embed/webform/${webform.id}" width="100%" height="600" frameborder="0"></iframe>`;

  return (
    <div>
      <PageHeader
        title={webform.name}
        onBack={() => navigate('/webforms')}
        extra={
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopyEmbedCode}>
              Copy Embed Code
            </Button>
            <PermissionGuard permission="webforms:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/webforms/${webform.id}/edit`)}>
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="webforms:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Webform Information">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Name">{webform.name}</Descriptions.Item>

          <Descriptions.Item label="Status">
            {webform.is_active ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag color="default">Inactive</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Fields">
            <Paragraph>
              <pre style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 300,
              }}>
                {typeof webform.fields === 'string'
                  ? webform.fields
                  : JSON.stringify(webform.fields, null, 2)}
              </pre>
            </Paragraph>
          </Descriptions.Item>

          <Descriptions.Item label="Styling">
            <Paragraph>
              <pre style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 300,
              }}>
                {typeof webform.styling === 'string'
                  ? webform.styling
                  : JSON.stringify(webform.styling, null, 2)}
              </pre>
            </Paragraph>
          </Descriptions.Item>

          <Descriptions.Item label="Redirect URL">
            {webform.redirect_url ? (
              <a href={webform.redirect_url} target="_blank" rel="noopener noreferrer">
                {webform.redirect_url}
              </a>
            ) : (
              <span style={{ color: '#999' }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Embed Code">
            <Paragraph
              copyable={{ text: embedCode }}
              style={{ marginBottom: 0 }}
            >
              <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {embedCode}
              </Text>
            </Paragraph>
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(webform.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(webform.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
