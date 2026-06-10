import { useState } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select,
  Avatar, Badge, Typography, Row, Col, Card, DatePicker,
  Alert, Tabs, Progress, Empty, Descriptions, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, ClockCircleOutlined, WarningOutlined, SunOutlined,
  MedicineBoxOutlined, SmileOutlined, MinusCircleOutlined, QuestionCircleOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import {
  useTimeOffRequests, useMyLeaveBalances, useLeaveBalances, useLeaveConflicts,
  useCreateTimeOffRequest, useUpdateTimeOffRequest, useUpdateTimeOffStatus,
  useCancelTimeOffRequest,
} from '@/hooks/use-time-off';
import { useAgents } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth.store';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import type { TimeOffRequest, TimeOffBalance } from '@/types/models.types';
import type {
  CreateTimeOffRequestPayload, UpdateTimeOffRequestPayload, UpdateTimeOffStatusPayload,
} from '@/api/time-off.api';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Balance Card ──────────────────────────────────────────────────────────────

function BalanceCard({ balance }: { balance: TimeOffBalance }) {
  const used = Number(balance.used_days);
  const total = balance.total_allowance;
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const cfg = LEAVE_TYPE_CONFIG[balance.leave_type];
  const color = BALANCE_COLORS[balance.leave_type] ?? '#1677ff';

  return (
    <Card size="small" style={{ borderRadius: 8, borderTop: `3px solid ${color}` }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
        <Space>
          <Title level={3} style={{ margin: 0, color }}>{remaining}</Title>
          <Text type="secondary">/ {total} days left</Text>
        </Space>
        <Progress percent={pct} strokeColor={color} showInfo={false} size="small" style={{ margin: 0 }} />
        <Text type="secondary" style={{ fontSize: 11 }}>{used} used · {remaining} remaining</Text>
      </Space>
    </Card>
  );
}

// ── Approval Modal ────────────────────────────────────────────────────────────

function ApprovalModal({
  request, open, onClose,
}: {
  request: TimeOffRequest | null; open: boolean; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateStatus = useUpdateTimeOffStatus();

  const { data: balances } = useLeaveBalances(
    request?.user_id ?? '',
    request ? new Date(request.start_date).getFullYear() : undefined,
  );
  const { data: conflicts } = useLeaveConflicts(
    request?.start_date ?? '',
    request?.end_date ?? '',
    request?.user_id,
  );

  const relevantBalance = balances?.find((b) => b.leave_type === request?.leave_type);
  const remaining = relevantBalance
    ? relevantBalance.total_allowance - Number(relevantBalance.used_days)
    : null;

  const handleAction = async (status: 'approved' | 'rejected') => {
    try {
      const values = await form.validateFields();
      await updateStatus.mutateAsync({ id: request!.id, status, manager_notes: values.manager_notes });
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          Review Time-Off Request
          {request && <Text type="secondary" style={{ fontWeight: 400 }}>— {request.user?.first_name} {request.user?.last_name}</Text>}
        </Space>
      }
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
      width={560}
    >
      {request && (
        <>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="Leave Type">
              <Tag color={LEAVE_TYPE_CONFIG[request.leave_type]?.color}>
                {LEAVE_TYPE_CONFIG[request.leave_type]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Duration">{DURATION_LABELS[request.duration_type]}</Descriptions.Item>
            <Descriptions.Item label="Start">{dayjs(request.start_date).format('MMM D, YYYY')}</Descriptions.Item>
            <Descriptions.Item label="End">{dayjs(request.end_date).format('MMM D, YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Days Requested" span={2}>
              <Text strong>{request.total_days_deducted}</Text>
            </Descriptions.Item>
          </Descriptions>

          {request.reason && (
            <div style={{ margin: '12px 0' }}>
              <Text type="secondary">Technician's reason:</Text>
              <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 6, marginTop: 4 }}>
                <Text>{request.reason}</Text>
              </div>
            </div>
          )}

          {remaining !== null && (
            <Alert
              type={remaining < request.total_days_deducted ? 'warning' : 'info'}
              showIcon
              icon={remaining < request.total_days_deducted ? <WarningOutlined /> : undefined}
              message={`${LEAVE_TYPE_CONFIG[request.leave_type]?.label} Balance: ${remaining.toFixed(1)} days remaining`}
              description={
                remaining < request.total_days_deducted
                  ? `Insufficient balance — technician has ${remaining.toFixed(1)} days but requested ${request.total_days_deducted}.`
                  : `After approval, remaining balance will be ${(remaining - request.total_days_deducted).toFixed(1)} days.`
              }
              style={{ marginBottom: 12 }}
            />
          )}

          {conflicts && conflicts.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`${conflicts.length} other technician(s) already on leave during these dates`}
              description={
                <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                  {conflicts.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      {c.user?.first_name} {c.user?.last_name} —{' '}
                      {dayjs(c.start_date).format('MMM D')} to {dayjs(c.end_date).format('MMM D')}
                    </li>
                  ))}
                  {conflicts.length > 5 && <li>…and {conflicts.length - 5} more</li>}
                </ul>
              }
              style={{ marginBottom: 12 }}
            />
          )}

          <Form form={form} layout="vertical">
            <Form.Item name="manager_notes" label="Manager Notes (optional)">
              <Input.TextArea rows={2} placeholder="Add a note to the technician (optional)" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}

// ── Edit Request Modal ────────────────────────────────────────────────────────

function EditRequestModal({
  request, open, onClose,
}: {
  request: TimeOffRequest | null; open: boolean; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateMutation = useUpdateTimeOffRequest();

  const startDateRaw = Form.useWatch('start_date', form);
  const endDateRaw = Form.useWatch('end_date', form);
  const startDate: string | undefined = startDateRaw ? startDateRaw.format('YYYY-MM-DD') : undefined;
  const endDate: string | undefined = endDateRaw ? endDateRaw.format('YYYY-MM-DD') : undefined;
  const { data: conflicts } = useLeaveConflicts(startDate ?? '', endDate ?? '', request?.user_id);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: UpdateTimeOffRequestPayload & { id: string } = {
        id: request!.id,
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

  const handleOpen = () => {
    if (request) {
      form.setFieldsValue({
        leave_type: request.leave_type,
        start_date: dayjs(request.start_date),
        end_date: dayjs(request.end_date),
        duration_type: request.duration_type,
        reason: request.reason ?? undefined,
      });
    }
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
      afterOpenChange={(visible) => { if (visible) handleOpen(); }}
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
          <Input.TextArea rows={2} placeholder="Briefly describe the reason for your leave" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Request Form Modal (create) ───────────────────────────────────────────────

function RequestFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const createMutation = useCreateTimeOffRequest();
  const startDateRaw = Form.useWatch('start_date', form);
  const endDateRaw = Form.useWatch('end_date', form);
  const startDate: string | undefined = startDateRaw ? startDateRaw.format('YYYY-MM-DD') : undefined;
  const endDate: string | undefined = endDateRaw ? endDateRaw.format('YYYY-MM-DD') : undefined;

  const { data: conflicts } = useLeaveConflicts(startDate ?? '', endDate ?? '', undefined);
  const { data: myBalances } = useMyLeaveBalances();
  const leaveType = Form.useWatch('leave_type', form);
  const relevantBalance = myBalances?.find((b) => b.leave_type === leaveType);
  const remaining = relevantBalance
    ? relevantBalance.total_allowance - Number(relevantBalance.used_days)
    : null;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateTimeOffRequestPayload = {
        leave_type: values.leave_type,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        duration_type: values.duration_type,
        reason: values.reason,
      };
      await createMutation.mutateAsync(payload);
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={<Space><CalendarOutlined />Request Time Off</Space>}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Submit Request"
      confirmLoading={createMutation.isPending}
      destroyOnClose
      width={500}
    >
      {myBalances && myBalances.length > 0 && (
        <Row gutter={8} style={{ marginBottom: 16 }}>
          {myBalances.map((b) => {
            const rem = b.total_allowance - Number(b.used_days);
            return (
              <Col span={8} key={b.id}>
                <Card size="small" style={{ textAlign: 'center', borderRadius: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{LEAVE_TYPE_CONFIG[b.leave_type]?.label}</Text>
                  <div>
                    <Text strong style={{ color: BALANCE_COLORS[b.leave_type] }}>{rem}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}> days left</Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

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

        {remaining !== null && leaveType && ['vacation', 'sick', 'personal'].includes(leaveType) && (
          <Alert
            type={remaining <= 0 ? 'error' : remaining < 3 ? 'warning' : 'info'}
            showIcon
            message={`${LEAVE_TYPE_CONFIG[leaveType]?.label} balance: ${remaining} day(s) remaining`}
            style={{ marginBottom: 12 }}
          />
        )}

        {conflicts && conflicts.length > 0 && startDate && endDate && (
          <Alert
            type="warning"
            showIcon
            message={`${conflicts.length} team member(s) already on leave during these dates`}
            style={{ marginBottom: 12 }}
          />
        )}

        <Form.Item name="reason" label="Reason (optional)">
          <Input.TextArea rows={2} placeholder="Briefly describe the reason for your leave" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Manager Table ─────────────────────────────────────────────────────────────

function ManagerTable() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filterUserId, setFilterUserId] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterLeaveType, setFilterLeaveType] = useState<string | undefined>();
  const [filterDates, setFilterDates] = useState<[string, string] | null>(null);

  const [approvalTarget, setApprovalTarget] = useState<TimeOffRequest | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimeOffRequest | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: agents } = useAgents();
  const cancelMutation = useCancelTimeOffRequest();

  const { data: requestsData, isLoading } = useTimeOffRequests({
    page,
    take: 25,
    user_id: filterUserId,
    status: filterStatus,
    leave_type: filterLeaveType,
    date_from: filterDates?.[0],
    date_to: filterDates?.[1],
  });

  const requests = requestsData?.data ?? [];
  const meta = requestsData?.meta;

  const columns: ColumnsType<TimeOffRequest> = [
    {
      title: 'Request',
      key: 'request',
      render: (_, r) => {
        const cfg = LEAVE_TYPE_CONFIG[r.leave_type];
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate(`/workforce/time-off/${r.id}`)}
          >
            <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
          </span>
        );
      },
    },
    {
      title: 'Technician',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar src={r.user?.avatar_url} icon={<UserOutlined />} size="small" />
          <span
            style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => r.user?.id && navigate(`/users/${r.user.id}`)}
          >
            {r.user?.first_name} {r.user?.last_name}
          </span>
        </Space>
      ),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(r.start_date).format('MMM D')} → {dayjs(r.end_date).format('MMM D, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {DURATION_LABELS[r.duration_type]} · {r.total_days_deducted} day(s)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => dayjs(d).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/workforce/time-off/${r.id}`)} />
          </Tooltip>
          {r.status === 'pending' && (
            <>
              <Tooltip title="Review">
                <Button
                  size="small"
                  type="primary"
                  onClick={() => { setApprovalTarget(r); setApprovalOpen(true); }}
                >
                  Review
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => { setEditTarget(r); setEditOpen(true); }}
                />
              </Tooltip>
            </>
          )}
          {r.status === 'approved' && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              {r.approved_by_user?.first_name ?? 'Approved'}
            </Tag>
          )}
          {(r.status === 'pending' || r.status === 'approved') && (
            <Tooltip title="Delete">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  showConfirmDialog({
                    title: 'Delete this request?',
                    content: 'This will permanently remove the time-off request.',
                    danger: true,
                    onOk: () => cancelMutation.mutateAsync(r.id),
                  })
                }
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={[16, 8]} align="middle" wrap>
          <Col>
            <RangePicker
              onChange={(_, ds) => {
                const [f, t] = ds;
                setFilterDates(f && t ? [f, t] : null);
              }}
              format="YYYY-MM-DD"
              style={{ width: 260 }}
              placeholder={['From', 'To']}
            />
          </Col>
          <Col>
            <Select
              placeholder="Technician"
              style={{ width: 200 }}
              allowClear
              showSearch
              filterOption={(v, o) => String(o?.label ?? '').toLowerCase().includes(v.toLowerCase())}
              value={filterUserId}
              onChange={setFilterUserId}
              options={(agents ?? []).map((a) => ({ label: `${a.first_name} ${a.last_name}`, value: a.id }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Status"
              style={{ width: 140 }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                label: <Tag color={c.color}>{c.label}</Tag>,
                value: v,
              }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Leave Type"
              style={{ width: 150 }}
              allowClear
              value={filterLeaveType}
              onChange={setFilterLeaveType}
              options={Object.entries(LEAVE_TYPE_CONFIG).map(([v, c]) => ({ label: c.label, value: v }))}
            />
          </Col>
          <Col>
            <Button onClick={() => {
              setFilterUserId(undefined);
              setFilterStatus(undefined);
              setFilterLeaveType(undefined);
              setFilterDates(null);
              setPage(1);
            }}>
              Clear
            </Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: meta?.itemCount ?? 0,
            pageSize: 25,
            onChange: (p) => setPage(p),
            showTotal: (t) => `${t} requests`,
          }}
          locale={{ emptyText: <Empty description="No requests found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <ApprovalModal
        request={approvalTarget}
        open={approvalOpen}
        onClose={() => { setApprovalOpen(false); setApprovalTarget(null); }}
      />
      <EditRequestModal
        request={editTarget}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
      />
    </>
  );
}

// ── My Time Off ───────────────────────────────────────────────────────────────

function MyTimeOffTab() {
  const navigate = useNavigate();
  const [requestOpen, setRequestOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimeOffRequest | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const cancelMutation = useCancelTimeOffRequest();

  const { data: myBalances } = useMyLeaveBalances();
  const { data: myRequestsData, isLoading } = useTimeOffRequests({ user_id: user?.id, take: 50 });
  const myRequests = myRequestsData?.data ?? [];

  const columns: ColumnsType<TimeOffRequest> = [
    {
      title: 'Request',
      key: 'request',
      render: (_, r) => {
        const cfg = LEAVE_TYPE_CONFIG[r.leave_type];
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate(`/workforce/time-off/${r.id}`)}
          >
            <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
          </span>
        );
      },
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(r.start_date).format('MMM D')} → {dayjs(r.end_date).format('MMM D, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {DURATION_LABELS[r.duration_type]} · {r.total_days_deducted} day(s)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const cfg = STATUS_CONFIG[r.status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Manager Notes',
      dataIndex: 'manager_notes',
      key: 'manager_notes',
      render: (n: string) => n ? <Text type="secondary">{n}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/workforce/time-off/${r.id}`)} />
          </Tooltip>
          {r.status === 'pending' && (
            <>
              <Tooltip title="Edit">
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditTarget(r); setEditOpen(true); }} />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    showConfirmDialog({
                      title: 'Cancel this request?',
                      content: 'This will withdraw your time-off request.',
                      onOk: () => cancelMutation.mutateAsync(r.id),
                    })
                  }
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {myBalances && myBalances.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {myBalances.map((b) => (
            <Col span={8} key={b.id}><BalanceCard balance={b} /></Col>
          ))}
        </Row>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setRequestOpen(true)}>
          Request Time Off
        </Button>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={myRequests}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="No requests yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <RequestFormModal open={requestOpen} onClose={() => setRequestOpen(false)} />
      <EditRequestModal
        request={editTarget}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
      />
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function PendingCount() {
  const { data } = useTimeOffRequests({ status: 'pending', take: 1 });
  const count = data?.meta?.itemCount ?? 0;
  return count > 0 ? <Badge count={count} size="small" offset={[4, -2]} /> : null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkforceTimeOffPage() {
  return (
    <div>
      <PageHeader
        title="Time Off"
        subtitle="Manage leave requests, approve absences, and keep dispatch calendars updated automatically."
      />

      <Tabs
        defaultActiveKey="manager"
        items={[
          {
            key: 'manager',
            label: <Space>Manager View<PendingCount /></Space>,
            children: <ManagerTable />,
          },
          {
            key: 'my',
            label: 'My Time Off',
            children: <MyTimeOffTab />,
          },
        ]}
      />
    </div>
  );
}
