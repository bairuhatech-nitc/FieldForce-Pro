import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Spin, Tag, Empty, Row, Col, Badge, Timeline, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, ToolOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useMaintenancePlan, useDeleteMaintenancePlan } from '@/hooks/use-maintenance-plans';
import { formatDateTime } from '@/utils/format-date';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';

export default function MaintenancePlanDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: plan, isLoading } = useMaintenancePlan(id || '');
  const deleteMaintenancePlan = useDeleteMaintenancePlan();

  const handleDelete = () => {
    if (!plan) return;

    showConfirmDialog({
      title: 'Delete Maintenance Plan',
      content: `Are you sure you want to delete the maintenance plan "${plan.name}"?`,
      onOk: async () => {
        await deleteMaintenancePlan.mutateAsync(plan.id);
        navigate('/maintenance-plans');
      },
      danger: true,
    });
  };

  const getFrequencyColor = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'blue',
      weekly: 'cyan',
      monthly: 'green',
      quarterly: 'orange',
      yearly: 'purple',
    };
    return colors[frequency] || 'default';
  };

  const getNextScheduledDates = (frequency: string, nextDue: string | null): string[] => {
    if (!nextDue) return [];
    const dates = [];
    const startDate = new Date(nextDue);

    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      switch (frequency) {
        case 'daily':
          date.setDate(date.getDate() + i);
          break;
        case 'weekly':
          date.setDate(date.getDate() + (i * 7));
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + i);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() + (i * 3));
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() + i);
          break;
      }
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ padding: 100 }}>
        <Empty description="Maintenance plan not found" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/maintenance-plans')}>
            Back to Maintenance Plans
          </Button>
        </div>
      </div>
    );
  }

  const isOverdue = plan.next_due_date && new Date(plan.next_due_date) < new Date();

  return (
    <div>
      <PageHeader
        title="Maintenance Plan Details"
        subtitle={`Viewing plan: ${plan.name}`}
        onBack={() => navigate('/maintenance-plans')}
        extra={
          <Space>
            <PermissionGuard permission="asset_maintenance_plans:update">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/maintenance-plans/${id}/edit`)}
              >
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="asset_maintenance_plans:delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      {isOverdue && (
        <Alert
          message="Maintenance Overdue"
          description={`This maintenance plan is overdue. The next scheduled date was ${formatDateTime(plan.next_due_date!)}.`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Plan Information" style={{ marginBottom: 24 }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Name" span={2}>
                <Space>
                  <ToolOutlined />
                  <span style={{ fontWeight: 500 }}>{plan.name}</span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Description" span={2}>
                {plan.description || <span style={{ color: '#999' }}>No description provided</span>}
              </Descriptions.Item>

              <Descriptions.Item label="Asset">
                {plan.asset?.name || <span style={{ color: '#999' }}>Asset #{plan.asset_id.slice(0, 8)}</span>}
              </Descriptions.Item>

              <Descriptions.Item label="Frequency">
                <Tag color={getFrequencyColor(plan.frequency)}>
                  {plan.frequency.charAt(0).toUpperCase() + plan.frequency.slice(1)}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Next Due Date">
                {plan.next_due_date ? (
                  <Space>
                    <CalendarOutlined style={{ color: isOverdue ? '#ff4d4f' : '#52c41a' }} />
                    <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
                      {formatDateTime(plan.next_due_date)}
                    </span>
                    {isOverdue && <Badge status="error" text="Overdue" />}
                  </Space>
                ) : (
                  <span style={{ color: '#999' }}>Not scheduled</span>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Last Completed">
                {plan.last_completed_date ? (
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    {formatDateTime(plan.last_completed_date)}
                  </Space>
                ) : (
                  <span style={{ color: '#999' }}>Never completed</span>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Auto Create Work Order">
                <Badge status={plan.auto_create_wo ? 'success' : 'default'}
                       text={plan.auto_create_wo ? 'Enabled' : 'Disabled'} />
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                <Badge status={plan.is_active ? 'success' : 'warning'}
                       text={plan.is_active ? 'Active' : 'Inactive'} />
              </Descriptions.Item>

              <Descriptions.Item label="Created At">
                {formatDateTime(plan.created_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Updated At">
                {formatDateTime(plan.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Upcoming Schedule" style={{ marginBottom: 24 }}>
            {plan.next_due_date && plan.is_active ? (
              <Timeline>
                {getNextScheduledDates(plan.frequency, plan.next_due_date).map((date, index) => (
                  <Timeline.Item
                    key={date}
                    color={index === 0 && isOverdue ? 'red' : index === 0 ? 'green' : 'gray'}
                    dot={index === 0 ? <ClockCircleOutlined /> : undefined}
                  >
                    <div>
                      <strong>{formatDateTime(date)}</strong>
                      {index === 0 && (
                        <div style={{ fontSize: 12, color: isOverdue ? '#ff4d4f' : '#52c41a' }}>
                          {isOverdue ? 'Overdue' : 'Next Due'}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={plan.is_active ? "No schedule set" : "Plan is inactive"}
              />
            )}
          </Card>

          {plan.custom_fields && Object.keys(plan.custom_fields).length > 0 && (
            <Card title="Custom Fields">
              <Descriptions column={1} size="small">
                {Object.entries(plan.custom_fields).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}