import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Select, Rate } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useReviews } from '@/hooks/use-reviews';
import PageHeader from '@/components/common/PageHeader';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import SearchFilter from '@/components/common/SearchFilter';

interface ReviewRecord {
  id: string;
  work_order_id: string;
  work_order?: { wo_number: string; summary: string };
  contact_id: string;
  contact?: { first_name: string; last_name: string };
  rating: number;
  comment: string;
  source: string;
  is_published: boolean;
  created_at: string;
}

const SOURCE_COLORS: Record<string, string> = {
  internal: 'blue',
  google: 'red',
  yelp: 'orange',
  facebook: 'cyan',
};

export default function ReviewListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useReviews({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });

  const reviews = ((data?.data || []) as ReviewRecord[]).filter((review) => {
    if (ratingFilter && review.rating !== ratingFilter) return false;
    if (sourceFilter && review.source !== sourceFilter) return false;
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

  const columns: ColumnsType<ReviewRecord> = [
    {
      title: 'Work Order',
      key: 'work_order',
      render: (_, record) =>
        record.work_order
          ? <span style={{ fontWeight: 500 }}>{record.work_order.wo_number}</span>
          : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Customer',
      key: 'contact',
      render: (_, record) =>
        record.contact
          ? `${record.contact.first_name} ${record.contact.last_name}`
          : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled value={rating} style={{ fontSize: 16 }} />,
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (comment: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {comment || <span style={{ color: '#999' }}>-</span>}
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={SOURCE_COLORS[source] || 'default'}>
          {source ? source.charAt(0).toUpperCase() + source.slice(1) : '-'}
        </Tag>
      ),
    },
    {
      title: 'Published',
      dataIndex: 'is_published',
      key: 'is_published',
      render: (published: boolean) => (
        <Tag color={published ? 'green' : 'default'}>
          {published ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="reviews:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/reviews/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reviews & Feedback"
        subtitle="Customer reviews and satisfaction ratings"
        extra={
          <PermissionGuard permission="reviews:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/reviews/new')}>
              Add Review
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <SearchFilter
          placeholder="Search reviews..."
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
        <Select
          placeholder="Filter by rating"
          allowClear
          value={ratingFilter}
          onChange={(value) => { setRatingFilter(value); setPage(1); }}
          style={{ width: 150 }}
          options={[
            { value: 5, label: '5 Stars' },
            { value: 4, label: '4 Stars' },
            { value: 3, label: '3 Stars' },
            { value: 2, label: '2 Stars' },
            { value: 1, label: '1 Star' },
          ]}
        />
        <Select
          placeholder="Filter by source"
          allowClear
          value={sourceFilter}
          onChange={(value) => { setSourceFilter(value); setPage(1); }}
          style={{ width: 150 }}
          options={[
            { value: 'internal', label: 'Internal' },
            { value: 'google', label: 'Google' },
            { value: 'yelp', label: 'Yelp' },
            { value: 'facebook', label: 'Facebook' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={reviews}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} reviews`,
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
