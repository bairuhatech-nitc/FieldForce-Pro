import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Modal, DatePicker, InputNumber, Form } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import {
  useServiceAgreement,
  useDeleteServiceAgreement,
  useUpdateServiceAgreementStatus,
  useRenewServiceAgreement,
} from '@/hooks/use-service-agreements';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDate, formatDateTime } from '@/utils/format-date';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  active: 'green',
  expired: 'red',
  cancelled: 'orange',
  renewed: 'blue',
};

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agreement, isLoading } = useServiceAgreement(id!);
  const deleteAgreement = useDeleteServiceAgreement();
  const updateStatus = useUpdateServiceAgreementStatus();
  const renewAgreement = useRenewServiceAgreement();
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewForm] = Form.useForm();

  const handleDelete = () => {
    if (!agreement) return;
    showConfirmDialog({
      title: 'Delete Agreement',
      content: `Are you sure you want to delete "${agreement.name}"?`,
      onOk: async () => {
        await deleteAgreement.mutateAsync(agreement.id);
        navigate('/agreements');
      },
      danger: true,
    });
  };

  const handleCancel = () => {
    if (!agreement) return;
    showConfirmDialog({
      title: 'Cancel Agreement',
      content: `Are you sure you want to cancel "${agreement.name}"? This action cannot be undone.`,
      onOk: async () => {
        await updateStatus.mutateAsync({ id: agreement.id, status: 'cancelled' });
      },
      danger: true,
    });
  };

  const handleRenew = async (values: { end_date: dayjs.Dayjs; value?: number }) => {
    if (!agreement) return;
    await renewAgreement.mutateAsync({
      id: agreement.id,
      end_date: values.end_date.format('YYYY-MM-DD'),
      value: values.value,
    });
    setRenewModalOpen(false);
    renewForm.resetFields();
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Agreement Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div>
        <PageHeader title="Agreement Not Found" />
        <Card>Agreement not found</Card>
      </div>
    );
  }

  const status = agreement.status || 'draft';

  return (
    <div>
      <PageHeader
        title={agreement.name}
        onBack={() => navigate('/agreements')}
        extra={
          <Space>
            {status === 'active' && (
              <PermissionGuard permission="service-agreements:update">
                <Button icon={<ReloadOutlined />} onClick={() => setRenewModalOpen(true)}>Renew</Button>
              </PermissionGuard>
            )}
            {(status === 'active' || status === 'draft') && (
              <PermissionGuard permission="service-agreements:update">
                <Button danger icon={<StopOutlined />} onClick={handleCancel}>Cancel</Button>
              </PermissionGuard>
            )}
            <PermissionGuard permission="service-agreements:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/agreements/${agreement.id}/edit`)}>Edit</Button>
            </PermissionGuard>
            <PermissionGuard permission="service-agreements:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Delete</Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Agreement Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Name" span={2}>{agreement.name}</Descriptions.Item>
          <Descriptions.Item label="Type">{agreement.type || <span style={{ color: '#999' }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[status] || 'default'}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Contact">
            {agreement.contact
              ? `${agreement.contact.first_name} ${agreement.contact.last_name}`
              : <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Value">
            {agreement.value != null ? `$${Number(agreement.value).toLocaleString()}` : <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Start Date">{formatDate(agreement.start_date)}</Descriptions.Item>
          <Descriptions.Item label="End Date">{formatDate(agreement.end_date)}</Descriptions.Item>
          <Descriptions.Item label="SLA Response Hours">
            {agreement.sla_response_hours != null ? `${agreement.sla_response_hours}h` : <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="SLA Resolution Hours">
            {agreement.sla_resolution_hours != null ? `${agreement.sla_resolution_hours}h` : <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {agreement.description || <span style={{ color: '#999' }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">{formatDateTime(agreement.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Updated At">{formatDateTime(agreement.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="Renew Agreement"
        open={renewModalOpen}
        onCancel={() => { setRenewModalOpen(false); renewForm.resetFields(); }}
        onOk={() => renewForm.submit()}
        confirmLoading={renewAgreement.isPending}
      >
        <Form form={renewForm} layout="vertical" onFinish={handleRenew}>
          <Form.Item
            name="end_date"
            label="New End Date"
            rules={[{ required: true, message: 'Please select new end date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="value" label="New Value (optional)">
            <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} placeholder="Leave blank to keep current value" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
