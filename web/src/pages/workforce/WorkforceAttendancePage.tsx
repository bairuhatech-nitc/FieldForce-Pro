import { useState, useEffect } from 'react';
import {
  Table, Button, Space, Tag, Tooltip, Modal, Form, Input, Select,
  Avatar, Badge, Typography, Row, Col, Card, DatePicker, Divider,
  Empty, Descriptions, Timeline, Segmented, Statistic, theme,
} from 'antd';
import type { ColumnsType, ExpandableConfig } from 'antd/es/table';
import {
  EditOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined,
  WarningOutlined, LoginOutlined, LogoutOutlined, EnvironmentOutlined,
  ToolOutlined, PlusOutlined, LoadingOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import {
  useAttendanceLogs, useAdjustAttendance, useCreateAttendanceLog,
  useMyToday, useCheckIn, useCheckOut,
} from '@/hooks/use-attendance';
import { useAgents } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth.store';
import type { AttendanceLog, AttendancePunch } from '@/types/models.types';
import type { AdjustAttendancePayload, CreateAttendanceLogPayload } from '@/api/attendance.api';

dayjs.extend(duration);

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  present: { color: 'green', label: 'Present' },
  half_day: { color: 'orange', label: 'Half Day' },
  absent: { color: 'red', label: 'Absent' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  if (!h || h === 0) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  return dayjs(ts).format('hh:mm A');
}

// ── Punch Timeline ────────────────────────────────────────────────────────────

function PunchTimeline({ punches }: { punches: AttendancePunch[] }) {
  if (!punches || punches.length === 0) {
    return <Empty description="No punch records" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 16 }} />;
  }
  return (
    <div style={{ padding: '8px 24px 8px 48px' }}>
      <Timeline
        items={punches.map((p, idx) => {
          const isActive = !p.punch_out_time;
          const durationMs = p.punch_out_time ? dayjs(p.punch_out_time).diff(dayjs(p.punch_in_time)) : null;
          const durationStr = durationMs ? dayjs.duration(durationMs).format('H[h] m[m]') : null;
          return {
            key: p.id,
            color: isActive ? 'green' : 'blue',
            dot: isActive ? <Badge status="processing" /> : undefined,
            children: (
              <Space direction="vertical" size={0}>
                <Space size={16}>
                  <Text>
                    <LoginOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    In: <Text strong>{formatTime(p.punch_in_time)}</Text>
                  </Text>
                  {p.punch_out_time && (
                    <Text>
                      <LogoutOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
                      Out: <Text strong>{formatTime(p.punch_out_time)}</Text>
                    </Text>
                  )}
                  {isActive && <Tag color="green">Active</Tag>}
                  {durationStr && <Text type="secondary">({durationStr})</Text>}
                  <Text type="secondary" style={{ fontSize: 11 }}>Segment {idx + 1}</Text>
                </Space>
                {p.punch_in_location && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <EnvironmentOutlined /> In: {p.punch_in_location.lat.toFixed(4)}, {p.punch_in_location.lng.toFixed(4)}
                  </Text>
                )}
                {p.punch_out_location && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <EnvironmentOutlined /> Out: {p.punch_out_location.lat.toFixed(4)}, {p.punch_out_location.lng.toFixed(4)}
                  </Text>
                )}
                {p.device_info && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <ToolOutlined /> {p.device_info}
                  </Text>
                )}
              </Space>
            ),
          };
        })}
      />
    </div>
  );
}

// ── Adjust Modal ──────────────────────────────────────────────────────────────

