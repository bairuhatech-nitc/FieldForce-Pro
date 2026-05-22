import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Skeleton } from 'antd';
import { EditOutlined, DeleteOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useContact, useDeleteContact } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const deleteContact = useDeleteContact();

  const handleDelete = () => {
    if (!contact) return;
    showConfirmDialog({
      title: 'Delete Contact',
      content: `Are you sure you want to delete ${contact.first_name} ${contact.last_name}?`,
      onOk: async () => {
        await deleteContact.mutateAsync(contact.id);
        navigate('/contacts');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Contact Details" />
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  if (!contact) {
    return (
      <div>
        <PageHeader title="Contact Not Found" />
        <Card>Contact not found</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${contact.first_name} ${contact.last_name}`}
        onBack={() => navigate('/contacts')}
        extra={
          <Space>
            <PermissionGuard permission="contacts:update">
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/contacts/${contact.id}/edit`)}
              >
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="contacts:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Contact Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="First Name">{contact.first_name}</Descriptions.Item>
          <Descriptions.Item label="Last Name">{contact.last_name}</Descriptions.Item>

          <Descriptions.Item label="Email" span={2}>
            {contact.email ? (
              <Space>
                <MailOutlined />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </Space>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Phone" span={2}>
            {contact.phone ? (
              <Space>
                <PhoneOutlined />
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </Space>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Address" span={2}>
            {contact.address ? (
              <Space>
                <EnvironmentOutlined />
                {contact.address}
              </Space>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Tags" span={2}>
            {contact.tags && contact.tags.length > 0 ? (
              <Space wrap>
                {contact.tags.map((tag) => (
                  <Tag key={tag} color="blue">
                    {tag}
                  </Tag>
                ))}
              </Space>
            ) : (
              <span style={{ color: '#999' }}>No tags</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(contact.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(contact.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
        <Card title="Custom Fields" style={{ marginTop: 16 }}>
          <Descriptions column={2} bordered>
            {Object.entries(contact.custom_fields).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {JSON.stringify(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
