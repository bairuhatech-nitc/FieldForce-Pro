import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAsset, useDeleteAsset } from '@/hooks/use-assets';
import { useAssetMaintenancePlans } from '@/hooks/use-maintenance-plans';
import type { AssetMaintenancePlan } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id!);
  const { data: maintenancePlans, isLoading: plansLoading } = useAssetMaintenancePlans(id!);
  const deleteAsset = useDeleteAsset();

  const handleDelete = () => {
    if (!asset) return;
    showConfirmDialog({
      title: 'Delete Asset',
      content: `Are you sure you want to delete ${asset.name}?`,
      onOk: async () => {
        await deleteAsset.mutateAsync(asset.id);
        navigate('/assets');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Asset Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!asset) {
    return (
      <div>
        <PageHeader title="Asset Not Found" />
        <Card>Asset not found</Card>
      </div>
    );
  }

  const warrantyExpiry = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
  const isWarrantyActive = warrantyExpiry ? warrantyExpiry > new Date() : false;

  const planColumns: ColumnsType<AssetMaintenancePlan> = [
    { title: 'Plan Name', dataIndex: 'name', key: 'name' },
    { title: 'Frequency', dataIndex: 'frequency', key: 'frequency', render: (f: string) => <Tag>{f}</Tag> },
    { title: 'Next Due', dataIndex: 'next_due_date', key: 'next_due_date', render: (d: string) => d || '-' },
    { title: 'Auto WO', dataIndex: 'auto_create_wo', key: 'auto_create_wo', render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
  ];

  return (
    <div>
      <PageHeader
        title={asset.name}
        onBack={() => navigate('/assets')}
        extra={
          <Space>
            <PermissionGuard permission="assets:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/assets/${asset.id}/edit`)}>Edit</Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Delete</Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Asset Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Asset Name" span={2}>{asset.name}</Descriptions.Item>
          <Descriptions.Item label="Model">{asset.model || <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Serial Number">{asset.serial_number || <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Manufacturer">{asset.manufacturer || <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Category">{asset.category ? <Tag>{asset.category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Install Date">{asset.install_date || <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Warranty Expiry">
            {asset.warranty_expiry ? (
              <Space>
                {asset.warranty_expiry}
                <Tag color={isWarrantyActive ? 'green' : 'red'}>{isWarrantyActive ? 'Active' : 'Expired'}</Tag>
              </Space>
            ) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Health Score">
            {asset.health_score !== null ? (
              <Tag color={asset.health_score >= 80 ? 'green' : asset.health_score >= 50 ? 'orange' : 'red'}>{asset.health_score}%</Tag>
            ) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Customer">
            {asset.contact ? `${asset.contact.first_name} ${asset.contact.last_name}` : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Location" span={2}>
            {asset.location?.address || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>{asset.notes || <span style={{ opacity: 0.5 }}>-</span>}</Descriptions.Item>
          <Descriptions.Item label="Created At">{formatDateTime(asset.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Updated At">{formatDateTime(asset.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Maintenance Plans"
        style={{ marginTop: 16 }}
        extra={
          <PermissionGuard permission="assets:create">
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigate(`/maintenance-plans/new?asset_id=${asset.id}`)}>
              Add Plan
            </Button>
          </PermissionGuard>
        }
      >
        <Table
          columns={planColumns}
          dataSource={maintenancePlans || []}
          rowKey="id"
          loading={plansLoading}
          pagination={false}
          locale={{ emptyText: 'No maintenance plans configured' }}
        />
      </Card>

      {asset.custom_fields && Object.keys(asset.custom_fields).length > 0 && (
        <Card title="Custom Fields" style={{ marginTop: 16 }}>
          <Descriptions column={2} bordered>
            {Object.entries(asset.custom_fields).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{JSON.stringify(value)}</Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
