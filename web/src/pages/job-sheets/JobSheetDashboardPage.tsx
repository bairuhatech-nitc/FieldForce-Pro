import { useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Select, DatePicker, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  WarningOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import { formatDateTime } from '@/utils/format-date';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface JobSheetStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  completion_rate: number;
}

interface JobSheetRecord {
  id: string;
  template_name: string;
  work_order_number: string;
  technician_name: string;
  status: string;
  completion_percentage: number;
  items_completed: number;
  items_total: number;
  started_at: string;
  completed_at?: string;
}

export default function JobSheetDashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Mock data - replace with actual API calls
  const stats: JobSheetStats = {
    total: 156,
    completed: 98,
    in_progress: 42,
    pending: 16,
    completion_rate: 62.8,
  };

  const jobSheets: JobSheetRecord[] = [
    {
      id: '1',
      template_name: 'HVAC Maintenance Checklist',
      work_order_number: 'WO-2024-001',
      technician_name: 'John Doe',
      status: 'completed',
      completion_percentage: 100,
      items_completed: 12,
      items_total: 12,
      started_at: '2024-02-17T10:00:00Z',
      completed_at: '2024-02-17T14:30:00Z',
    },
    {
      id: '2',
      template_name: 'Electrical Safety Inspection',
      work_order_number: 'WO-2024-002',
      technician_name: 'Jane Smith',
      status: 'in_progress',
      completion_percentage: 65,
      items_completed: 13,
      items_total: 20,
      started_at: '2024-02-17T09:00:00Z',
    },
    {
      id: '3',
      template_name: 'Plumbing Service Form',
      work_order_number: 'WO-2024-003',
      technician_name: 'Mike Johnson',
      status: 'pending',
      completion_percentage: 0,
      items_completed: 0,
      items_total: 15,
      started_at: '2024-02-17T13:00:00Z',
    },
  ];

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: 'success',
      in_progress: 'processing',
      pending: 'default',
      failed: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined />;
      case 'in_progress':
        return <ClockCircleOutlined />;
      case 'pending':
        return <FileTextOutlined />;
      default:
        return <WarningOutlined />;
    }
  };

  const columns: ColumnsType<JobSheetRecord> = [
    {
      title: 'Work Order',
      dataIndex: 'work_order_number',
      key: 'work_order_number',
      render: (number: string) => (
        <span style={{ fontWeight: 500, color: '#1890ff', cursor: 'pointer' }}>
          {number}
        </span>
      ),
    },
    {
      title: 'Template',
      dataIndex: 'template_name',
      key: 'template_name',
    },
    {
      title: 'Technician',
      dataIndex: 'technician_name',
      key: 'technician_name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'In Progress', value: 'in_progress' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Completion',
      key: 'completion',
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Progress
            percent={record.completion_percentage}
            size="small"
            strokeColor={
              record.completion_percentage === 100
                ? '#52c41a'
                : record.completion_percentage > 50
                ? '#1890ff'
                : '#faad14'
            }
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.items_completed} / {record.items_total} items
          </Text>
        </Space>
      ),
      width: 180,
    },
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    },
    {
      title: 'Completed At',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date?: string) =>
        date ? formatDateTime(date) : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Job Sheet Dashboard"
        subtitle="Monitor job sheet completion and performance"
      />

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            options={[
              { label: 'All Status', value: undefined },
              { label: 'Completed', value: 'completed' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Pending', value: 'pending' },
            ]}
          />
        </Space>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Job Sheets"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.in_progress}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={stats.completion_rate}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: stats.completion_rate > 70 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Completion Overview */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Completion Progress">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text type="secondary">Overall Completion</Text>
                <Progress
                  percent={stats.completion_rate}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  strokeWidth={12}
                />
              </div>
              <div>
                <Text type="secondary">Completed vs Total</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={(stats.completed / stats.total) * 100}
                    success={{ percent: (stats.completed / stats.total) * 100 }}
                    strokeWidth={8}
                    format={() => `${stats.completed} / ${stats.total}`}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Status Distribution">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <span>Completed</span>
                </Space>
                <Tag color="success">{stats.completed}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <ClockCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
                  <span>In Progress</span>
                </Space>
                <Tag color="processing">{stats.in_progress}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <FileTextOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />
                  <span>Pending</span>
                </Space>
                <Tag color="default">{stats.pending}</Tag>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Job Sheets Table */}
      <Card title="Recent Job Sheets">
        <Table
          columns={columns}
          dataSource={jobSheets}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} job sheets`,
          }}
        />
      </Card>
    </div>
  );
}