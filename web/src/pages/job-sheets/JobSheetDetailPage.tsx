import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Table,
  Tag,
  Space,
  Spin,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  CameraOutlined,
  EditOutlined,
  NumberOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useJobSheetInstance, useJobSheetItems } from '@/hooks/use-job-sheets';
import { formatDateTime } from '@/utils/format-date';
import type { JobSheetItem } from '@/types/models.types';

const { Text } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  pending: 'blue',
  approved: 'cyan',
  in_progress: 'orange',
  completed: 'green',
};

const typeIcons: Record<string, React.ReactNode> = {
  checkbox: <CheckSquareOutlined />,
  text: <FileTextOutlined />,
  photo: <CameraOutlined />,
  signature: <EditOutlined />,
  number: <NumberOutlined />,
  date: <CalendarOutlined />,
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function JobSheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: instance, isLoading: instanceLoading } = useJobSheetInstance(id || '');
  const { data: items, isLoading: itemsLoading } = useJobSheetItems(id || '');

  if (instanceLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">Job sheet not found.</Text>
      </div>
    );
  }

  const notes = (instance.custom_fields as Record<string, unknown>)?.notes as string | undefined;

  const columns: ColumnsType<JobSheetItem> = [
    {
      title: 'Position',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      render: (val: number) => val + 1,
      defaultSortOrder: 'ascend' as const,
      sorter: (a: JobSheetItem, b: JobSheetItem) => a.sort_order - b.sort_order,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag icon={typeIcons[type]}>{type}</Tag>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (val: string | null) =>
        val ? <Text>{val}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Required',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 100,
      render: (req: boolean) =>
        req ? <Tag color="red">Required</Tag> : <Tag>Optional</Tag>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Job Sheet"
        subtitle={`ID: ${instance.id.slice(0, 8)}...`}
        extra={
          <Space>
            <Tag color={statusColors[instance.status] || 'default'} style={{ fontSize: 14, padding: '2px 10px' }}>
              {formatStatus(instance.status)}
            </Tag>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/job-sheets')}>
              Back
            </Button>
          </Space>
        }
      />

      <Card title="Details" style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Template">
            {instance.template?.name || (instance.template_id ? instance.template_id.slice(0, 8) + '...' : 'N/A')}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[instance.status] || 'default'}>
              {formatStatus(instance.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Work Order">
            {instance.work_order_id ? (
              <Link to={`/work-orders/${instance.work_order_id}`}>
                {instance.work_order_id.slice(0, 8)}...
              </Link>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Appointment">
            {instance.appointment_id ? (
              <Text>{instance.appointment_id.slice(0, 8)}...</Text>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created">
            {formatDateTime(instance.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {formatDateTime(instance.updated_at)}
          </Descriptions.Item>
          {instance.completed_at && (
            <Descriptions.Item label="Completed">
              {formatDateTime(instance.completed_at)}
            </Descriptions.Item>
          )}
          {notes && (
            <Descriptions.Item label="Notes" span={2}>
              {notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="Items">
        <Table
          columns={columns}
          dataSource={items || []}
          rowKey="id"
          loading={itemsLoading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
