import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton } from 'antd';
import { EditOutlined, DeleteOutlined, GlobalOutlined } from '@ant-design/icons';
import { useCompany, useDeleteCompany } from '@/hooks/use-companies';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(id!);
  const deleteCompany = useDeleteCompany();

  const handleDelete = () => {
    if (!company) return;
    showConfirmDialog({
      title: 'Delete Company',
      content: `Are you sure you want to delete ${company.name}?`,
      onOk: async () => {
        await deleteCompany.mutateAsync(company.id);
        navigate('/companies');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Company Details" />
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeader title="Company Not Found" />
        <Card>Company not found</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={company.name}
        onBack={() => navigate('/companies')}
        extra={
          <Space>
            <PermissionGuard permission="companies:update">
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/companies/${company.id}/edit`)}
              >
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="companies:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Company Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Company Name" span={2}>
            {company.name}
          </Descriptions.Item>

          <Descriptions.Item label="Industry">
            {company.industry || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Tax ID">
            {company.tax_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Website" span={2}>
            {company.website ? (
              <Space>
                <GlobalOutlined />
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  {company.website}
                </a>
              </Space>
            ) : (
              <span style={{ opacity: 0.5 }}>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Billing Address" span={2}>
            {company.billing_address || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Notes" span={2}>
            {company.notes || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(company.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(company.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {company.custom_fields && Object.keys(company.custom_fields).length > 0 && (
        <Card title="Custom Fields" style={{ marginTop: 16 }}>
          <Descriptions column={2} bordered>
            {Object.entries(company.custom_fields).map(([key, value]) => (
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
