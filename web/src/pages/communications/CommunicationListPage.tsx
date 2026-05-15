import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCommunications } from '@/hooks/use-communications';
import PageHeader from '@/components/common/PageHeader';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import SearchFilter from '@/components/common/SearchFilter';

interface CommunicationRecord {
  id: string;
  contact_id: string;
  contact?: { first_name: string; last_name: string };
  type: string;
  channel: string;
  subject: string;
  body: string;
  sent_at: string;
  status: string;
  created_at: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  email: 'blue',
  sms: 'green',
  whatsapp: 'cyan',
  push: 'purple',
  in_app: 'orange',
};

export default function CommunicationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useCommunications({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });

  const communications = ((data?.data || []) as CommunicationRecord[]).filter((comm) => {
    if (channelFilter && comm.channel !== channelFilter) return false;
    return true;
  });
  const meta = data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns: ColumnsType<CommunicationRecord> = [
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) =>
        record.contact
          ? `${record.contact.first_name} ${record.contact.last_name}`
          : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (channel: string) => (
        <Tag color={CHANNEL_COLORS[channel] || 'default'}>
          {channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : '-'}
        </Tag>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string) => <span style={{ fontWeight: 500 }}>{subject}</span>,
    },
    {
      title: 'Body',
      dataIndex: 'body',
      key: 'body',
      render: (body: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {body || <span style={{ color: '#999' }}>-</span>}
        </div>
      ),
    },
    {
      title: 'Sent At',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ color: '#999' }}>-</span>,
      sorter: (a, b) => {
        if (!a.sent_at) return -1;
        if (!b.sent_at) return 1;
        return new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="communications:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/communications/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Communications"
        subtitle="View communication history across all channels"
        extra={
          <PermissionGuard permission="communications:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/communications/new')}>
              New Communication
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <SearchFilter
          placeholder="Search communications..."
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
        <Select
          placeholder="Filter by channel"
          allowClear
          value={channelFilter}
          onChange={(value) => { setChannelFilter(value); setPage(1); }}
          style={{ width: 200 }}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'push', label: 'Push' },
            { value: 'in_app', label: 'In-App' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={communications}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} communications`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1);
            }
          },
        }}
      />
    </div>
  );
}
