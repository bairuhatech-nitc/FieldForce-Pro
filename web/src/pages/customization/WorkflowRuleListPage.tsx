import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWorkflowRules, useDeleteWorkflowRule, useUpdateWorkflowRule } from '@/hooks/use-workflow-rules';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';
import { formatDateTime } from '@/utils/format-date';

interface WorkflowRuleRecord {
  id: string;
  name: string;
  entity_type: string;
  trigger_event: string;
  conditions: unknown;
  actions: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function WorkflowRuleListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useWorkflowRules({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });
  const deleteWorkflowRule = useDeleteWorkflowRule();
  const updateWorkflowRule = useUpdateWorkflowRule();

  const rules = (data?.data || []) as WorkflowRuleRecord[];
  const meta = data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (record: WorkflowRuleRecord) => {
    showConfirmDialog({
      title: 'Delete Workflow Rule',
      content: `Are you sure you want to delete "${record.name}"?`,
      onOk: async () => {
        await deleteWorkflowRule.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const handleToggleActive = async (record: WorkflowRuleRecord, checked: boolean) => {
    await updateWorkflowRule.mutateAsync({ id: record.id, is_active: checked });
  };

  const columns: ColumnsType<WorkflowRuleRecord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Trigger Event',
      dataIndex: 'trigger_event',
      key: 'trigger_event',
      render: (event: string) => <Tag color="blue">{event}</Tag>,
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="workflow-rules:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/customization/workflow-rules/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="workflow-rules:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/customization/workflow-rules/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="workflow-rules:delete">
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
        title="Workflow Rules"
        subtitle="Event-triggered automation rules"
        extra={
          <PermissionGuard permission="workflow-rules:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customization/workflow-rules/new')}>
              Create Workflow Rule
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search workflow rules..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={rules}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} workflow rules`,
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
