import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Table, Spin, Tabs, Timeline,
  Typography, Row, Col, Empty, Modal, Select,
  Calendar, Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  EditOutlined, ArrowLeftOutlined, UserOutlined, CalendarOutlined,
  ClockCircleOutlined, EnvironmentOutlined, TeamOutlined,
  CarOutlined, ScheduleOutlined, LoginOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SafetyOutlined, ToolOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUser, useDeleteUser } from '@/hooks/use-users';
import { useSessions, useTerminateSession } from '@/hooks/use-auth';
import { useTimeOffRequests } from '@/hooks/use-time-off';
import { useAttendanceLogs } from '@/hooks/use-attendance';
import { useUserTimesheets } from '@/hooks/use-timesheets';
import { useUserTrips } from '@/hooks/use-trips';
import { useAllAppointments } from '@/hooks/use-appointments';
import { useCrews } from '@/hooks/use-crews';
import { useSetting, useUpsertSetting } from '@/hooks/use-settings';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime, formatRelative } from '@/utils/format-date';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import UserDocumentsSection from '@/components/users/UserDocumentsSection';
import type {
  LoginSession, Role, TimeOffRequest, AttendanceLog,
  Timesheet, Trip, ServiceAppointment, Crew,
} from '@/types/models.types';

const { Text } = Typography;

interface SkillItem { id: string; name: string; category: string; description: string; technician_ids: string[]; }
interface ShiftItem { id: string; name: string; start_time: string; end_time: string; timezone: string; user_ids: string[]; }
interface TerritoryItem { id: string; name: string; description?: string; color?: string; }

