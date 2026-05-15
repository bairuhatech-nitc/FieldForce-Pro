import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Tag, Space, Card, Tooltip } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import {
  useWorkflowTemplates,
  useDeleteWorkflowTemplate,
  useActivateWorkflowTemplate,
  useDeactivateWorkflowTemplate,
} from '@/hooks/use-workflow';
import type { WorkflowTemplate } from '@/types/workflow.types';

const categoryColors: Record<string, string> = {
  PROCUREMENT: 'blue',
  SERVICE: 'green',
  MAINTENANCE: 'orange',
  FINANCE: 'purple',
  VENDOR: 'gold',
  PROGRAM: 'geekblue',
  BUDGET: 'magenta',
  OTHER: 'default',
  OPERATIONS: 'cyan',
};

export default function WorkflowTemplateListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const { data, isLoading } = useWorkflowTemplates({
    page,
    take: pageSize,
    search: searchDebounced || undefined,
  });

  const deleteMutation = useDeleteWorkflowTemplate();
  const activateMutation = useActivateWorkflowTemplate();
  const deactivateMutation = useDeactivateWorkflowTemplate();

  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setSearchDebounced(value);
      setPage(1);
    }, 500);
  };

  const handleDelete = (id: string) => {
    showConfirmDialog({
      title: 'Delete Workflow Template',
      content: 'Are you sure you want to delete this workflow template?',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleToggleActive = (record: WorkflowTemplate) => {
    if (record.is_active) {
      deactivateMutation.mutate(record.id);
    } else {
      activateMutation.mutate(record.id);
    }
  };

  const columns: ColumnsType<WorkflowTemplate> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <a onClick={() => navigate(`/workflow/templates/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Document Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => (
        type ? <Tag color="blue">{type.replace(/_/g, ' ')}</Tag> : '-'
      ),
    },
    {
      title: 'Category',
      dataIndex: 'document_category',
      key: 'document_category',
      render: (cat: string) => (
        cat ? <Tag color={categoryColors[cat] || 'default'}>{cat}</Tag> : '-'
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center',
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Approvers',
      key: 'approvers',
      width: 100,
      align: 'center',
      render: (_: unknown, record) => record.approvers?.length || 0,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/workflow/templates/${record.id}`)}
            />
          </Tooltip>
          <PermissionGuard permission="workflow_templates:update">
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/workflow/templates/${record.id}/edit`)}
              />
            </Tooltip>
            <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
              <Button
                type="text"
                size="small"
                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => handleToggleActive(record)}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="workflow_templates:delete">
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Workflow Templates</h2>
        <PermissionGuard permission="workflow_templates:create">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/workflow/templates/new')}
          >
            New Template
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search templates..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ maxWidth: 400 }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.itemCount || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} templates`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
