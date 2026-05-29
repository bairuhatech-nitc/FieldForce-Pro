import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Row, Col, Card, Statistic, Tag, Button, Descriptions, Space,
  Alert, Typography, Skeleton, Popconfirm, Progress, Modal, Form,
  Select, InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined, TeamOutlined, FileTextOutlined,
  ToolOutlined, DollarOutlined, CheckCircleOutlined,
  StopOutlined, PlayCircleOutlined, ClusterOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import {
  useTenantOverview, useSuspendTenant, useActivateTenant,
  useTenantUsage, useSubscriptionPlans, useUpdateTenantSubscription,
} from '@/hooks/use-super-admin';
import { formatDateTime } from '@/utils/format-date';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  trial: 'blue',
  active: 'success',
  suspended: 'error',
  cancelled: 'default',
  expired: 'warning',
};

function getProgressStatus(pct: number): 'normal' | 'exception' | 'active' {
  if (pct > 90) return 'exception';
  return 'normal';
}

function getProgressColor(pct: number) {
  if (pct > 90) return '#ff4d4f';
  if (pct > 70) return '#faad14';
  return '#52c41a';
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subForm] = Form.useForm();

  const { data: tenant, isLoading } = useTenantOverview(id!);
  const { data: usage } = useTenantUsage(id!);
  const { data: plans } = useSubscriptionPlans();
  const suspendTenant = useSuspendTenant();
  const activateTenant = useActivateTenant();
  const updateSubscription = useUpdateTenantSubscription();

  const handleOpenSubModal = () => {
    subForm.setFieldsValue({
      plan_id: tenant?.subscription_plan_id ?? undefined,
      subscription_status: tenant?.subscription_status ?? 'trial',
      subscription_end: tenant?.subscription_end ? dayjs(tenant.subscription_end) : null,
      max_users_override: tenant?.custom_limits?.max_total_users ?? null,
    });
    setSubModalOpen(true);
  };

  const handleSubModalOk = () => {
    subForm.validateFields().then((values) => {
      updateSubscription.mutate(
        {
          id: id!,
          plan_id: values.plan_id || undefined,
          subscription_status: values.subscription_status || undefined,
          subscription_end: values.subscription_end
            ? (values.subscription_end as ReturnType<typeof dayjs>).toISOString()
            : null,
          max_users_override: values.max_users_override ?? null,
        },
        {
          onSuccess: () => setSubModalOpen(false),
        },
      );
    });
  };

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

  const usageCurrent = usage?.usage?.total_users?.current ?? tenant.user_count;
  const usageLimit = usage?.usage?.total_users?.limit;
  const usagePct = usageLimit ? Math.round((usageCurrent / usageLimit) * 100) : 0;

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

      {/* Subscription Section */}
      <Card
        title="Subscription"
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<EditOutlined />} onClick={handleOpenSubModal}>
            Update Subscription
          </Button>
        }
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Plan</Text>
            <div style={{ marginTop: 4 }}>
              <Text strong>{usage?.plan_name ?? tenant.subscription_plan}</Text>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            <div style={{ marginTop: 4 }}>
              <Tag color={STATUS_COLORS[tenant.subscription_status ?? 'trial'] ?? 'default'}>
                {(tenant.subscription_status ?? 'trial').charAt(0).toUpperCase() +
                  (tenant.subscription_status ?? 'trial').slice(1)}
              </Tag>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Subscription End</Text>
            <div style={{ marginTop: 4 }}>
              <Text>{tenant.subscription_end ? formatDateTime(tenant.subscription_end) : '—'}</Text>
            </div>
          </Col>
          <Col xs={24}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Users: {usageCurrent} / {usageLimit ?? '∞'}
            </Text>
            {usageLimit ? (
              <Progress
                percent={usagePct}
                strokeColor={getProgressColor(usagePct)}
                status={getProgressStatus(usagePct)}
                style={{ marginTop: 4 }}
              />
            ) : (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">Unlimited users on this plan</Text>
              </div>
            )}
          </Col>
        </Row>
      </Card>

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

      {/* Update Subscription Modal */}
      <Modal
        open={subModalOpen}
        title="Update Subscription"
        okText="Save Changes"
        cancelText="Cancel"
        confirmLoading={updateSubscription.isPending}
        onOk={handleSubModalOk}
        onCancel={() => setSubModalOpen(false)}
        width={480}
      >
        <Form form={subForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="plan_id" label="Subscription Plan">
            <Select
              placeholder="Select a plan"
              allowClear
              options={plans?.map((p) => ({
                label: `${p.name} ($${p.price_monthly}/mo)`,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="subscription_status" label="Status">
            <Select
              placeholder="Select status"
              options={[
                { label: 'Trial', value: 'trial' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Expired', value: 'expired' },
              ]}
            />
          </Form.Item>

          <Form.Item name="subscription_end" label="Subscription End Date">
            <DatePicker style={{ width: '100%' }} allowClear />
          </Form.Item>

          <Form.Item
            name="max_users_override"
            label="Max Users Override"
            extra="Leave empty to use the plan's default limit"
          >
            <InputNumber
              min={1}
              placeholder="e.g. 50"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
