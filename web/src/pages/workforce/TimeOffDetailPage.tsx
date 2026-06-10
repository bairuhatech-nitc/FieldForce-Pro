import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Button, Space, Tag, Avatar, Typography, Row, Col,
  Descriptions, Empty, Modal, Form, Input, Select, DatePicker,
  Spin, Timeline, Alert, Progress, theme,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, CalendarOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined,
  SunOutlined, MedicineBoxOutlined, SmileOutlined, MinusCircleOutlined,
  QuestionCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import {
  useTimeOffRequest, useLeaveBalances, useLeaveConflicts,
  useUpdateTimeOffRequest, useUpdateTimeOffStatus, useCancelTimeOffRequest,
} from '@/hooks/use-time-off';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import type { TimeOffRequest } from '@/types/models.types';
import type { UpdateTimeOffRequestPayload } from '@/api/time-off.api';

const { Text, Title } = Typography;

// ── Constants (shared) ────────────────────────────────────────────────────────

const LEAVE_TYPE_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  vacation: { color: 'blue', label: 'Vacation', icon: <SunOutlined /> },
  sick: { color: 'red', label: 'Sick Leave', icon: <MedicineBoxOutlined /> },
  personal: { color: 'purple', label: 'Personal', icon: <SmileOutlined /> },
  unpaid: { color: 'orange', label: 'Unpaid', icon: <MinusCircleOutlined /> },
  other: { color: 'default', label: 'Other', icon: <QuestionCircleOutlined /> },
};

