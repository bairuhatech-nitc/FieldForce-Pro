import { useNavigate, useParams } from 'react-router-dom';
import {
  Row, Col, Card, Statistic, Tag, Button, Descriptions, Space,
  Alert, Typography, Skeleton, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, TeamOutlined, FileTextOutlined,
  ToolOutlined, DollarOutlined, CheckCircleOutlined,
  StopOutlined, PlayCircleOutlined, ClusterOutlined,
} from '@ant-design/icons';
import { useTenantOverview, useSuspendTenant, useActivateTenant } from '@/hooks/use-super-admin';
import { formatDateTime } from '@/utils/format-date';

const { Title, Text } = Typography;

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant, isLoading } = useTenantOverview(id!);
  const suspendTenant = useSuspendTenant();
  const activateTenant = useActivateTenant();

  if (isLoading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Alert
        type="error"
        message="Tenant not found"
        action={<Button onClick={() => navigate('/admin/tenants')}>Back to Tenants</Button>}
      />
    );
  }

  return (
    <div>
      {/* Exit Banner */}
      <Alert
        type="warning"
        showIcon
        icon={<ClusterOutlined />}
        message={
          <Space>
            <Text strong>Super Admin — Viewing Tenant: {tenant.name}</Text>
            <Text type="secondary">(Read-Only View)</Text>
          </Space>
        }
        action={
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/tenants')}
          >
            Exit Tenant View
          </Button>
        }
        style={{ marginBottom: 24 }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{tenant.name}</Title>
          <Text type="secondary">/{tenant.slug}</Text>
        </div>
        <Space>
          {tenant.is_active ? (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 14, padding: '4px 12px' }}>Active</Tag>
          ) : (
            <Tag icon={<StopOutlined />} color="error" style={{ fontSize: 14, padding: '4px 12px' }}>Suspended</Tag>
          )}
          {tenant.is_active ? (
            <Popconfirm
              title={`Suspend ${tenant.name}?`}
              description="Their users will be unable to log in."
              onConfirm={() => suspendTenant.mutate(tenant.id)}
              okText="Suspend"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<StopOutlined />}>Suspend Tenant</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={`Reactivate ${tenant.name}?`}
              onConfirm={() => activateTenant.mutate(tenant.id)}
              okText="Reactivate"
            >
              <Button icon={<PlayCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}>
                Reactivate Tenant
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Users"
              value={tenant.user_count}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Service Requests"
              value={tenant.service_request_count}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Work Orders"
              value={tenant.work_order_count}
              prefix={<ToolOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Invoices"
              value={tenant.invoice_count}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tenant Details */}
      <Card title="Tenant Information" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Company Name">{tenant.name}</Descriptions.Item>
          <Descriptions.Item label="Slug">{tenant.slug}</Descriptions.Item>
          <Descriptions.Item label="Admin Email">
            {tenant.admin_email ? <Text copyable>{tenant.admin_email}</Text> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Admin Name">{tenant.admin_name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Subscription Plan">
            <Tag color={tenant.subscription_plan === 'enterprise' ? 'gold' : tenant.subscription_plan === 'professional' ? 'blue' : 'default'}>
              {tenant.subscription_plan.charAt(0).toUpperCase() + tenant.subscription_plan.slice(1)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Max Users">{tenant.max_users}</Descriptions.Item>
          <Descriptions.Item label="Domain">{tenant.domain ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            {tenant.is_active
              ? <Tag color="success">Active</Tag>
              : <Tag color="error">Suspended</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Registered">{formatDateTime(tenant.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{formatDateTime(tenant.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Exit Footer */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <Button
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/tenants')}
        >
          Exit Tenant View — Return to Super Admin Dashboard
        </Button>
      </div>
    </div>
  );
}
