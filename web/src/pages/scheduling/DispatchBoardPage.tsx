import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Table, Space, Tooltip, Tag, Tabs, Card, Descriptions, Skeleton, Modal, Select, Divider, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, UserAddOutlined, ReloadOutlined, CalendarOutlined, FileTextOutlined, TeamOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { workOrdersApi } from '@/api/work-orders.api';
import type { WorkOrder } from '@/types/models.types';

// Fix default Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const { Text } = Typography;
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAppointments,
  useAssignTechnician,
  useScheduleAssigner,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { useAgents } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth.store';
import type { ServiceAppointment } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';
import { formatDateTime } from '@/utils/format-date';

const statusColors: Record<string, string> = {
  scheduled: 'blue',
  in_progress: 'processing',
  completed: 'green',
  cancelled: 'red',
};

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusTransitions: Record<string, string[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function DispatchBoardPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Shared pagination (reset on tab switch — matching SR pattern)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Status filter for "All" tab (server-side filtering via query param)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ServiceAppointment | null>(null);

  // Assign modal
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ServiceAppointment | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const assignTechnician = useAssignTechnician();
  const updateStatus = useUpdateAppointmentStatus();
  const { data: agents = [] } = useAgents();
  const { data: scheduleAssignerId } = useScheduleAssigner();

  // Only the designated schedule assigner (from SCHEDULE workflow) can assign techs
  const canAssign = user?.id != null && user.id === scheduleAssignerId;

  // Resolve assigner name for the info banner
  const assignerAgent = agents.find((a: { id: string }) => a.id === scheduleAssignerId);
  const assignerName = assignerAgent
    ? `${(assignerAgent as any).first_name} ${(assignerAgent as any).last_name}`
    : null;

  // ─── Queries (only active tab fetches — matching SR pattern) ───────

  // Tab 1: All Appointments — show every appointment regardless of status
  const allQuery = useAppointments(
    {
      page,
      take: pageSize,
      search,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    activeTab === 'all',
  );

  // Tab 2: New / Assign — only scheduled appointments with no technician assigned
  const newQuery = useAppointments(
    { page, take: pageSize, search, status: 'scheduled', unassigned: 'true' },
    activeTab === 'new',
  );

  // Pick active query
  const currentQuery = activeTab === 'all' ? allQuery : newQuery;
  const appointments = currentQuery.data?.data || [];
  const meta = currentQuery.data?.meta;
  const isLoading = currentQuery.isLoading;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-open detail modal when arriving via appointment notification link
  useEffect(() => {
    const appointmentId = searchParams.get('appointment_id');
    if (appointmentId && appointments.length > 0) {
      const target = appointments.find((a) => a.id === appointmentId);
      if (target) {
        setSelectedAppointment(target);
        setDetailVisible(true);
      }
    }
  }, [searchParams, appointments]);

  // Reset page when switching tabs (matching SR pattern)
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    setSearch('');
    setSearchInput('');
    setStatusFilter(undefined);
  };

  const handleViewDetail = (appointment: ServiceAppointment) => {
    setSelectedAppointment(appointment);
    setDetailVisible(true);
  };

  const handleOpenAssign = (appointment: ServiceAppointment) => {
    setAssignTarget(appointment);
    setSelectedAgentId(undefined);
    setAssignVisible(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignTarget || !selectedAgentId) return;
    await assignTechnician.mutateAsync({ id: assignTarget.id, agentId: selectedAgentId });
    setAssignVisible(false);
    setAssignTarget(null);
    setSelectedAgentId(undefined);
    // Technician assigned (status stays scheduled), refresh & switch to All tab
    await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    await queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
    setActiveTab('all');
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
    if (selectedAppointment && selectedAppointment.id === id) {
      setSelectedAppointment({ ...selectedAppointment, status: newStatus as ServiceAppointment['status'] });
    }
  };

  const handleReload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  }, [queryClient]);

  // Live map: fetch all work orders with locations, auto-refresh every 30s
  const { data: mapWorkOrders = [], refetch: refetchMap } = useQuery({
    queryKey: ['work-orders', 'dispatch-map'],
    queryFn: async () => {
      const res = await workOrdersApi.getAllNonPaginated();
      return (res.data.data || []) as WorkOrder[];
    },
    enabled: activeTab === 'map',
    refetchInterval: activeTab === 'map' ? 30000 : false,
  });

  const jobsWithLocation = mapWorkOrders.filter(
    (wo) => wo.location?.lat && wo.location?.lng,
  );

  // ─── Shared columns (without actions) ─────────────────────────────

  const baseColumns: ColumnsType<ServiceAppointment> = [
    {
      title: 'Agent',
      key: 'agent',
      render: (_, record) =>
        record.agent
          ? `${record.agent.first_name} ${record.agent.last_name}`
          : <Tag color="orange">Unassigned</Tag>,
    },
    {
      title: 'Work Order',
      key: 'work_order',
      render: (_, record) =>
        record.work_order
          ? <span style={{ fontWeight: 500 }}>{record.work_order.wo_number || record.work_order.summary}</span>
          : <span style={{ color: '#999' }}>{record.work_order_id || '-'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {formatStatus(status)}
        </Tag>
      ),
    },
    {
      title: 'Scheduled Start',
      dataIndex: 'scheduled_start',
      key: 'scheduled_start',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ opacity: 0.5 }}>-</span>,
      sorter: (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
    },
    {
      title: 'Scheduled End',
      dataIndex: 'scheduled_end',
      key: 'scheduled_end',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ opacity: 0.5 }}>-</span>,
      sorter: (a, b) => new Date(a.scheduled_end).getTime() - new Date(b.scheduled_end).getTime(),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ opacity: 0.5 }}>-</span>,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
  ];

  // ─── Tab-specific action columns ──────────────────────────────────

  // Tab 1 (All): View only
  const allColumns: ColumnsType<ServiceAppointment> = [
    ...baseColumns,
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <PermissionGuard anyPermissions={['service_appointments:read', 'scheduling:read']}>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} />
          </Tooltip>
        </PermissionGuard>
      ),
    },
  ];

  // Tab 2 (New / Assign): View + Assign Technician
  const newColumns: ColumnsType<ServiceAppointment> = [
    ...baseColumns,
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard anyPermissions={['service_appointments:read', 'scheduling:read']}>
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} />
            </Tooltip>
          </PermissionGuard>
          {canAssign && !record.agent_id && (
            <Tooltip title="Assign Technician">
              <Button type="primary" icon={<UserAddOutlined />} size="small" onClick={() => handleOpenAssign(record)}>
                Assign
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const columns = activeTab === 'all' ? allColumns : newColumns;

  const availableTransitions = selectedAppointment
    ? statusTransitions[selectedAppointment.status] || []
    : [];

  const tabItems = [
    { key: 'all', label: 'All Appointments' },
    { key: 'new', label: 'New / Assign' },
    { key: 'map', label: <span><EnvironmentOutlined style={{ marginRight: 4 }} />Live Map</span> },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.scheduling')}
        subtitle="Dispatch board for service appointments"
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {activeTab !== 'map' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <SearchFilter
              placeholder="Search appointments..."
              allowClear
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: 400 }}
            />
            {activeTab === 'all' && (
              <Select
                placeholder="Filter by status"
                allowClear
                value={statusFilter}
                onChange={(value) => { setStatusFilter(value); setPage(1); }}
                options={statusOptions}
                style={{ width: 200 }}
              />
            )}
            <Button icon={<ReloadOutlined />} onClick={handleReload}>Reload</Button>
          </div>

          {activeTab === 'new' && (
            <Alert
              type={canAssign ? 'info' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                canAssign
                  ? `You are the designated assigner for scheduling.${assignerName ? ` (${assignerName})` : ''}`
                  : scheduleAssignerId
                    ? `Only the designated assigner${assignerName ? ` (${assignerName})` : ''} can assign technicians.`
                    : 'No SCHEDULE workflow is configured. Configure a SCHEDULE workflow in Workflow Settings to designate an assigner.'
              }
            />
          )}

          <Table
            columns={columns}
            dataSource={appointments}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1200 }}
            pagination={{
              current: page,
              pageSize,
              total: meta?.itemCount || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} appointments`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        </>
      )}

      {activeTab === 'map' && (
        <Card
          extra={
            <Button icon={<ReloadOutlined />} size="small" onClick={() => refetchMap()}>
              Refresh
            </Button>
          }
        >
          <Space style={{ marginBottom: 12 }}>
            <Tag color="red">Unassigned</Tag>
            <Tag color="blue">Assigned / In Progress</Tag>
            <Tag color="green">Completed</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>Auto-refreshes every 30s</Text>
          </Space>
          {jobsWithLocation.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
              No jobs with GPS location data found.
            </div>
          ) : (
            <div style={{ height: 500, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9' }}>
              <MapContainer
                center={[Number(jobsWithLocation[0].location!.lat), Number(jobsWithLocation[0].location!.lng)]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {jobsWithLocation.map((wo) => {
                  const lat = Number(wo.location!.lat);
                  const lng = Number(wo.location!.lng);
                  const icon = wo.status === 'completed' || wo.status === 'closed'
                    ? greenIcon
                    : wo.assigned_to
                      ? blueIcon
                      : redIcon;
                  return (
                    <Marker key={wo.id} position={[lat, lng]} icon={icon}>
                      <Popup>
                        <strong>{wo.wo_number || wo.id}</strong>
                        <div style={{ fontSize: 12, marginTop: 4 }}>{wo.summary}</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          Status: <Tag style={{ fontSize: 11 }}>{wo.status.replace(/_/g, ' ')}</Tag>
                        </div>
                        {wo.location?.address && (
                          <div style={{ fontSize: 12, marginTop: 2, color: '#666' }}>{wo.location.address}</div>
                        )}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </Card>
      )}

      {/* Assign Technician Modal */}
      <Modal
        title={null}
        open={assignVisible}
        onCancel={() => { setAssignVisible(false); setAssignTarget(null); setSelectedAgentId(undefined); }}
        onOk={handleAssignSubmit}
        okText="Assign"
        okButtonProps={{ disabled: !selectedAgentId, loading: assignTechnician.isPending }}
        width={520}
      >
        {assignTarget && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <UserAddOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Assign Technician</div>
              <Text type="secondary">Select a technician to assign to this job</Text>
            </div>

            <Card size="small" style={{ marginBottom: 20, background: '#fafafa', border: '1px solid #f0f0f0' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileTextOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Work Order</Text>
                    <div style={{ fontWeight: 500 }}>
                      {assignTarget.work_order
                        ? `${assignTarget.work_order.wo_number || 'N/A'}`
                        : assignTarget.work_order_id}
                    </div>
                    {assignTarget.work_order?.summary && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{assignTarget.work_order.summary}</Text>
                    )}
                  </div>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CalendarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Schedule</Text>
                    <div style={{ fontWeight: 500 }}>
                      {assignTarget.scheduled_start ? formatDateTime(assignTarget.scheduled_start) : '-'}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      to {assignTarget.scheduled_end ? formatDateTime(assignTarget.scheduled_end) : '-'}
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <TeamOutlined style={{ color: '#1677ff' }} />
              <Text strong>Select Technician</Text>
            </div>
            <Select
              placeholder="Search and select a technician..."
              showSearch
              size="large"
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              style={{ width: '100%' }}
              optionFilterProp="label"
              options={agents.map((agent: { id: string; first_name: string; last_name: string; email: string }) => ({
                value: agent.id,
                label: `${agent.first_name} ${agent.last_name} (${agent.email})`,
              }))}
            />
          </div>
        )}
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal
        title="Appointment Details"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedAppointment ? (
          <div>
            {availableTransitions.length > 0 && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space>
                  <span style={{ fontWeight: 500 }}>Transition to:</span>
                  {availableTransitions.map((status) => (
                    <Button
                      key={status}
                      type="primary"
                      size="small"
                      loading={updateStatus.isPending}
                      onClick={() => handleStatusChange(selectedAppointment.id, status)}
                    >
                      {formatStatus(status)}
                    </Button>
                  ))}
                </Space>
              </Card>
            )}
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Agent">
                {selectedAppointment.agent
                  ? `${selectedAppointment.agent.first_name} ${selectedAppointment.agent.last_name}`
                  : <Tag color="orange">Unassigned</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[selectedAppointment.status] || 'default'}>
                  {formatStatus(selectedAppointment.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Work Order">
                {selectedAppointment.work_order
                  ? selectedAppointment.work_order.wo_number || selectedAppointment.work_order.summary
                  : selectedAppointment.work_order_id || <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Crew ID">
                {selectedAppointment.crew_id || <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled Start">
                {selectedAppointment.scheduled_start ? formatDateTime(selectedAppointment.scheduled_start) : <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled End">
                {selectedAppointment.scheduled_end ? formatDateTime(selectedAppointment.scheduled_end) : <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Actual Start">
                {selectedAppointment.actual_start ? formatDateTime(selectedAppointment.actual_start) : <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Actual End">
                {selectedAppointment.actual_end ? formatDateTime(selectedAppointment.actual_end) : <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Recurring">
                {selectedAppointment.is_recurring ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Recurrence Rule">
                {selectedAppointment.recurrence_rule || <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {selectedAppointment.notes || <span style={{ opacity: 0.5 }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {formatDateTime(selectedAppointment.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="Updated At">
                {formatDateTime(selectedAppointment.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <Skeleton active />
        )}
      </Modal>
    </div>
  );
}
