import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Button, Space, Tag, Avatar, Typography, Row, Col,
  Descriptions, List, Empty, Modal, Form, Input, Select, DatePicker,
  Spin, Timeline, Statistic, Divider, Badge, theme,
} from 'antd';
import type { ColumnsType, ExpandableConfig } from 'antd/es/table';
import { Table } from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, LoginOutlined, LogoutOutlined,
  EnvironmentOutlined, ToolOutlined, EditOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import PageHeader from '@/components/common/PageHeader';
import { useAttendanceLogs, useAdjustAttendance } from '@/hooks/use-attendance';
import { useUser } from '@/hooks/use-users';
import type { AttendanceLog, AttendancePunch } from '@/types/models.types';
import type { AdjustAttendancePayload } from '@/api/attendance.api';

dayjs.extend(duration);

const { Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  present: { color: 'green', label: 'Present' },
  half_day: { color: 'orange', label: 'Half Day' },
  absent: { color: 'red', label: 'Absent' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

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
              — {dayjs(log.date).format('MMM D, YYYY')}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendanceDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [adjustTarget, setAdjustTarget] = useState<AttendanceLog | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useUser(userId ?? '');

  const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
  const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

  const { data: weekData } = useAttendanceLogs({
    user_id: userId,
    date_from: weekStart,
    date_to: weekEnd,
    take: 7,
  });

  const { data: monthData } = useAttendanceLogs({
    user_id: userId,
    date_from: monthStart,
    date_to: monthEnd,
    take: 31,
  });

  const { data: logsData, isLoading: logsLoading } = useAttendanceLogs({
    user_id: userId,
    page,
    take: pageSize,
  });

  if (userLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!user) return <Empty description="User not found" style={{ padding: 64 }} />;

  const weekLogs = weekData?.data ?? [];
  const monthLogs = monthData?.data ?? [];
  const logs = logsData?.data ?? [];
  const meta = logsData?.meta;

  // Week days (Sun–Sat)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = dayjs().startOf('week').add(i, 'day');
    const log = weekLogs.find((l) => dayjs(l.date).isSame(day, 'day'));
    return { day, log };
  });

  // Month stats
  const presentDays = monthLogs.filter((l) => l.status === 'present').length;
  const absentDays = monthLogs.filter((l) => l.status === 'absent').length;
  const halfDays = monthLogs.filter((l) => l.status === 'half_day').length;
  const totalRegular = monthLogs.reduce((sum, l) => sum + (l.total_regular_hours ?? 0), 0);
  const totalOT = monthLogs.reduce((sum, l) => sum + (l.total_overtime_hours ?? 0), 0);

  // Today's log (from week data)
  const todayLog = weekLogs.find((l) => dayjs(l.date).isSame(dayjs(), 'day'));

  // ── Log table columns ─────────────────────────────────────────────────────

  const logColumns: ColumnsType<AttendanceLog> = [
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
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => { setAdjustTarget(record); setAdjustOpen(true); }}
        />
      ),
    },
  ];

  const expandable: ExpandableConfig<AttendanceLog> = {
    expandedRowRender: (record) => <PunchTimeline punches={record.punches ?? []} />,
    rowExpandable: (record) => (record.punches?.length ?? 0) > 0,
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Month stats */}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title={`Regular Hrs (${dayjs().format('MMM')})`}
                  value={formatHours(totalRegular)}
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic
                  title="OT Hrs"
                  value={formatHours(totalOT)}
                  valueStyle={{ fontSize: 20, color: totalOT > 0 ? '#fa8c16' : undefined }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Statistic title="Present Days" value={presentDays} valueStyle={{ fontSize: 20, color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small">
                <Row gutter={8}>
                  <Col span={12}>
                    <Statistic title="Half Days" value={halfDays} valueStyle={{ fontSize: 18, color: '#fa8c16' }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Absent" value={absentDays} valueStyle={{ fontSize: 18, color: '#ff4d4f' }} />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* This week breakdown */}
          <Card title={`This Week — ${dayjs().startOf('week').format('MMM D')} – ${dayjs().endOf('week').format('MMM D')}`}>
            <Row gutter={[8, 8]}>
              {weekDays.map(({ day, log }) => {
                const isToday = day.isSame(dayjs(), 'day');
                const isFuture = day.isAfter(dayjs(), 'day');
                return (
                  <Col key={day.format('YYYY-MM-DD')} style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        padding: '8px 4px',
                        borderRadius: 6,
                        textAlign: 'center',
                        background: isToday ? token.colorPrimaryBg : undefined,
                        border: isToday
                          ? `1px solid ${token.colorPrimary}`
                          : `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{day.format('ddd')}</Text>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>{day.format('D')}</Text>
                      {isFuture ? (
                        <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                      ) : log ? (
                        <>
                          <StatusBadge status={log.status} />
                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                            {formatHours(log.total_regular_hours)}
                          </Text>
                        </>
                      ) : (
                        <Tag style={{ fontSize: 10, margin: '2px 0' }}>No Data</Tag>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>

          {/* Today's punches */}
          {todayLog ? (
            <Card title={`Today's Punches — ${dayjs().format('MMM D')}`}>
              <PunchTimeline punches={todayLog.punches ?? []} />
            </Card>
          ) : (
            <Card title={`Today — ${dayjs().format('MMM D')}`}>
              <Empty description="No attendance recorded today" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: 'log',
      label: 'Attendance Log',
      children: (
        <Card>
          <Table
            dataSource={logs}
            columns={logColumns}
            rowKey="id"
            loading={logsLoading}
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
              emptyText: <Empty description="No attendance records" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }}
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
            <Avatar src={user.avatar_url} icon={<UserOutlined />} size={40} />
            <div>
              <Text strong style={{ fontSize: 18, display: 'block', lineHeight: 1.3 }}>
                {user.first_name} {user.last_name}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{user.email}</Text>
            </div>
          </Space>
        }
        subtitle="Attendance Overview"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workforce/attendance')}>
            Back to Team
          </Button>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ background: token.colorBgContainer, padding: '0 16px 16px', borderRadius: 8 }}
      />

      <AdjustModal
        log={adjustTarget}
        open={adjustOpen}
        onClose={() => { setAdjustOpen(false); setAdjustTarget(null); }}
      />
    </div>
  );
}
