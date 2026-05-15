import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Select, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCustomFields, useDeleteCustomField, useUpdateCustomField } from '@/hooks/use-custom-fields';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';

interface CustomFieldRecord {
  id: string;
  entity_type: string;
  field_name: string;
  field_type: string;
  label: string;
  is_required: boolean;
  is_active: boolean;
  options: unknown;
  created_at: string;
  updated_at: string;
}

export default function CustomFieldListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useCustomFields({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });
  const deleteCustomField = useDeleteCustomField();
  const updateCustomField = useUpdateCustomField();

  const customFields = ((data?.data || []) as CustomFieldRecord[]).filter((field) => {
    if (entityFilter && field.entity_type !== entityFilter) return false;
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

  const handleDelete = (record: CustomFieldRecord) => {
    showConfirmDialog({
      title: 'Delete Custom Field',
      content: `Are you sure you want to delete "${record.label}"?`,
      onOk: async () => {
        await deleteCustomField.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const handleToggleActive = async (record: CustomFieldRecord, checked: boolean) => {
    await updateCustomField.mutateAsync({ id: record.id, is_active: checked });
  };

  const columns: ColumnsType<CustomFieldRecord> = [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (label: string) => <span style={{ fontWeight: 500 }}>{label}</span>,
      sorter: (a, b) => a.label.localeCompare(b.label),
    },
    {
      title: 'Field Name',
      dataIndex: 'field_name',
      key: 'field_name',
      render: (name: string) => <code>{name}</code>,
    },
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Field Type',
      dataIndex: 'field_type',
      key: 'field_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Required',
      dataIndex: 'is_required',
      key: 'is_required',
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'}>
          {required ? 'Yes' : 'No'}
        </Tag>
      ),
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
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="custom-fields:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/customization/fields/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="custom-fields:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/customization/fields/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="custom-fields:delete">
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
        title="Custom Fields"
        subtitle="Define custom fields for any module"
        extra={
          <PermissionGuard permission="custom-fields:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customization/fields/new')}>
              Create Custom Field
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <SearchFilter
          placeholder="Search custom fields..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select
          placeholder="Filter by entity type"
          allowClear
          value={entityFilter}
          onChange={(value) => { setEntityFilter(value); setPage(1); }}
          style={{ width: 200 }}
          options={[
            { value: 'work_order', label: 'Work Order' },
            { value: 'contact', label: 'Contact' },
            { value: 'estimate', label: 'Estimate' },
            { value: 'invoice', label: 'Invoice' },
            { value: 'asset', label: 'Asset' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={customFields}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} custom fields`,
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
