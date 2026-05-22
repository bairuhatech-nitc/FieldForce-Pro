import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTemplates, useDeleteTemplate } from '@/hooks/use-templates';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';
import { formatDateTime } from '@/utils/format-date';

interface TemplateRecord {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  invoice: 'blue',
  estimate: 'cyan',
  email: 'green',
  report: 'purple',
};

export default function TemplateListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useTemplates({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });
  const deleteTemplate = useDeleteTemplate();

  const templates = ((data?.data || []) as TemplateRecord[]).filter((tpl) => {
    if (typeFilter && tpl.type !== typeFilter) return false;
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

  const handleDelete = (record: TemplateRecord) => {
    showConfirmDialog({
      title: 'Delete Template',
      content: `Are you sure you want to delete "${record.name}"?`,
      onOk: async () => {
        await deleteTemplate.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<TemplateRecord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] || 'default'}>
          {type ? type.charAt(0).toUpperCase() + type.slice(1) : '-'}
        </Tag>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string) => subject || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Default',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (isDefault: boolean) => (
        isDefault ? <Tag color="green">Default</Tag> : null
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="templates:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/customization/templates/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="templates:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/customization/templates/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="templates:delete">
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
        title="Templates"
        subtitle="Manage templates for invoices, estimates, emails, and reports"
        extra={
          <PermissionGuard permission="templates:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customization/templates/new')}>
              Create Template
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <SearchFilter
          placeholder="Search templates..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select
          placeholder="Filter by type"
          allowClear
          value={typeFilter}
          onChange={(value) => { setTypeFilter(value); setPage(1); }}
          style={{ width: 200 }}
          options={[
            { value: 'invoice', label: 'Invoice' },
            { value: 'estimate', label: 'Estimate' },
            { value: 'email', label: 'Email' },
            { value: 'report', label: 'Report' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} templates`,
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
