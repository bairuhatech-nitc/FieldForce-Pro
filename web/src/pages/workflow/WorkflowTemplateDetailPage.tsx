import { useNavigate, useParams } from 'react-router-dom';
import {
  Descriptions,
  Tag,
  Button,
  Card,
  Space,
  Steps,
  Skeleton,
  Typography,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import {
  useWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useActivateWorkflowTemplate,
  useDeactivateWorkflowTemplate,
} from '@/hooks/use-workflow';

const { Text } = Typography;

export default function WorkflowTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: template, isLoading } = useWorkflowTemplate(id || '');
  const deleteMutation = useDeleteWorkflowTemplate();
  const activateMutation = useActivateWorkflowTemplate();
  const deactivateMutation = useDeactivateWorkflowTemplate();

  const handleDelete = () => {
    showConfirmDialog({
      title: 'Delete Workflow Template',
      content: 'Are you sure you want to delete this workflow template? This action cannot be undone.',
      onOk: async () => {
        await deleteMutation.mutateAsync(id!);
        navigate('/workflow/templates');
      },
    });
  };

  if (isLoading) {
    return <div style={{ padding: 24 }}><Skeleton active /></div>;
  }

  if (!template) {
    return <div style={{ padding: 24 }}>Template not found</div>;
  }

  const sortedApprovers = [...(template.approvers || [])].sort((a, b) => a.order_no - b.order_no);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflow/templates')}>
            Back
          </Button>
          <h2 style={{ margin: 0 }}>{template.name}</h2>
          <Tag color={template.is_active ? 'green' : 'default'}>
            {template.is_active ? 'Active' : 'Inactive'}
          </Tag>
        </Space>

        <Space>
          <PermissionGuard permission="workflow_templates:update">
            <Button
              icon={template.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() =>
                template.is_active
                  ? deactivateMutation.mutate(id!)
                  : activateMutation.mutate(id!)
              }
            >
              {template.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/workflow/templates/${id}/edit`)}
            >
              Edit
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="workflow_templates:delete">
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Delete
            </Button>
          </PermissionGuard>
        </Space>
      </div>

      <Card title="Template Details" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Name">{template.name}</Descriptions.Item>
          <Descriptions.Item label="Version">v{template.version}</Descriptions.Item>
          <Descriptions.Item label="Document Type">
            <Tag color="blue">{template.document_type?.replace(/_/g, ' ') || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            <Tag color="green">{template.document_category || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {template.description || <Text type="secondary">No description</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{formatDateTime(template.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Updated">{formatDateTime(template.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={`Approval Steps (${sortedApprovers.length})`}>
        {sortedApprovers.length === 0 ? (
          <Text type="secondary">No approval steps configured</Text>
        ) : (
          <Steps
            direction="vertical"
            current={-1}
            items={sortedApprovers.map((approver) => ({
              title: (
                <Space>
                  <UserOutlined />
                  <span>
                    {approver.approver
                      ? `${approver.approver.first_name} ${approver.approver.last_name}`
                      : approver.approver_id}
                  </span>
                  {approver.is_required && <Tag color="red">Required</Tag>}
                  {approver.approval_authority && (
                    <Tag color="blue">Authority: {approver.approval_authority}</Tag>
                  )}
                </Space>
              ),
              description: (
                <div style={{ marginTop: 4 }}>
                  <Space wrap>
                    {approver.approver?.email && (
                      <Text type="secondary">{approver.approver.email}</Text>
                    )}
                    {approver.amount_threshold_min != null && (
                      <Tag>Min: ${approver.amount_threshold_min}</Tag>
                    )}
                    {approver.amount_threshold_max != null && (
                      <Tag>Max: ${approver.amount_threshold_max}</Tag>
                    )}
                    {approver.budget_threshold != null && (
                      <Tag>Budget: ${approver.budget_threshold}</Tag>
                    )}
                    {approver.notes && <Text type="secondary">Note: {approver.notes}</Text>}
                  </Space>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