function AdjustModal({ log, open, onClose }: { log: AttendanceLog | null; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const adjustMutation = useAdjustAttendance();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: AdjustAttendancePayload & { id: string } = {
        id: log!.id,
        adjustment_reason: values.adjustment_reason,
        status: values.status,
        punch_in_time: values.punch_in_time ? values.punch_in_time.toISOString() : undefined,
        punch_out_time: values.punch_out_time ? values.punch_out_time.toISOString() : undefined,
      };
      await adjustMutation.mutateAsync(payload);
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined style={{ color: '#fa8c16' }} />
          Edit Attendance Record
          {log && (
            <Text type="secondary" style={{ fontWeight: 400 }}>
              — {log.user?.first_name} {log.user?.last_name} · {dayjs(log.date).format('MMM D, YYYY')}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Save Adjustment"
      okButtonProps={{ style: { backgroundColor: '#fa8c16', borderColor: '#fa8c16' } }}
      confirmLoading={adjustMutation.isPending}
      destroyOnClose
      width={520}
    >
      {log && (
        <div style={{ marginBottom: 12 }}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Current Status"><StatusBadge status={log.status} /></Descriptions.Item>
            <Descriptions.Item label="Regular">{formatHours(log.total_regular_hours)}</Descriptions.Item>
            <Descriptions.Item label="OT">{formatHours(log.total_overtime_hours)}</Descriptions.Item>
            {log.manager_adjusted && (
              <Descriptions.Item label="Last adjustment">
                {log.adjusted_by_user?.first_name} {log.adjusted_by_user?.last_name}
              </Descriptions.Item>
            )}
          </Descriptions>
          <Divider style={{ margin: '8px 0' }} />
        </div>
      )}
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="punch_in_time" label="Corrected Check-In Time">
              <DatePicker showTime style={{ width: '100%' }} format="MMM D HH:mm" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="punch_out_time" label="Corrected Check-Out Time">
              <DatePicker showTime style={{ width: '100%' }} format="MMM D HH:mm" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="status" label="Override Status">
          <Select
            placeholder="Leave blank to auto-calculate"
            allowClear
            options={[
              { label: 'Present', value: 'present' },
              { label: 'Half Day', value: 'half_day' },
              { label: 'Absent', value: 'absent' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="adjustment_reason"
          label="Adjustment Reason"
          rules={[{ required: true, message: 'A reason is required for audit purposes' }]}
        >
          <Input.TextArea rows={3} placeholder="e.g. Technician forgot to check out, confirmed via phone" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Create Log Modal ──────────────────────────────────────────────────────────

function CreateLogModal({
  open,
  onClose,
  agents,
}: {
  open: boolean;
  onClose: () => void;
  agents: { id: string; first_name: string; last_name: string }[];
}) {
  const [form] = Form.useForm();
  const createMutation = useCreateAttendanceLog();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateAttendanceLogPayload = {
        user_id: values.user_id,
        date: values.date.format('YYYY-MM-DD'),
        punch_in_time: values.punch_in_time ? values.punch_in_time.toISOString() : undefined,
        punch_out_time: values.punch_out_time ? values.punch_out_time.toISOString() : undefined,
        status: values.status,
        notes: values.notes,
      };
      await createMutation.mutateAsync(payload);
      onClose();
      form.resetFields();
    } catch { /* validation */ }
  };

  return (
    <Modal
      title={<Space><PlusOutlined style={{ color: '#1677ff' }} />Create Attendance Log</Space>}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); }}
      onOk={handleSubmit}
      okText="Create Log"
      confirmLoading={createMutation.isPending}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item name="user_id" label="Technician" rules={[{ required: true, message: 'Select a technician' }]}>
          <Select
            showSearch
            placeholder="Search technician"
            filterOption={(v, o) => String(o?.label ?? '').toLowerCase().includes(v.toLowerCase())}
            options={agents.map((a) => ({ label: `${a.first_name} ${a.last_name}`, value: a.id }))}
          />
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select a date' }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="punch_in_time" label="Punch In Time">
              <DatePicker showTime style={{ width: '100%' }} format="MMM D HH:mm" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="punch_out_time" label="Punch Out Time">
              <DatePicker showTime style={{ width: '100%' }} format="MMM D HH:mm" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="status" label="Status (optional)">
          <Select
            placeholder="Auto-calculated if not set"
            allowClear
            options={[
              { label: 'Present', value: 'present' },
              { label: 'Half Day', value: 'half_day' },
              { label: 'Absent', value: 'absent' },
            ]}
          />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional reason for manual entry" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Geolocation helper ────────────────────────────────────────────────────────

async function requestLocation(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 5000 },
    );
  });
}

// ── Today Card ────────────────────────────────────────────────────────────────

