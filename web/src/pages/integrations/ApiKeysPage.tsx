import { useState } from 'react';
import {
  Button,
  Table,
  Space,
  Tag,
  Tooltip,
  Modal,
  Form,
  Input,
  Alert,
  Typography,
  DatePicker,
  Checkbox,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  StopOutlined,
  CopyOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from '@/hooks/use-api-keys';
import type { ApiKey, CreateApiKeyPayload } from '@/api/api-keys.api';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/utils/format-date';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const AVAILABLE_SCOPES = [
  'service_requests:read',
  'service_requests:write',
  'work_orders:read',
  'work_orders:write',
  'contacts:read',
  'contacts:write',
  'invoices:read',
  'invoices:write',
];

export default function ApiKeysPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useApiKeys({ page, take: pageSize });
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const deleteApiKey = useDeleteApiKey();

  const keys = (data?.data || []) as ApiKey[];
  const meta = data?.meta;

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateApiKeyPayload = {
        name: values.name,
        scopes: values.scopes ?? [],
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined,
      };
      const response = await createApiKey.mutateAsync(payload);
      const rawKey = (response.data.data as any)?.raw_key;
      setCreatedKey(rawKey ?? null);
      form.resetFields();
      setCreateOpen(false);
    } catch {
      // validation errors handled by form
    }
  };

  const handleRevoke = (record: ApiKey) => {
    showConfirmDialog({
      title: 'Revoke API Key',
      content: `Revoke "${record.name}"? Any integrations using this key will stop working immediately.`,
      onOk: async () => {
        await revokeApiKey.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const handleDelete = (record: ApiKey) => {
    showConfirmDialog({
      title: 'Delete API Key',
      content: `Permanently delete "${record.name}"? This cannot be undone.`,
      onOk: async () => {
        await deleteApiKey.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const columns: ColumnsType<ApiKey> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Key Prefix',
      dataIndex: 'key_prefix',
      key: 'key_prefix',
      render: (prefix: string) => (
        <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
          {prefix}…
        </code>
      ),
    },
    {
      title: 'Scopes',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: string[]) => (
        <Space size="small" wrap>
          {scopes?.length
            ? scopes.slice(0, 3).map((s) => <Tag key={s} color="blue">{s}</Tag>)
            : <Tag color="default">No scopes</Tag>}
          {scopes?.length > 3 && <Tag>+{scopes.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) =>
        isActive
          ? <Tag color="green">Active</Tag>
          : <Tag color="red">Revoked</Tag>,
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string | null) =>
        date ? formatDateTime(date) : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string | null) =>
        date ? formatDateTime(date) : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          {record.is_active && (
            <Tooltip title="Revoke">
              <Button
                type="text"
                icon={<StopOutlined />}
                size="small"
                onClick={() => handleRevoke(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Manage API keys for external integrations and inbound service requests"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Create API Key
          </Button>
        }
      />

      <Table
        columns={columns}
        dataSource={keys}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} API keys`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1);
            }
          },
        }}
      />

      {/* Create API Key Modal */}
      <Modal
        title={<Space><KeyOutlined /> Create API Key</Space>}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        confirmLoading={createApiKey.isPending}
        okText="Create"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Key Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g. Production Integration, CRM Sync" />
          </Form.Item>
          <Form.Item name="scopes" label="Scopes">
            <Checkbox.Group options={AVAILABLE_SCOPES} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
          </Form.Item>
          <Form.Item name="expires_at" label="Expiry Date (optional)">
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(d) => d && d < dayjs().startOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reveal Raw Key Modal — shown once after creation */}
      <Modal
        title="Save Your API Key"
        open={!!createdKey}
        onOk={() => setCreatedKey(null)}
        onCancel={() => setCreatedKey(null)}
        okText="I've saved it"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Alert
          type="warning"
          message="This key will only be shown once. Copy and store it securely."
          style={{ marginBottom: 16 }}
        />
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 6,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Paragraph
            code
            copyable={false}
            style={{ margin: 0, wordBreak: 'break-all', flex: 1 }}
          >
            {createdKey}
          </Paragraph>
          <Tooltip title="Copy">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => copyToClipboard(createdKey!)}
            />
          </Tooltip>
        </div>
      </Modal>
    </div>
  );
}
