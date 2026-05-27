import { Row, Col, Card, Statistic, Tag, Typography, Progress } from 'antd';
import {
  DatabaseOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ConsoleSqlOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useSuperAdminHealth } from '@/hooks/use-super-admin-health';

const { Title, Text } = Typography;

export default function SystemHealthPage() {
  const { data: health, isLoading } = useSuperAdminHealth();

  if (isLoading) {
    return <div>Loading health data...</div>;
  }

  if (!health) {
    return <div>Failed to load health data</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleOutlined />;
      case 'degraded': return <WarningOutlined />;
      case 'unhealthy': return <CloseCircleOutlined />;
      default: return undefined;
    }
  };

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Real-time platform infrastructure monitoring"
      />

      <div style={{ marginBottom: 24 }}>
        <Text strong>Overall Status: </Text>
        <Tag color={getStatusColor(health.status)} icon={getStatusIcon(health.status)}>
          {health.status.toUpperCase()}
        </Tag>
        <Text type="secondary" style={{ marginLeft: 16 }}>
          Last checked: {new Date(health.timestamp).toLocaleString()}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card 
            title={<span><ApiOutlined /> API Service</span>} 
            extra={<Tag color={getStatusColor(health.services.api.status)}>{health.services.api.status}</Tag>}
          >
            <Statistic
              title="Uptime"
              value={Math.floor(health.services.api.uptimeSeconds / 3600)}
              suffix="hours"
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <Text>Memory Usage</Text>
              <Progress percent={health.services.api.memoryUsage.usedPercentage} status="active" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {Math.round(health.services.api.memoryUsage.used / 1024 / 1024)} MB / {Math.round(health.services.api.memoryUsage.total / 1024 / 1024)} MB
              </Text>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text>CPU Load (1m)</Text>
              <div>
                <Text strong>{health.services.api.cpuLoad.toFixed(2)}</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card 
            title={<span><DatabaseOutlined /> PostgreSQL Database</span>}
            extra={<Tag color={getStatusColor(health.services.database.status)}>{health.services.database.status}</Tag>}
          >
            <Statistic
              title="Query Latency (SELECT 1)"
              value={health.services.database.queryTimeMs}
              suffix="ms"
              prefix={<ConsoleSqlOutlined />}
            />
            {health.services.database.queryTimeMs > 100 && (
              <div style={{ marginTop: 16 }}>
                <Text type="warning"><WarningOutlined /> High latency detected</Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card 
            title={<span><DatabaseOutlined /> Redis Cache</span>}
            extra={<Tag color={getStatusColor(health.services.redis.status)}>{health.services.redis.status}</Tag>}
          >
            <Statistic
              title="Ping Latency"
              value={health.services.redis.pingTimeMs}
              suffix="ms"
              prefix={<ConsoleSqlOutlined />}
            />
            {health.services.redis.pingTimeMs > 50 && (
              <div style={{ marginTop: 16 }}>
                <Text type="warning"><WarningOutlined /> High latency detected</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
