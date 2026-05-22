import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Space,
  Tag,
  Button,
  Row,
  Col,
  Statistic,
  List,
  Avatar,
  Select,
  Alert,
  Badge,
  Tooltip,
  Typography,
  Empty,
  Progress,
  Divider,
} from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  DashboardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useAllAppointments } from '@/hooks/use-appointments';
import { useUsers } from '@/hooks/use-users';
import PageHeader from '@/components/common/PageHeader';
import { formatDateTime, formatRelative } from '@/utils/format-date';

const { Text, Title } = Typography;

interface AgentStatus {
  id: string;
  name: string;
  status: 'available' | 'on_route' | 'on_site' | 'offline';
  currentLocation?: { lat: number; lng: number; address: string };
  currentAppointment?: {
    id: string;
    wo_number: string;
    customer: string;
    eta: string;
  };
  todayStats: {
    completed: number;
    pending: number;
    distance: number;
  };
  lastUpdate: string;
  batteryLevel?: number;
}

const statusColors: Record<string, string> = {
  available: '#52c41a',
  on_route: '#1890ff',
  on_site: '#faad14',
  offline: '#d9d9d9',
};

const statusLabels: Record<string, string> = {
  available: 'Available',
  on_route: 'En Route',
  on_site: 'On Site',
  offline: 'Offline',
};