const LEAVE_TYPE_COLORS: Record<string, string> = {
  vacation: 'blue', sick: 'red', personal: 'purple', unpaid: 'orange', other: 'default',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'warning', approved: 'success', rejected: 'error', cancelled: 'default',
  present: 'success', absent: 'error', half_day: 'warning',
  in_progress: 'processing', completed: 'success', cancelled_trip: 'default',
  scheduled: 'blue', billable: 'success', non_billable: 'default',
};

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignShiftOpen, setAssignShiftOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | undefined>();

  const { data: user, isLoading } = useUser(id!);
  const { data: sessions } = useSessions();
  const terminateSession = useTerminateSession();
  const deleteUser = useDeleteUser();

  // Related data
  const { data: timeOffData } = useTimeOffRequests({ user_id: id, take: 100 });
  const { data: attendanceData } = useAttendanceLogs({ user_id: id, take: 100 });
  const { data: timesheets } = useUserTimesheets(id!);
  const { data: trips } = useUserTrips(id!);
  const { data: allAppointments } = useAllAppointments();
  const { data: allCrews } = useCrews({ take: 200 });

  // Settings-based data
  const { data: skillsSettingData } = useSetting('skills_settings');
  const { data: shiftsSettingData } = useSetting('shifts_settings');
  const { data: territoriesSettingData } = useSetting('territories_settings');
  const upsertSetting = useUpsertSetting();

  const allSkills: SkillItem[] = useMemo(
    () => (skillsSettingData?.value?.list as SkillItem[] | undefined) ?? [],
    [skillsSettingData],
  );
  const allShifts: ShiftItem[] = useMemo(
    () => (shiftsSettingData?.value?.list as ShiftItem[] | undefined) ?? [],
    [shiftsSettingData],
  );
  const allTerritories: TerritoryItem[] = useMemo(
    () => (territoriesSettingData?.value?.list as TerritoryItem[] | undefined) ?? [],
    [territoriesSettingData],
  );

  // Derived: filter to this user
  const userAppointments = useMemo(
    () => (allAppointments || []).filter((a) => a.agent_id === id),
    [allAppointments, id],
  );
  const userCrews = useMemo(
    () => (allCrews?.data || []).filter(
      (c) => c.crew_leader_id === id || c.members?.some((m) => m.technician_id === id),
    ),
    [allCrews, id],
  );
  const userSkills = useMemo(
    () => allSkills.filter((s) => s.technician_ids.includes(id!)),
    [allSkills, id],
  );
  const userShifts = useMemo(
    () => allShifts.filter((s) => s.user_ids.includes(id!)),
    [allShifts, id],
  );
  const userTerritories = useMemo(
    () => allTerritories.filter((t) => user?.territory_ids?.includes(t.id)),
    [allTerritories, user],
  );

  // Calendar date cell renderer
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, ServiceAppointment[]> = {};
    userAppointments.forEach((a) => {
      const key = dayjs(a.scheduled_start).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [userAppointments]);

  const dateCellRender = (value: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;
    const key = value.format('YYYY-MM-DD');
    const items = appointmentsByDate[key] || [];
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.slice(0, 2).map((item) => (
          <li key={item.id}>
            <Badge
              status={item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'error' : 'processing'}
              text={<Text style={{ fontSize: 11 }} ellipsis>{dayjs(item.scheduled_start).format('HH:mm')}</Text>}
            />
          </li>
        ))}
        {items.length > 2 && <li><Text type="secondary" style={{ fontSize: 11 }}>+{items.length - 2} more</Text></li>}
      </ul>
    );
  };

  // Timeline items built from multiple sources
  const timelineItems = useMemo(() => {
    const items: { time: string; color: string; icon: ReactNode; label: string; detail: string }[] = [];
    (attendanceData?.data || []).forEach((log) => {
      items.push({
        time: log.date,
        color: log.status === 'present' ? 'green' : log.status === 'absent' ? 'red' : 'orange',
        icon: <ClockCircleOutlined />,
        label: `Attendance — ${log.status.replace('_', ' ')}`,
        detail: `${log.total_regular_hours}h regular, ${log.total_overtime_hours}h overtime`,
      });
    });
    userAppointments.forEach((a) => {
      items.push({
        time: a.scheduled_start,
        color: a.status === 'completed' ? 'green' : a.status === 'cancelled' ? 'red' : 'blue',
        icon: <CalendarOutlined />,
        label: `Appointment — ${a.status}`,
        detail: `${dayjs(a.scheduled_start).format('MMM D, HH:mm')} – ${dayjs(a.scheduled_end).format('HH:mm')}`,
      });
    });
    (timesheets || []).forEach((ts) => {
      items.push({
        time: ts.clock_in,
        color: ts.status === 'approved' ? 'green' : ts.status === 'rejected' ? 'red' : 'gray',
        icon: <HistoryOutlined />,
        label: `Timesheet — ${ts.status}`,
        detail: `Clock in: ${dayjs(ts.clock_in).format('HH:mm')}${ts.clock_out ? `, out: ${dayjs(ts.clock_out).format('HH:mm')}` : ''}`,
      });
    });
    (trips || []).forEach((tr) => {
      items.push({
        time: tr.start_time,
        color: tr.status === 'completed' ? 'green' : tr.status === 'cancelled' ? 'red' : 'blue',
        icon: <CarOutlined />,
        label: `Trip — ${tr.status}`,
        detail: tr.distance_km != null ? `${tr.distance_km} km` : 'Distance not recorded',
      });
    });
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items.slice(0, 50);
  }, [attendanceData, userAppointments, timesheets, trips]);

  const handleAssignShift = async () => {
    if (!selectedShiftId || !id) return;
    const updatedShifts = allShifts.map((s) =>
      s.id === selectedShiftId
        ? { ...s, user_ids: s.user_ids.includes(id) ? s.user_ids : [...s.user_ids, id] }
        : s,
    );
    await upsertSetting.mutateAsync({ key: 'shifts_settings', value: { list: updatedShifts } });
    setAssignShiftOpen(false);
    setSelectedShiftId(undefined);
  };

  const handleRemoveShift = async (shiftId: string) => {
    if (!id) return;
    const updatedShifts = allShifts.map((s) =>
      s.id === shiftId ? { ...s, user_ids: s.user_ids.filter((uid) => uid !== id) } : s,
    );
    await upsertSetting.mutateAsync({ key: 'shifts_settings', value: { list: updatedShifts } });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!user) return null;

  // ─── Column definitions ───────────────────────────────────────────────────

  const sessionColumns: ColumnsType<LoginSession> = [
    {
      title: 'Device',
      key: 'device',
      render: (_, r) => r.device_name || `${r.browser || ''} on ${r.os || 'Unknown'}`,
    },
    { title: 'IP Address', dataIndex: 'ip_address', key: 'ip_address' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Last Activity',
      dataIndex: 'last_activity_at',
      key: 'last_activity_at',
      render: (v: string) => formatRelative(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button
          danger size="small"
          onClick={() => showConfirmDialog({
            title: 'Terminate Session',
            content: 'Are you sure you want to terminate this session?',
            onOk: async () => { await terminateSession.mutateAsync(r.id); },
            danger: true,
          })}
        >
          Terminate
        </Button>
      ),
    },
  ];

  const appointmentColumns: ColumnsType<ServiceAppointment> = [
    {
      title: 'Work Order',
      key: 'wo',
      render: (_, r) => r.work_order?.wo_number || r.work_order_id?.slice(0, 8) + '…',
    },
    {
      title: 'Scheduled Start',
      dataIndex: 'scheduled_start',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Scheduled End',
      dataIndex: 'scheduled_end',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (v) => v || '-' },
  ];

  const timesheetColumns: ColumnsType<Timesheet> = [
    { title: 'Clock In', dataIndex: 'clock_in', render: (v: string) => formatDateTime(v) },
    { title: 'Clock Out', dataIndex: 'clock_out', render: (v: string) => v ? formatDateTime(v) : '—' },
    {
      title: 'Work Time',
      dataIndex: 'work_time_minutes',
      render: (v: number) => v ? `${Math.floor(v / 60)}h ${v % 60}m` : '—',
    },
    {
      title: 'Travel Time',
      dataIndex: 'travel_time_minutes',
      render: (v: number) => v ? `${v}m` : '—',
    },
    {
      title: 'Billable',
      dataIndex: 'is_billable',
      render: (v: boolean) => v
        ? <Tag color="success">Billable</Tag>
        : <Tag>Non-billable</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
  ];

  const tripColumns: ColumnsType<Trip> = [
    { title: 'Start Time', dataIndex: 'start_time', render: (v: string) => formatDateTime(v) },
    { title: 'End Time', dataIndex: 'end_time', render: (v: string) => v ? formatDateTime(v) : '—' },
    {
      title: 'Distance',
      dataIndex: 'distance_km',
      render: (v: number | null) => v != null ? `${v} km` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
  ];

  const timeOffColumns: ColumnsType<TimeOffRequest> = [
    {
      title: 'Type',
      dataIndex: 'leave_type',
      render: (v: string) => <Tag color={LEAVE_TYPE_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Start', dataIndex: 'start_date', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
    { title: 'End', dataIndex: 'end_date', render: (v: string) => dayjs(v).format('MMM D, YYYY') },
    { title: 'Days', dataIndex: 'total_days_deducted', render: (v: number) => `${v} day${v !== 1 ? 's' : ''}` },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Reason', dataIndex: 'reason', render: (v: string | null) => v || '—' },
  ];

  const attendanceColumns: ColumnsType<AttendanceLog> = [
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('MMM D, YYYY (ddd)') },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v.replace('_', ' ')}</Tag>,
    },
    {
      title: 'Regular Hours',
      dataIndex: 'total_regular_hours',
      render: (v: number) => `${v}h`,
    },
    {
      title: 'Overtime Hours',
      dataIndex: 'total_overtime_hours',
      render: (v: number) => v > 0 ? <Tag color="orange">{v}h OT</Tag> : '—',
    },
    {
      title: 'Adjusted',
      dataIndex: 'manager_adjusted',
      render: (v: boolean) => v ? <Tag color="blue">Adjusted</Tag> : '—',
    },
  ];

  const crewColumns: ColumnsType<Crew> = [
    { title: 'Crew Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Role',
      key: 'role',
      render: (_, r) => r.crew_leader_id === id
        ? <Tag color="gold">Leader</Tag>
        : <Tag color="blue">Member</Tag>,
    },
    {
      title: 'Members',
      key: 'members',
      render: (_, r) => r.members?.length ?? 0,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => navigate(`/workforce/crews`)}>
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: <span><UserOutlined /> Overview</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card>
            <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered>
              <Descriptions.Item label="Name">{user.first_name} {user.last_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{user.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{user.mobile || '—'}</Descriptions.Item>
              <Descriptions.Item label="Employee ID">{user.employee_id || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
              </Descriptions.Item>
              <Descriptions.Item label="Roles">
                {user.roles?.filter((r): r is Role => typeof r !== 'string').map((r) => <Tag key={r.id}>{r.name}</Tag>) || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Timezone">{user.timezone}</Descriptions.Item>
              <Descriptions.Item label="Language">{user.language}</Descriptions.Item>
              <Descriptions.Item label="Last Login">{formatDateTime(user.last_login_at)}</Descriptions.Item>
              <Descriptions.Item label="Created">{formatDateTime(user.created_at)}</Descriptions.Item>
              {(user.street || user.city) && (
                <Descriptions.Item label="Address" span={2}>
                  {[user.street, user.city, user.state, user.zip_code, user.country].filter(Boolean).join(', ')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Active Sessions">
            <Table columns={sessionColumns} dataSource={sessions || []} rowKey="id" pagination={false} size="small" />
          </Card>

          <UserDocumentsSection userId={id!} />
        </Space>
      ),
    },
    {
      key: 'timeline',
      label: <span><HistoryOutlined /> Timeline</span>,
      children: (
        <Card title="Activity Timeline">
          {timelineItems.length === 0 ? (
            <Empty description="No activity recorded" />
          ) : (
            <Timeline
              items={timelineItems.map((item) => ({
                color: item.color,
                dot: item.icon,
                children: (
                  <div>
                    <Text strong>{item.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.time).format('MMM D, YYYY')} — {item.detail}
                    </Text>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'calendar',
      label: <span><CalendarOutlined /> Calendar</span>,
      children: (
        <Card title="Appointment Calendar">
          <Calendar cellRender={(current, info) => dateCellRender(current, info)} />
          {userAppointments.length === 0 && (
            <Empty description="No appointments scheduled" style={{ marginTop: 24 }} />
          )}
        </Card>
      ),
    },
    {
      key: 'appointments',
      label: <span><ScheduleOutlined /> Service Appointments ({userAppointments.length})</span>,
      children: (
        <Card title="Service Appointments">
          <Table
            columns={appointmentColumns}
            dataSource={userAppointments}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No appointments found" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'timesheets',
      label: <span><ClockCircleOutlined /> Time Sheets ({timesheets?.length ?? 0})</span>,
      children: (
        <Card title="Time Sheets">
          <Table
            columns={timesheetColumns}
            dataSource={timesheets || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No timesheets found" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'territories',
      label: <span><EnvironmentOutlined /> Territories ({userTerritories.length})</span>,
      children: (
        <Card
          title="Assigned Territories"
          extra={
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/users/${id}/edit`)}>
              Manage
            </Button>
          }
        >
          {userTerritories.length === 0 ? (
            <Empty description="No territories assigned" />
          ) : (
            <Row gutter={[16, 16]}>
              {userTerritories.map((t) => (
                <Col key={t.id} xs={24} sm={12} md={8}>
                  <Card size="small" style={{ borderLeft: `4px solid ${t.color || '#1890ff'}` }}>
                    <Text strong>{t.name}</Text>
                    {t.description && <><br /><Text type="secondary">{t.description}</Text></>}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'crew',
      label: <span><TeamOutlined /> Crew ({userCrews.length})</span>,
      children: (
        <Card title="Crew Memberships">
          <Table
            columns={crewColumns}
            dataSource={userCrews}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: <Empty description="Not assigned to any crew" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'skills',
      label: <span><SafetyOutlined /> Skills ({userSkills.length})</span>,
      children: (
        <Card
          title="Service Resource Skills"
          extra={
            <Button size="small" icon={<ToolOutlined />} onClick={() => navigate('/settings/skills')}>
              Manage Skills
            </Button>
          }
        >
          {userSkills.length === 0 ? (
            <Empty description="No skills assigned. Go to Settings → Skills to assign skills to this user." />
          ) : (
            <Row gutter={[16, 16]}>
              {userSkills.map((s) => (
                <Col key={s.id} xs={24} sm={12} md={8}>
                  <Card size="small">
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text strong>{s.name}</Text>
                      <Tag color="blue">{s.category}</Tag>
                      {s.description && <Text type="secondary" style={{ fontSize: 12 }}>{s.description}</Text>}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'trips',
      label: <span><CarOutlined /> Trips ({trips?.length ?? 0})</span>,
      children: (
        <Card title="Trip History">
          <Table
            columns={tripColumns}
            dataSource={trips || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No trips recorded" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'timeoff',
      label: <span><CheckCircleOutlined /> Time Off ({timeOffData?.data?.length ?? 0})</span>,
      children: (
        <Card title="Time Off Requests">
          <Table
            columns={timeOffColumns}
            dataSource={timeOffData?.data || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No time off requests" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'attendance',
      label: <span><LoginOutlined /> Attendance ({attendanceData?.data?.length ?? 0})</span>,
      children: (
        <Card title="Attendance Logs">
          <Table
            columns={attendanceColumns}
            dataSource={attendanceData?.data || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No attendance records" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'shifts',
      label: <span><ClockCircleOutlined /> Shifts ({userShifts.length})</span>,
      children: (
        <Card
          title="Assigned Shifts"
          extra={
            <Button type="primary" size="small" icon={<ScheduleOutlined />} onClick={() => setAssignShiftOpen(true)}>
              Assign Shift
            </Button>
          }
        >
          {userShifts.length === 0 ? (
            <Empty description="No shifts assigned" />
          ) : (
            <Table
              dataSource={userShifts}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                { title: 'Shift Name', dataIndex: 'name', key: 'name' },
                {
                  title: 'Hours',
                  key: 'hours',
                  render: (_, r) => `${r.start_time} – ${r.end_time}`,
                },
                { title: 'Timezone', dataIndex: 'timezone', key: 'timezone' },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, r) => (
                    <Button
                      danger size="small" icon={<CloseCircleOutlined />}
                      onClick={() => showConfirmDialog({
                        title: 'Remove Shift',
                        content: `Remove "${r.name}" from this user?`,
                        onOk: () => handleRemoveShift(r.id),
                        danger: true,
                      })}
                    >
                      Remove
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`${user.first_name} ${user.last_name}`}
        subtitle={user.email}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
              Back
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/users/${id}/edit`)}>
              Edit
            </Button>
            <Button
              danger
              onClick={() =>
                showConfirmDialog({
                  title: 'Delete User',
                  content: `Are you sure you want to delete ${user.first_name} ${user.last_name}? This action cannot be undone.`,
                  onOk: async () => {
                    await deleteUser.mutateAsync(id!);
                    navigate('/users');
                  },
                  danger: true,
                })
              }
            >
              Delete
            </Button>
          </Space>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="line"
        size="middle"
        style={{ background: 'transparent' }}
      />

      {/* Assign Shift Modal */}
      <Modal
        title="Assign Shift"
        open={assignShiftOpen}
        onCancel={() => { setAssignShiftOpen(false); setSelectedShiftId(undefined); }}
        onOk={handleAssignShift}
        okText="Assign"
        okButtonProps={{ disabled: !selectedShiftId, loading: upsertSetting.isPending }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text type="secondary">Select a shift to assign to {user.first_name} {user.last_name}.</Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a shift"
            value={selectedShiftId}
            onChange={setSelectedShiftId}
            options={allShifts
              .filter((s) => !s.user_ids.includes(id!))
              .map((s) => ({
                value: s.id,
                label: `${s.name} (${s.start_time} – ${s.end_time}, ${s.timezone})`,
              }))}
          />
        </Space>
      </Modal>
    </div>
  );
}
