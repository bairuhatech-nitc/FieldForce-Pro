import { useState } from 'react';
import { Card, Table, Typography, Space, Tag, Button, Popconfirm, Modal, Form, Input, InputNumber } from 'antd';
import { DeleteOutlined, SyncOutlined, PlusOutlined, CopyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/common/PageHeader';
import { 
  useSuperAdminApiKeys, 
  useCreateSuperAdminApiKey, 
  useRevokeSuperAdminApiKey,
  useRegenerateSuperAdminApiKey
} from '@/hooks/use-super-admin-api-keys';
import { formatDateTime } from '@/utils/format-date';
import { SuperAdminApiKey } from '@/api/super-admin-api-keys.api';

const { Text, Paragraph } = Typography;

export default function ApiKeysPage() {
  const { data: keys, isLoading } = useSuperAdminApiKeys();
  const createMutation = useCreateSuperAdminApiKey();
  const revokeMutation = useRevokeSuperAdminApiKey();
  const regenerateMutation = useRegenerateSuperAdminApiKey();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleCreate = async (values: any) => {
    try {
      const res = await createMutation.mutateAsync(values);
      if (res.api_key) {
        setGeneratedKey(res.api_key);
      }
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setGeneratedKey(null);
    form.resetFields();
  };

  const columns: ColumnsType<SuperAdminApiKey> = [
    {
      title: 'Key Name',
      dataIndex: 'key_name',
      key: 'key_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Revoked'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date?: string) => date ? formatDateTime(date) : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Expires At',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date?: string) => date ? formatDateTime(date) : <Text type="secondary">Never</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.is_active && (
            <>
              <Popconfirm
                title="Regenerate Key"
                description="This will revoke the current key and generate a new one. Are you sure?"
                onConfirm={async () => {
                  const res = await regenerateMutation.mutateAsync({ id: record.id, key_name: record.key_name });
                  if (res.api_key) {
                    setGeneratedKey(res.api_key);
                    setIsModalVisible(true);
                  }
                }}
              >
                <Button type="text" icon={<SyncOutlined />} />
              </Popconfirm>
              <Popconfirm
                title="Revoke Key"
                description="Are you sure you want to revoke this key?"
                onConfirm={() => revokeMutation.mutate(record.id)}
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Super Admin API Keys"
        subtitle="Manage keys for programmatic access to super admin APIs"
        extra={[
          <Button 
            key="create" 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
          >
            Generate New Key
          </Button>
        ]}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={keys || []}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      <Modal
        title={generatedKey ? "API Key Generated" : "Generate API Key"}
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={generatedKey ? [
          <Button key="close" type="primary" onClick={handleModalClose}>
            Done
          </Button>
        ] : undefined}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        {generatedKey ? (
          <div>
            <Paragraph type="warning" strong>
              Please copy this key now. You will not be able to see it again!
            </Paragraph>
            <div style={{ padding: '16px', background: 'rgba(128, 128, 128, 0.1)', borderRadius: '4px', marginBottom: '16px' }}>
              <Text copyable style={{ fontSize: '16px', fontFamily: 'monospace' }}>{generatedKey}</Text>
            </div>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item 
              name="key_name" 
              label="Key Name" 
              rules={[{ required: true, message: 'Please provide a name for this key' }]}
            >
              <Input placeholder="e.g. CI/CD Script" />
            </Form.Item>
            <Form.Item 
              name="expires_in_days" 
              label="Expires In (Days)"
            >
              <InputNumber placeholder="Leave blank for no expiration" min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
