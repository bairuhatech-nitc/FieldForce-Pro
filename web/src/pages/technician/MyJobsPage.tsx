import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Button, Space, Typography, Empty, Spin, Badge } from 'antd';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMyJobs } from '@/hooks/use-work-orders';
import PageHeader from '@/components/common/PageHeader';
import type { WorkOrder } from '@/types/models.types';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  estimated: 'cyan',
  approved: 'geekblue',
  scheduled: 'purple',
  in_progress: 'orange',
  on_hold: 'gold',
  completed: 'green',
  closed: 'default',
  cancelled: 'red',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

const STATUS_TABS = [
  { key: 'all', label: 'All Jobs' },
  { key: 'new', label: 'New' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function JobCard({ job, onView }: { job: WorkOrder; onView: (id: string) => void }) {
  return (
    <Card
      style={{ marginBottom: 12 }}
      bodyStyle={{ padding: '16px 20px' }}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>{job.wo_number || '—'}</Text>
            <Tag color={STATUS_COLORS[job.status] ?? 'default'} style={{ margin: 0 }}>
              {formatStatus(job.status)}
            </Tag>
            <Tag color={PRIORITY_COLORS[job.priority] ?? 'default'} style={{ margin: 0 }}>
              {formatStatus(job.priority)}
            </Tag>
          </div>
          <Title level={5} style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600 }}>
            {job.summary}
          </Title>
          <Space direction="vertical" size={2}>
            {job.contact && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                {job.contact.first_name} {job.contact.last_name}
              </Text>
            )}
            {job.location?.address && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {job.location.address}
              </Text>
            )}
            {job.scheduled_start && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {dayjs(job.scheduled_start).format('MMM D, YYYY h:mm A')}
              </Text>
            )}
          </Space>
        </div>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => onView(job.id)}
          style={{ flexShrink: 0 }}
        >
          View Job
        </Button>
      </div>
    </Card>
  );
}

export default function MyJobsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useMyJobs(
    activeTab === 'all' ? { take: 50 } : { take: 50, status: activeTab }
  );

  const jobs = data?.data ?? [];

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader title="My Jobs" subtitle="Work orders assigned to you" />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
        }))}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : jobs.length === 0 ? (
        <Empty
          description={activeTab === 'all' ? 'No jobs assigned to you' : `No ${formatStatus(activeTab)} jobs`}
          style={{ padding: '60px 0' }}
        />
      ) : (
        <div>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onView={(id) => navigate(`/work-orders/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
