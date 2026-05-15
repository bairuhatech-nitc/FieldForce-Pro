import { useState } from 'react';
import { Card, Row, Col, Typography, Progress, Tag, Table, Statistic, Space, Select, Button, Empty } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useServiceAgreements } from '@/hooks/use-service-agreements';
import PageHeader from '@/components/common/PageHeader';
import { formatDate } from '@/utils/format-date';
import type { ServiceAgreement } from '@/types/models.types';

const { Title, Text } = Typography;

interface SLAMetrics {
  agreementId: string;
  agreementName: string;
  responseTimeCompliance: number;
  resolutionTimeCompliance: number;
  totalRequests: number;
  breaches: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

function calculateSLAMetrics(agreement: ServiceAgreement): SLAMetrics {
  // Mock calculation - in real implementation, this would use actual data
  const responseCompliance = Math.floor(Math.random() * 30) + 70; // 70-100%
  const resolutionCompliance = Math.floor(Math.random() * 30) + 70; // 70-100%
  const totalRequests = Math.floor(Math.random() * 100) + 20;
  const breaches = Math.floor(Math.random() * 10);

  const avgCompliance = (responseCompliance + resolutionCompliance) / 2;
  let status: SLAMetrics['status'] = 'excellent';
  if (avgCompliance < 95) status = 'good';
  if (avgCompliance < 85) status = 'warning';
  if (avgCompliance < 75) status = 'critical';

  return {
    agreementId: agreement.id,
    agreementName: agreement.agreement_number || 'N/A',
    responseTimeCompliance: responseCompliance,
    resolutionTimeCompliance: resolutionCompliance,
    totalRequests,
    breaches,
    status,
  };
}

const statusColors: Record<string, string> = {
  excellent: '#52c41a',
  good: '#1890ff',
  warning: '#faad14',
  critical: '#ff4d4f',
};

const statusLabels: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  warning: 'At Risk',
  critical: 'Critical',
};

export default function SLAComplianceDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: agreementsData, isLoading, refetch } = useServiceAgreements({ page: 1, take: 100 });
  const agreements = agreementsData?.data || [];

  // Calculate metrics for all agreements
  const slaMetrics = agreements.map(calculateSLAMetrics);

  // Filter by status
  const filteredMetrics = statusFilter
    ? slaMetrics.filter((m) => m.status === statusFilter)
    : slaMetrics;

  // Calculate overall statistics
  const avgResponseCompliance =
    slaMetrics.length > 0
      ? slaMetrics.reduce((sum, m) => sum + m.responseTimeCompliance, 0) / slaMetrics.length
      : 0;

  const avgResolutionCompliance =
    slaMetrics.length > 0
      ? slaMetrics.reduce((sum, m) => sum + m.resolutionTimeCompliance, 0) / slaMetrics.length
      : 0;

  const totalBreaches = slaMetrics.reduce((sum, m) => sum + m.breaches, 0);
  const criticalCount = slaMetrics.filter((m) => m.status === 'critical').length;
  const warningCount = slaMetrics.filter((m) => m.status === 'warning').length;

  const columns = [
    {
      title: 'Agreement',
      dataIndex: 'agreementName',
      key: 'agreementName',
      render: (text: string, record: SLAMetrics) => (
        <Button
          type="link"
          onClick={() => navigate(`/agreements/${record.agreementId}`)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status].toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Excellent', value: 'excellent' },
        { text: 'Good', value: 'good' },
        { text: 'At Risk', value: 'warning' },
        { text: 'Critical', value: 'critical' },
      ],
      onFilter: (value: string | number | boolean, record: SLAMetrics) => record.status === value,
    },
    {
      title: 'Response Time Compliance',
      dataIndex: 'responseTimeCompliance',
      key: 'responseTimeCompliance',
      render: (value: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={value}
            size="small"
            style={{ width: 100 }}
            strokeColor={value >= 95 ? '#52c41a' : value >= 85 ? '#1890ff' : value >= 75 ? '#faad14' : '#ff4d4f'}
          />
          <Text>{value}%</Text>
        </div>
      ),
      sorter: (a: SLAMetrics, b: SLAMetrics) => a.responseTimeCompliance - b.responseTimeCompliance,
    },
    {
      title: 'Resolution Time Compliance',
      dataIndex: 'resolutionTimeCompliance',
      key: 'resolutionTimeCompliance',
      render: (value: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={value}
            size="small"
            style={{ width: 100 }}
            strokeColor={value >= 95 ? '#52c41a' : value >= 85 ? '#1890ff' : value >= 75 ? '#faad14' : '#ff4d4f'}
          />
          <Text>{value}%</Text>
        </div>
      ),
      sorter: (a: SLAMetrics, b: SLAMetrics) => a.resolutionTimeCompliance - b.resolutionTimeCompliance,
    },
    {
      title: 'Total Requests',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      sorter: (a: SLAMetrics, b: SLAMetrics) => a.totalRequests - b.totalRequests,
    },
    {
      title: 'Breaches',
      dataIndex: 'breaches',
      key: 'breaches',
      render: (value: number) => (
        <Tag color={value === 0 ? 'green' : value < 5 ? 'orange' : 'red'}>
          {value}
        </Tag>
      ),
      sorter: (a: SLAMetrics, b: SLAMetrics) => a.breaches - b.breaches,
    },
  ];

  return (
    <div>
      <PageHeader
        title="SLA Compliance Dashboard"
        subtitle="Monitor service level agreement performance"
      />

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex={1}>
            <Space>
              <Text type="secondary">Time Range:</Text>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 150 }}
                options={[
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                  { value: '1y', label: 'Last year' },
                ]}
              />
              <Text type="secondary">Status:</Text>
              <Select
                placeholder="All Statuses"
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
                options={[
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'warning', label: 'At Risk' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Response Compliance"
              value={avgResponseCompliance.toFixed(1)}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: avgResponseCompliance >= 95 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Resolution Compliance"
              value={avgResolutionCompliance.toFixed(1)}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: avgResolutionCompliance >= 95 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="At Risk Agreements"
              value={warningCount + criticalCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: warningCount + criticalCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Breaches"
              value={totalBreaches}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: totalBreaches > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {criticalCount > 0 && (
        <Card
          style={{
            marginBottom: 16,
            borderColor: '#ff4d4f',
            backgroundColor: '#fff1f0',
          }}
        >
          <Space>
            <WarningOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
            <div>
              <Text strong style={{ color: '#ff4d4f' }}>
                Critical Alert:
              </Text>
              <Text style={{ marginLeft: 8 }}>
                {criticalCount} agreement{criticalCount > 1 ? 's' : ''} require immediate attention
              </Text>
            </div>
          </Space>
        </Card>
      )}

      <Card title="SLA Compliance by Agreement">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>Loading...</div>
        ) : filteredMetrics.length === 0 ? (
          <Empty description="No service agreements found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredMetrics}
            rowKey="agreementId"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} agreements`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
