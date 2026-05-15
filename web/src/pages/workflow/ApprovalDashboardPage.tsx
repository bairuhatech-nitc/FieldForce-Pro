import { Row, Col, Card, Statistic, Table, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatDateTime } from '@/utils/format-date';
import { useApprovalDashboard, useMyPendingApprovals } from '@/hooks/use-workflow';
import type { DocumentApproval } from '@/types/workflow.types';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export default function ApprovalDashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useApprovalDashboard();
  const { data: pendingData, isLoading: pendingLoading } = useMyPendingApprovals({ take: 10 });

  const pendingColumns: ColumnsType<DocumentApproval> = [
    {
      title: 'Document Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => <Tag>{type.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Workflow',
      key: 'workflow',
      render: (_: unknown, record) => record.workflow_template?.name || '-',
    },
    {
      title: 'Step',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 70,
      render: (v: number) => `#${v}`,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => {
        if (!date) return '-';
        const isOverdue = new Date(date) < new Date();
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {formatDateTime(date)}
            {isOverdue && <Tag color="red" style={{ marginLeft: 4 }}>Overdue</Tag>}
          </Text>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Approval Dashboard</h2>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Total"
              value={stats?.total || 0}
              loading={statsLoading}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Pending"
              value={stats?.pending || 0}
              loading={statsLoading}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Approved"
              value={stats?.approved || 0}
              loading={statsLoading}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Rejected"
              value={stats?.rejected || 0}
              loading={statsLoading}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Overdue"
              value={stats?.overdue || 0}
              loading={statsLoading}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Approval Rate"
              value={stats?.approval_rate || 0}
              loading={statsLoading}
              valueStyle={{ color: '#1890ff' }}
              suffix="%"
              prefix={<PercentageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Pending Approvals */}
      <Card
        title="My Pending Approvals"
        extra={
          <a onClick={() => navigate('/workflow/approvals')}>View All</a>
        }
      >
        <Table
          columns={pendingColumns}
          dataSource={pendingData?.data || []}
          loading={pendingLoading}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No pending approvals' }}
        />
      </Card>
    </div>
  );
}
