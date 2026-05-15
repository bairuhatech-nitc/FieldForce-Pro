import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWebforms, useDeleteWebform, useUpdateWebform } from '@/hooks/use-webforms';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';
import { formatDateTime } from '@/utils/format-date';

interface WebformRecord {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export default function WebformListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWebforms({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });
  const deleteWebform = useDeleteWebform();
  const updateWebform = useUpdateWebform();

  const webforms = (data?.data || []) as WebformRecord[];
  const meta = data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (record: WebformRecord) => {
    showConfirmDialog({
      title: 'Delete Webform',
      content: `Are you sure you want to delete "${record.name}"?`,
      onOk: async () => {
        await deleteWebform.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const handleToggleActive = async (record: WebformRecord, checked: boolean) => {
    await updateWebform.mutateAsync({ id: record.id, is_active: checked });
  };

  const columns: ColumnsType<WebformRecord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Submissions',
      dataIndex: 'submission_count',
      key: 'submission_count',
      render: (count: number) => count || 0,
      sorter: (a, b) => (a.submission_count || 0) - (b.submission_count || 0),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="webforms:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/webforms/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="webforms:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/webforms/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="webforms:read">
            <Tooltip title="Embed Code">
              <Button type="text" icon={<CodeOutlined />} size="small" onClick={() => navigate(`/webforms/${record.id}/embed`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="webforms:delete">
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)} />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Webforms"
        subtitle="Create and manage customer-facing web forms"
        extra={
          <PermissionGuard permission="webforms:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/webforms/new')}>
              Create Webform
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search webforms..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={webforms}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} webforms`,
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
