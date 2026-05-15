import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Input,
  Select,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface EquipmentHealth {
  id: string;
  name: string;
  category: string;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  failure_probability: number;
  last_maintenance: string;
  predicted_failure: string | null;
  status: string;
}

const RISK_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: 'magenta',
};

const RISK_ICONS: Record<string, React.ReactNode> = {
  low: <CheckCircleOutlined />,
  medium: <ExclamationCircleOutlined />,
  high: <WarningOutlined />,
  critical: <CloseCircleOutlined />,
};

// Demo data
const DEMO_DATA: EquipmentHealth[] = [
  { id: '1', name: 'HVAC Unit A-101', category: 'HVAC', health_score: 92, risk_level: 'low', failure_probability: 0.08, last_maintenance: '2026-01-15', predicted_failure: null, status: 'operational' },
  { id: '2', name: 'Generator B-205', category: 'Power', health_score: 67, risk_level: 'medium', failure_probability: 0.33, last_maintenance: '2025-11-20', predicted_failure: '2026-06-15', status: 'operational' },
  { id: '3', name: 'Compressor C-302', category: 'Industrial', health_score: 38, risk_level: 'high', failure_probability: 0.62, last_maintenance: '2025-08-10', predicted_failure: '2026-03-20', status: 'warning' },
  { id: '4', name: 'Pump D-410', category: 'Plumbing', health_score: 15, risk_level: 'critical', failure_probability: 0.85, last_maintenance: '2025-05-01', predicted_failure: '2026-02-25', status: 'critical' },
  { id: '5', name: 'Elevator E-001', category: 'Transport', health_score: 81, risk_level: 'low', failure_probability: 0.19, last_maintenance: '2026-01-28', predicted_failure: null, status: 'operational' },
  { id: '6', name: 'Boiler F-102', category: 'HVAC', health_score: 55, risk_level: 'medium', failure_probability: 0.45, last_maintenance: '2025-10-05', predicted_failure: '2026-05-10', status: 'warning' },
];

export default function EquipmentHealthDashboardPage() {
  const [searchText, setSearchText] = useState('');
  const [riskFilter, setRiskFilter] = useState<string | undefined>();

  const filteredData = DEMO_DATA.filter((item) => {
    const matchesSearch = !searchText || item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesRisk = !riskFilter || item.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const stats = {
    total: DEMO_DATA.length,
    healthy: DEMO_DATA.filter((d) => d.risk_level === 'low').length,
    warning: DEMO_DATA.filter((d) => d.risk_level === 'medium' || d.risk_level === 'high').length,
    critical: DEMO_DATA.filter((d) => d.risk_level === 'critical').length,
    avgHealth: Math.round(DEMO_DATA.reduce((sum, d) => sum + d.health_score, 0) / DEMO_DATA.length),
  };

  const columns: ColumnsType<EquipmentHealth> = [
    {
      title: 'Equipment',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.category}</Text>
        </Space>
      ),
    },
    {
      title: 'Health Score',
      dataIndex: 'health_score',
      key: 'health_score',
      sorter: (a, b) => a.health_score - b.health_score,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : score >= 40 ? 'exception' : 'exception'}
          strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : score >= 40 ? '#ff4d4f' : '#cf1322'}
        />
      ),
    },
    {
      title: 'Risk Level',
      dataIndex: 'risk_level',
      key: 'risk_level',
      render: (risk: string) => (
        <Tag color={RISK_COLORS[risk]} icon={RISK_ICONS[risk]}>
          {risk.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Failure Probability',
      dataIndex: 'failure_probability',
      key: 'failure_probability',
      sorter: (a, b) => a.failure_probability - b.failure_probability,
      render: (prob: number) => (
        <Text type={prob > 0.7 ? 'danger' : prob > 0.3 ? 'warning' : undefined}>
          {(prob * 100).toFixed(1)}%
        </Text>
      ),
    },
    {
      title: 'Last Maintenance',
      dataIndex: 'last_maintenance',
      key: 'last_maintenance',
    },
    {
      title: 'Predicted Failure',
      dataIndex: 'predicted_failure',
      key: 'predicted_failure',
      render: (date: string | null) =>
        date ? <Text type="danger">{date}</Text> : <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">View Details</Button>
          <Button type="link" size="small">Run Prediction</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <DashboardOutlined /> Equipment Health Dashboard
            </Title>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />}>Refresh Scores</Button>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic title="Total Equipment" value={stats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Healthy"
                value={stats.healthy}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Needs Attention"
                value={stats.warning}
                valueStyle={{ color: '#cf8700' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Critical"
                value={stats.critical}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Row justify="space-between" style={{ marginBottom: 16 }}>
            <Col>
              <Space>
                <Input
                  placeholder="Search equipment..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
                <Select
                  placeholder="Risk Level"
                  value={riskFilter}
                  onChange={setRiskFilter}
                  allowClear
                  style={{ width: 150 }}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                    { label: 'Critical', value: 'critical' },
                  ]}
                />
              </Space>
            </Col>
            <Col>
              <Tooltip title="Average Health Score">
                <Tag color={stats.avgHealth >= 70 ? 'green' : stats.avgHealth >= 50 ? 'orange' : 'red'}>
                  Avg Health: {stats.avgHealth}%
                </Tag>
              </Tooltip>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  );
}