export default function LiveAgentTrackingPage() {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useAllAppointments();
  const { data: usersData, isLoading: usersLoading } = useUsers({ page: 1, take: 100 });

  const users = usersData?.data || [];

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchAppointments();
      setLastRefresh(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetchAppointments]);

  // Mock agent status data (in production, this would come from real-time GPS data)
  const agentStatuses: AgentStatus[] = users.map((user, index) => {
    const activeAppointment = appointments.find(
      (apt) => apt.agent_id === user.id && apt.status === 'in_progress'
    );

    const todayAppointments = appointments.filter((apt) => apt.agent_id === user.id);
    const completedToday = todayAppointments.filter((apt) => apt.status === 'completed').length;
    const pendingToday = todayAppointments.filter((apt) => apt.status === 'scheduled').length;

    let status: AgentStatus['status'] = 'available';
    if (activeAppointment) {
      status = 'on_site';
    } else if (index % 5 === 0) {
      status = 'offline';
    }

    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      status,
      currentLocation: {
        lat: 37.7749 + (Math.random() - 0.5) * 0.1,
        lng: -122.4194 + (Math.random() - 0.5) * 0.1,
        address: `${Math.floor(Math.random() * 9999)} Market St, San Francisco, CA`,
      },
      currentAppointment: activeAppointment
        ? {
            id: activeAppointment.id,
            wo_number: activeAppointment.work_order?.wo_number || 'N/A',
            customer: 'Customer Name',
            eta: formatDateTime(activeAppointment.scheduled_start),
          }
        : undefined,
      todayStats: {
        completed: completedToday,
        pending: pendingToday,
        distance: Math.floor(Math.random() * 100) + 20,
      },
      lastUpdate: new Date().toISOString(),
      batteryLevel: Math.floor(Math.random() * 40) + 60,
    };
  });

  // Filter agents
  const filteredAgents = agentStatuses.filter((agent) => {
    if (selectedAgent && agent.id !== selectedAgent) return false;
    if (selectedStatus && agent.status !== selectedStatus) return false;
    return true;
  });

  // Calculate statistics
  const totalAgents = agentStatuses.length;
  const activeAgents = agentStatuses.filter((a) => a.status !== 'offline').length;
  const onRoute = agentStatuses.filter((a) => a.status === 'on_route').length;
  const onSite = agentStatuses.filter((a) => a.status === 'on_site').length;
  const totalCompletedToday = agentStatuses.reduce((sum, a) => sum + a.todayStats.completed, 0);
  const totalDistance = agentStatuses.reduce((sum, a) => sum + a.todayStats.distance, 0);

  return (
    <div>
      <PageHeader
        title="Live Agent Tracking"
        subtitle="Real-time field agent locations and status monitoring"
        extra={
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              type="primary"
              ghost
            >
              AI Route Optimization
            </Button>
            <Button
              icon={<ReloadOutlined spin={autoRefresh} />}
              onClick={() => {
                refetchAppointments();
                setLastRefresh(new Date());
              }}
              loading={appointmentsLoading}
            >
              Refresh
            </Button>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
            </Button>
          </Space>
        }
      />

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Agents"
              value={activeAgents}
              suffix={`/ ${totalAgents}`}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="En Route"
              value={onRoute}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="On Site"
              value={onSite}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={totalCompletedToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* AI Optimization Alert */}
      <Alert
        message={
          <Space>
            <ThunderboltOutlined />
            <Text strong>AI Route Optimization Active</Text>
          </Space>
        }
        description="Real-time traffic analysis suggests reassigning Agent Mike Johnson's next appointment to Agent Sarah Lee - estimated time savings: 22 minutes"
        type="info"
        showIcon
        icon={<RocketOutlined />}
        action={
          <Button size="small" type="primary">
            Apply Suggestion
          </Button>
        }
        closable
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        {/* Map Section */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <EnvironmentOutlined />
                <span>Live Agent Map</span>
                <Badge count={activeAgents} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Last updated: {formatRelative(lastRefresh)}
                </Text>
                <SyncOutlined spin={autoRefresh} style={{ color: autoRefresh ? '#52c41a' : '#999' }} />
              </Space>
            }
          >
            <Alert
              message="Map Integration Pending"
              description={
                <div>
                  <p>
                    The interactive live tracking map will be integrated here using Mapbox GL or Google Maps.
                    Features:
                  </p>
                  <ul style={{ marginTop: 8 }}>
                    <li>Real-time agent location pins with status colors</li>
                    <li>Current route visualization</li>
                    <li>Traffic overlay (Google Maps)</li>
                    <li>Geofencing for service areas</li>
                    <li>Heat map for agent density</li>
                    <li>Click agents to view details</li>
                    <li>Auto-center on selected agent</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div
              style={{
                border: '2px dashed #d9d9d9',
                borderRadius: 8,
                height: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <EnvironmentOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Title level={4} style={{ color: '#999', margin: 0 }}>
                Live Agent Map
              </Title>
              <Text type="secondary">
                {activeAgents} agents currently being tracked
              </Text>
              <Space wrap style={{ marginTop: 12 }}>
                <Tag color={statusColors.available}>
                  <Badge color={statusColors.available} /> Available
                </Tag>
                <Tag color={statusColors.on_route}>
                  <Badge color={statusColors.on_route} /> En Route
                </Tag>
                <Tag color={statusColors.on_site}>
                  <Badge color={statusColors.on_site} /> On Site
                </Tag>
                <Tag color={statusColors.offline}>
                  <Badge color={statusColors.offline} /> Offline
                </Tag>
              </Space>
            </div>
          </Card>

          {/* AI Insights */}
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#1890ff' }} />
                <span>AI-Powered Insights</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>🎯 Route Efficiency</Text>
                    <Progress percent={87} strokeColor="#1890ff" />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Today's routes are 12% more efficient than yesterday
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>⚡ Performance</Text>
                    <Progress percent={92} strokeColor="#52c41a" />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Average job completion: 15% faster than expected
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ padding: 12, background: '#fff7e6', borderRadius: 6 }}>
                <Space>
                  <WarningOutlined style={{ color: '#fa8c16' }} />
                  <Text strong>Traffic Alert</Text>
                </Space>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Heavy traffic detected on Highway 101. Estimated 18-minute delay for 3 agents.
                </Text>
              </div>
              <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 6 }}>
                <Space>
                  <RocketOutlined style={{ color: '#1890ff' }} />
                  <Text strong>Optimization Opportunity</Text>
                </Space>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  By reassigning 2 appointments, we can reduce total drive time by 45 minutes.
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Agent List Section */}
        <Col xs={24} lg={8}>
          <Card
            title="Agent Status"
            size="small"
            extra={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  placeholder="Filter by agent"
                  allowClear
                  value={selectedAgent}
                  onChange={setSelectedAgent}
                  style={{ width: '100%' }}
                  loading={usersLoading}
                  options={users.map((user) => ({
                    value: user.id,
                    label: `${user.first_name} ${user.last_name}`,
                  }))}
                />
                <Select
                  placeholder="Filter by status"
                  allowClear
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'available', label: 'Available' },
                    { value: 'on_route', label: 'En Route' },
                    { value: 'on_site', label: 'On Site' },
                    { value: 'offline', label: 'Offline' },
                  ]}
                />
              </Space>
            }
            style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
          >
            {filteredAgents.length === 0 ? (
              <Empty description="No agents found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={filteredAgents}
                renderItem={(agent) => (
                  <List.Item style={{ padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <Badge dot color={statusColors[agent.status]} offset={[-5, 35]}>
                          <Avatar
                            size={48}
                            style={{
                              backgroundColor: statusColors[agent.status],
                            }}
                          >
                            {agent.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <Space>
                          <Text strong>{agent.name}</Text>
                          <Tag color={statusColors[agent.status]} style={{ margin: 0 }}>
                            {statusLabels[agent.status]}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {agent.currentAppointment && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Current: {agent.currentAppointment.wo_number}
                              </Text>
                            </div>
                          )}
                          <Space size="small" wrap>
                            <Tooltip title="Completed Today">
                              <Tag icon={<CheckCircleOutlined />} color="success">
                                {agent.todayStats.completed}
                              </Tag>
                            </Tooltip>
                            <Tooltip title="Pending">
                              <Tag icon={<ClockCircleOutlined />} color="processing">
                                {agent.todayStats.pending}
                              </Tag>
                            </Tooltip>
                            <Tooltip title="Distance Today">
                              <Tag icon={<DashboardOutlined />} color="default">
                                {agent.todayStats.distance} km
                              </Tag>
                            </Tooltip>
                          </Space>
                          {agent.batteryLevel && agent.batteryLevel < 20 && (
                            <Alert
                              message="Low battery"
                              type="warning"
                              showIcon
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            />
                          )}
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <ClockCircleOutlined /> {formatRelative(new Date(agent.lastUpdate))}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