function TodayCard() {
  const { token } = theme.useToken();
  const { data: today, isLoading } = useMyToday();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const [timer, setTimer] = useState('0:00:00');

  const activePunch = today?.active_punch ?? null;
  const isWorking = !!activePunch;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  useEffect(() => {
    if (!activePunch) { setTimer('0:00:00'); return; }
    const tick = () => {
      const diff = dayjs().diff(dayjs(activePunch.punch_in_time));
      const d = dayjs.duration(diff);
      const h = Math.floor(d.asHours());
      setTimer(`${h}:${String(d.minutes()).padStart(2, '0')}:${String(d.seconds()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activePunch]);

  const handleCheckIn = async () => {
    const location = await requestLocation();
    await checkInMutation.mutateAsync({ location, device_info: navigator.userAgent.slice(0, 200) });
  };

  const handleCheckOut = async () => {
    const location = await requestLocation();
    await checkOutMutation.mutateAsync({ location, device_info: navigator.userAgent.slice(0, 200) });
  };

  const log = today?.log;

  return (
    <Card
      title={<Space><ClockCircleOutlined />{`Today — ${dayjs().format('dddd, MMM D, YYYY')}`}</Space>}
      loading={isLoading}
      style={{ marginBottom: 16, borderRadius: 8 }}
    >
      <Row gutter={[24, 16]} align="middle">
        {/* Status + Timer */}
        <Col xs={24} sm={7} style={{ textAlign: 'center' }}>
          {isWorking ? (
            <Space direction="vertical" size={2}>
              <Badge status="processing" text={<Text strong>Checked In</Text>} />
              <Text
                style={{
                  fontFamily: 'monospace',
                  fontSize: 36,
                  fontVariantNumeric: 'tabular-nums',
                  color: '#52c41a',
                  lineHeight: 1.2,
                }}
              >
                {timer}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                since {dayjs(activePunch!.punch_in_time).format('hh:mm A')}
              </Text>
            </Space>
          ) : (
            <Space direction="vertical" size={2}>
              <Badge status="default" text={<Text style={{ color: token.colorTextSecondary }}>Not Checked In</Text>} />
              <Text style={{ fontFamily: 'monospace', fontSize: 36, color: token.colorTextQuaternary, lineHeight: 1.2 }}>
                ——:——
              </Text>
            </Space>
          )}
        </Col>

        <Col xs={0} sm={1} style={{ display: 'flex', justifyContent: 'center' }}>
          <Divider type="vertical" style={{ height: 80 }} />
        </Col>

        {/* Stats */}
        <Col xs={24} sm={10}>
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Statistic title="Regular Hrs" value={formatHours(log?.total_regular_hours ?? 0)} valueStyle={{ fontSize: 20 }} />
            </Col>
            <Col span={8}>
              <Statistic
                title="Overtime"
                value={formatHours(log?.total_overtime_hours ?? 0)}
                valueStyle={{ fontSize: 20, color: log?.total_overtime_hours ? '#fa8c16' : undefined }}
              />
            </Col>
            <Col span={8}>
              <Statistic title="Punches" value={log?.punches?.length ?? 0} valueStyle={{ fontSize: 20 }} />
            </Col>
          </Row>
          {log && <div style={{ marginTop: 8 }}><StatusBadge status={log.status} /></div>}
        </Col>

        <Col xs={0} sm={1} style={{ display: 'flex', justifyContent: 'center' }}>
          <Divider type="vertical" style={{ height: 80 }} />
        </Col>

        {/* Action */}
        <Col xs={24} sm={5} style={{ textAlign: 'center' }}>
          {isWorking ? (
            <Button
              danger
              size="large"
              icon={isMutating ? <LoadingOutlined /> : <LogoutOutlined />}
              onClick={handleCheckOut}
              disabled={isMutating}
              style={{ minWidth: 130 }}
            >
              Check Out
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={isMutating ? <LoadingOutlined /> : <LoginOutlined />}
              onClick={handleCheckIn}
              disabled={isMutating}
              style={{ minWidth: 130, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Check In
            </Button>
          )}
        </Col>
      </Row>

      {(log?.punches?.length ?? 0) > 0 && (
        <>
          <Divider style={{ margin: '16px 0 8px' }} />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Punch records for today
          </Text>
          <PunchTimeline punches={log!.punches!} />
        </>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkforceAttendancePage() {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [activeView, setActiveView] = useState<string>('team');

  // Team tab state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filterUserId, setFilterUserId] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterDates, setFilterDates] = useState<[string, string] | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AttendanceLog | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: agents } = useAgents();
  const agentsList = agents ?? [];

  const sharedFilters = {
    user_id: filterUserId,
    date_from: filterDates?.[0],
    date_to: filterDates?.[1],
  };

  const { data: logsData, isLoading } = useAttendanceLogs({
    page,
    take: pageSize,
    status: filterStatus,
    ...sharedFilters,
  });

  const { data: myLogsData, isLoading: myLoading } = useAttendanceLogs(
    me?.id ? { user_id: me.id, take: 30, page: 1 } : { take: 1, page: 1 },
  );

  const { data: presentData } = useAttendanceLogs({ status: 'present', take: 1, ...sharedFilters });
  const { data: halfDayData } = useAttendanceLogs({ status: 'half_day', take: 1, ...sharedFilters });
  const { data: absentData } = useAttendanceLogs({ status: 'absent', take: 1, ...sharedFilters });

  const logs = logsData?.data ?? [];
  const meta = logsData?.meta;
  const myLogs = me?.id ? (myLogsData?.data ?? []) : [];

  const presentCount = presentData?.meta?.itemCount ?? 0;
  const halfDayCount = halfDayData?.meta?.itemCount ?? 0;
  const absentCount = absentData?.meta?.itemCount ?? 0;
  const adjustedCount = logs.filter((l) => l.manager_adjusted).length;

  // ── Shared expandable ─────────────────────────────────────────────────────

  const expandable: ExpandableConfig<AttendanceLog> = {
    expandedRowRender: (record) => <PunchTimeline punches={record.punches ?? []} />,
    rowExpandable: (record) => (record.punches?.length ?? 0) > 0,
  };

  // ── Team table columns ────────────────────────────────────────────────────

  const teamColumns: ColumnsType<AttendanceLog> = [
    {
      title: 'Technician',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.user?.avatar_url} icon={<UserOutlined />} size="small" />
          <span
            style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => record.user?.id && navigate(`/workforce/attendance/user/${record.user.id}`)}
          >
            {record.user?.first_name} {record.user?.last_name}
          </span>
          {record.manager_adjusted && (
            <Tooltip title={`Manually adjusted: ${record.adjustment_reason}`}>
              <WarningOutlined style={{ color: '#fa8c16' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('ddd, MMM D YYYY'),
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'First In',
      key: 'first_in',
      render: (_, record) => {
        const p = record.punches?.[0];
        return p
          ? <Text><LoginOutlined style={{ color: '#52c41a', marginRight: 4 }} />{formatTime(p.punch_in_time)}</Text>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Last Out',
      key: 'last_out',
      render: (_, record) => {
        const punches = record.punches ?? [];
        const lastPunch = [...punches].reverse().find((p) => p.punch_out_time);
        const hasOpen = punches.some((p) => !p.punch_out_time);
        if (hasOpen) return <Tag color="green">Active</Tag>;
        return lastPunch
          ? <Text><LogoutOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />{formatTime(lastPunch.punch_out_time)}</Text>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Regular Hrs',
      dataIndex: 'total_regular_hours',
      key: 'regular',
      render: (h: number) => <Text>{formatHours(h)}</Text>,
      sorter: (a, b) => a.total_regular_hours - b.total_regular_hours,
    },
    {
      title: 'OT Hrs',
      dataIndex: 'total_overtime_hours',
      key: 'ot',
      render: (h: number) =>
        h > 0
          ? <Text style={{ color: '#fa8c16', fontWeight: 600 }}>{formatHours(h)}</Text>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <StatusBadge status={s} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Edit attendance">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => { setAdjustTarget(record); setAdjustOpen(true); }}
          />
        </Tooltip>
      ),
    },
  ];

  // ── My recent logs columns (read-only) ────────────────────────────────────

  const myColumns: ColumnsType<AttendanceLog> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('ddd, MMM D YYYY'),
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'First In',
      key: 'first_in',
      render: (_, record) => {
        const p = record.punches?.[0];
        return p
          ? <Text><LoginOutlined style={{ color: '#52c41a', marginRight: 4 }} />{formatTime(p.punch_in_time)}</Text>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Last Out',
      key: 'last_out',
      render: (_, record) => {
        const punches = record.punches ?? [];
        const lastPunch = [...punches].reverse().find((p) => p.punch_out_time);
        const hasOpen = punches.some((p) => !p.punch_out_time);
        if (hasOpen) return <Tag color="green">Active</Tag>;
        return lastPunch
          ? <Text><LogoutOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />{formatTime(lastPunch.punch_out_time)}</Text>
          : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Regular',
      dataIndex: 'total_regular_hours',
      key: 'regular',
      render: (h: number) => formatHours(h),
    },
    {
      title: 'OT',
      dataIndex: 'total_overtime_hours',
      key: 'ot',
      render: (h: number) =>
        h > 0
          ? <Text style={{ color: '#fa8c16', fontWeight: 600 }}>{formatHours(h)}</Text>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <StatusBadge status={s} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Track check-in/out, view logs, and manage attendance records."
        extra={
          <Segmented
            value={activeView}
            onChange={(v) => setActiveView(String(v))}
            options={[
              { label: 'My Attendance', value: 'mine', icon: <UserOutlined /> },
              { label: 'Team', value: 'team', icon: <TeamOutlined /> },
            ]}
          />
        }
      />

      {/* ── My Attendance ─────────────────────────────────────────────────── */}
      {activeView === 'mine' && (
        <>
          <TodayCard />
          <Card title="My Recent Logs" style={{ borderRadius: 8 }}>
            <Table
              dataSource={myLogs}
              columns={myColumns}
              rowKey="id"
              loading={myLoading}
              expandable={expandable}
              pagination={false}
              size="small"
              locale={{
                emptyText: <Empty description="No recent logs found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              }}
            />
          </Card>
        </>
      )}

      {/* ── Team Attendance ───────────────────────────────────────────────── */}
      {activeView === 'team' && (
        <>
          {/* Summary tiles */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {[
              { key: 'present', label: 'Present', count: presentCount, color: '#52c41a', icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} /> },
              { key: 'half_day', label: 'Half Day', count: halfDayCount, color: '#fa8c16', icon: <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 20 }} /> },
              { key: 'absent', label: 'Absent', count: absentCount, color: '#ff4d4f', icon: <UserOutlined style={{ color: '#ff4d4f', fontSize: 20 }} /> },
            ].map(({ key, label, count, color, icon }) => {
              const isActive = filterStatus === key;
              return (
                <Col span={6} key={key}>
                  <Card
                    size="small"
                    style={{ borderRadius: 8, cursor: 'pointer', border: isActive ? `2px solid ${color}` : undefined, transition: 'border 0.15s' }}
                    onClick={() => { setFilterStatus(isActive ? undefined : key); setPage(1); }}
                  >
                    <Space>
                      {icon}
                      <div>
                        <Text strong style={{ fontSize: 20, color }}>{count}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
            <Col span={6}>
              <Card size="small" style={{ borderRadius: 8 }}>
                <Space>
                  <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
                  <div>
                    <Text strong style={{ fontSize: 20, color: '#faad14' }}>{adjustedCount}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>Adjusted (this page)</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card style={{ marginBottom: 16, borderRadius: 8 }}>
            <Row gutter={[16, 8]} align="middle" justify="space-between">
              <Col>
                <Space wrap>
                  <RangePicker
                    onChange={(_, dateStrings) => {
                      const [from, to] = dateStrings;
                      if (from && to) { setFilterDates([from, to]); setPage(1); }
                      else { setFilterDates(null); setPage(1); }
                    }}
                    format="YYYY-MM-DD"
                    style={{ width: 260 }}
                    placeholder={['From date', 'To date']}
                  />
                  <Select
                    placeholder="Filter by Technician"
                    style={{ width: 220 }}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    value={filterUserId}
                    onChange={(v) => { setFilterUserId(v); setPage(1); }}
                    options={agentsList.map((a) => ({ label: `${a.first_name} ${a.last_name}`, value: a.id }))}
                  />
                  <Select
                    placeholder="Filter by Status"
                    style={{ width: 160 }}
                    allowClear
                    value={filterStatus}
                    onChange={(v) => { setFilterStatus(v); setPage(1); }}
                    options={[
                      { label: 'Present', value: 'present' },
                      { label: 'Half Day', value: 'half_day' },
                      { label: 'Absent', value: 'absent' },
                    ]}
                  />
                  <Button
                    onClick={() => {
                      setFilterUserId(undefined);
                      setFilterStatus(undefined);
                      setFilterDates(null);
                      setPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </Space>
              </Col>
              <Col>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                  Add Log
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Table */}
          <Card style={{ borderRadius: 8 }}>
            <Table
              dataSource={logs}
              columns={teamColumns}
              rowKey="id"
              loading={isLoading}
              expandable={expandable}
              pagination={{
                current: page,
                pageSize,
                total: meta?.itemCount ?? 0,
                onChange: (p) => setPage(p),
                showSizeChanger: false,
                showTotal: (total) => `${total} records`,
              }}
              locale={{
                emptyText: <Empty description="No attendance records found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
              }}
            />
          </Card>

          <AdjustModal
            log={adjustTarget}
            open={adjustOpen}
            onClose={() => { setAdjustOpen(false); setAdjustTarget(null); }}
          />
          <CreateLogModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            agents={agentsList}
          />
        </>
      )}
    </div>
  );
}