const DURATION_LABELS: Record<string, string> = {
  full_day: 'Full Day',
  morning_half: 'Morning Half',
  afternoon_half: 'Afternoon Half',
  multi_day: 'Multi-Day',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending' },
  approved: { color: 'green', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

const BALANCE_COLORS: Record<string, string> = {
  vacation: '#1677ff',
  sick: '#ff4d4f',
  personal: '#722ed1',
};

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditRequestModal({
  request, open, onClose,
}: {
  request: TimeOffRequest; open: boolean; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateMutation = useUpdateTimeOffRequest();

  const startDateRaw = Form.useWatch('start_date', form);
  const endDateRaw = Form.useWatch('end_date', form);
  const startDate: string | undefined = startDateRaw ? startDateRaw.format('YYYY-MM-DD') : undefined;
  const endDate: string | undefined = endDateRaw ? endDateRaw.format('YYYY-MM-DD') : undefined;
  const { data: conflicts } = useLeaveConflicts(startDate ?? '', endDate ?? '', request.user_id);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: UpdateTimeOffRequestPayload & { id: string } = {
        id: request.id,
        leave_type: values.leave_type,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        duration_type: values.duration_type,
        reason: values.reason,
      };
      await updateMutation.mutateAsync(payload);
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={<Space><EditOutlined style={{ color: '#fa8c16' }} />Edit Time-Off Request</Space>}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); }}
      onOk={handleSubmit}
      okText="Save Changes"
      confirmLoading={updateMutation.isPending}
      destroyOnClose
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue({
            leave_type: request.leave_type,
            start_date: dayjs(request.start_date),
            end_date: dayjs(request.end_date),
            duration_type: request.duration_type,
            reason: request.reason ?? undefined,
          });
        }
      }}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="leave_type" label="Leave Type" rules={[{ required: true }]}>
              <Select
                options={Object.entries(LEAVE_TYPE_CONFIG).map(([v, c]) => ({
                  label: <Space size={4}>{c.icon} {c.label}</Space>,
                  value: v,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="duration_type" label="Duration" rules={[{ required: true }]}>
              <Select
                options={Object.entries(DURATION_LABELS).map(([v, l]) => ({ label: l, value: v }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="MMM D, YYYY" />
            </Form.Item>
          </Col>
        </Row>
        {conflicts && conflicts.length > 0 && startDate && endDate && (
          <Alert
            type="warning"
            showIcon
            message={`${conflicts.length} team member(s) already on leave during these dates`}
            style={{ marginBottom: 12 }}
          />
        )}
        <Form.Item name="reason" label="Reason (optional)">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Approval Modal ────────────────────────────────────────────────────────────

function ApprovalModal({
  request, open, onClose,
}: {
  request: TimeOffRequest; open: boolean; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateStatus = useUpdateTimeOffStatus();

  const { data: balances } = useLeaveBalances(
    request.user_id,
    new Date(request.start_date).getFullYear(),
  );
  const relevantBalance = balances?.find((b) => b.leave_type === request.leave_type);
  const remaining = relevantBalance
    ? relevantBalance.total_allowance - Number(relevantBalance.used_days)
    : null;

  const handleAction = async (status: 'approved' | 'rejected') => {
    try {
      const values = await form.validateFields();
      await updateStatus.mutateAsync({ id: request.id, status, manager_notes: values.manager_notes });
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={<Space><CalendarOutlined />Review Time-Off Request</Space>}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button danger icon={<CloseCircleOutlined />} loading={updateStatus.isPending} onClick={() => handleAction('rejected')}>
            Reject
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={updateStatus.isPending}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => handleAction('approved')}
          >
            Approve
          </Button>
        </Space>
      }
      destroyOnClose
      width={480}
    >
      {remaining !== null && (
        <Alert
          type={remaining < request.total_days_deducted ? 'warning' : 'info'}
          showIcon
          message={`${LEAVE_TYPE_CONFIG[request.leave_type]?.label} Balance: ${remaining.toFixed(1)} days remaining`}
          description={
            remaining < request.total_days_deducted
              ? `Insufficient balance — will be ${(remaining - request.total_days_deducted).toFixed(1)} after approval.`
              : `After approval: ${(remaining - request.total_days_deducted).toFixed(1)} days remaining.`
          }
          style={{ marginBottom: 12 }}
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="manager_notes" label="Manager Notes (optional)">
          <Input.TextArea rows={2} placeholder="Add a note to the technician (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TimeOffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const { data: request, isLoading } = useTimeOffRequest(id!);
  const { data: balances } = useLeaveBalances(
    request?.user_id ?? '',
    request ? new Date(request.start_date).getFullYear() : undefined,
  );
  const cancelMutation = useCancelTimeOffRequest();

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!request) return <Empty description="Request not found" style={{ padding: 64 }} />;

  const leaveCfg = LEAVE_TYPE_CONFIG[request.leave_type] ?? { color: 'default', label: request.leave_type, icon: null };
  const statusCfg = STATUS_CONFIG[request.status] ?? { color: 'default', label: request.status };
  const relevantBalance = balances?.find((b) => b.leave_type === request.leave_type);
  const remaining = relevantBalance
    ? relevantBalance.total_allowance - Number(relevantBalance.used_days)
    : null;

  const handleDelete = () =>
    showConfirmDialog({
      title: 'Delete this request?',
      content: 'This will permanently remove the time-off request.',
      danger: true,
      onOk: async () => {
        await cancelMutation.mutateAsync(request.id);
        navigate('/workforce/time-off');
      },
    });

  // ── Timeline events ────────────────────────────────────────────────────────

  interface TimelineEvent {
    date: string;
    color: string;
    label: string;
    description?: string;
  }

  const events: TimelineEvent[] = [
    {
      date: request.created_at,
      color: 'blue',
      label: 'Request Submitted',
      description: request.reason ? `"${request.reason}"` : undefined,
    },
  ];

  if (request.status === 'approved') {
    events.push({
      date: request.updated_at,
      color: 'green',
      label: `Approved${request.approved_by_user ? ` by ${request.approved_by_user.first_name} ${request.approved_by_user.last_name}` : ''}`,
      description: request.manager_notes ?? undefined,
    });
  } else if (request.status === 'rejected') {
    events.push({
      date: request.updated_at,
      color: 'red',
      label: 'Rejected',
      description: request.manager_notes ?? undefined,
    });
  } else if (request.status === 'cancelled') {
    events.push({
      date: request.updated_at,
      color: 'gray',
      label: 'Cancelled',
    });
  } else {
    events.push({
      date: request.updated_at,
      color: 'orange',
      label: 'Awaiting Review',
    });
  }

  // Header actions
  const headerExtra = (
    <Space wrap>
      {request.status === 'pending' && (
        <>
          <Button icon={<CheckCircleOutlined />} type="primary" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={() => setApprovalOpen(true)}>
            Review
          </Button>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </>
      )}
      {(request.status === 'pending' || request.status === 'approved') && (
        <Button danger icon={<DeleteOutlined />} loading={cancelMutation.isPending} onClick={handleDelete}>
          Delete
        </Button>
      )}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workforce/time-off')}>
        Back
      </Button>
    </Space>
  );

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Row gutter={[16, 16]}>
          {/* Left: request details */}
          <Col xs={24} md={14}>
            <Card size="small" title="Request Details">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Leave Type">
                  <Tag color={leaveCfg.color} icon={leaveCfg.icon}>{leaveCfg.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Duration Type">
                  {DURATION_LABELS[request.duration_type]}
                </Descriptions.Item>
                <Descriptions.Item label="Start Date">
                  {dayjs(request.start_date).format('dddd, MMM D, YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="End Date">
                  {dayjs(request.end_date).format('dddd, MMM D, YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Days Requested">
                  <Text strong>{request.total_days_deducted}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Submitted">
                  {dayjs(request.created_at).format('MMM D, YYYY hh:mm A')}
                </Descriptions.Item>
                {request.reason && (
                  <Descriptions.Item label="Reason">{request.reason}</Descriptions.Item>
                )}
                {request.manager_notes && (
                  <Descriptions.Item label="Manager Notes">
                    <Text type="secondary">{request.manager_notes}</Text>
                  </Descriptions.Item>
                )}
                {request.approved_by_user && (
                  <Descriptions.Item label="Actioned By">
                    {request.approved_by_user.first_name} {request.approved_by_user.last_name}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* Right: requestor + balance */}
          <Col xs={24} md={10}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {/* Requestor */}
              <Card size="small" title="Requested By">
                <Space>
                  <Avatar src={request.user?.avatar_url} icon={<UserOutlined />} size={40} />
                  <div>
                    <Text
                      strong
                      style={{ color: '#1677ff', cursor: 'pointer', display: 'block' }}
                      onClick={() => request.user?.id && navigate(`/users/${request.user.id}`)}
                    >
                      {request.user?.first_name} {request.user?.last_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{request.user?.email}</Text>
                  </div>
                </Space>
              </Card>

              {/* Balance */}
              {relevantBalance && (
                <Card size="small" title={`${leaveCfg.label} Balance`}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Title level={3} style={{ margin: 0, color: BALANCE_COLORS[request.leave_type] ?? '#1677ff' }}>
                        {remaining}
                      </Title>
                      <Text type="secondary">/ {relevantBalance.total_allowance} days remaining</Text>
                    </Space>
                    <Progress
                      percent={relevantBalance.total_allowance > 0
                        ? Math.round((Number(relevantBalance.used_days) / relevantBalance.total_allowance) * 100)
                        : 0}
                      strokeColor={BALANCE_COLORS[request.leave_type] ?? '#1677ff'}
                      showInfo={false}
                      size="small"
                    />
                    {remaining !== null && remaining < request.total_days_deducted && (
                      <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        message="Insufficient balance for this request"
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </Space>
                </Card>
              )}

              {/* Conflicts quick check */}
              {request.status === 'pending' && (
                <Card size="small" title="Status">
                  <Space>
                    <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                    <Text>Awaiting manager review</Text>
                  </Space>
                </Card>
              )}
              {request.status === 'approved' && (
                <Card size="small" title="Status">
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text style={{ color: '#52c41a' }}>Approved</Text>
                  </Space>
                </Card>
              )}
              {request.status === 'rejected' && (
                <Card size="small" title="Status">
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <Text style={{ color: '#ff4d4f' }}>Rejected</Text>
                  </Space>
                </Card>
              )}
            </Space>
          </Col>
        </Row>
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: (
        <Card>
          <Timeline
            items={events.map((ev) => ({
              color: ev.color,
              children: (
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(ev.date).format('MMM D, YYYY hh:mm A')}
                  </Text>
                  <Text strong>{ev.label}</Text>
                  {ev.description && (
                    <Text type="secondary" style={{ fontSize: 13 }}>{ev.description}</Text>
                  )}
                </Space>
              ),
            }))}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <CalendarOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <div>
              <Text strong style={{ fontSize: 18, display: 'block', lineHeight: 1.3 }}>
                {leaveCfg.label} Request
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {request.user?.first_name} {request.user?.last_name} ·{' '}
                {dayjs(request.start_date).format('MMM D')} – {dayjs(request.end_date).format('MMM D, YYYY')}
              </Text>
            </div>
            <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
          </Space>
        }
        extra={headerExtra}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ background: token.colorBgContainer, padding: '0 16px 16px', borderRadius: 8 }}
      />

      {request.status === 'pending' && (
        <>
          <EditRequestModal request={request} open={editOpen} onClose={() => setEditOpen(false)} />
          <ApprovalModal request={request} open={approvalOpen} onClose={() => setApprovalOpen(false)} />
        </>
      )}
    </div>
  );
}
