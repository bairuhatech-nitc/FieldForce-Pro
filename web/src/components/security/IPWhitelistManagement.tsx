import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  Typography,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format-date';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import type { IPWhitelistEntry } from '@/api/ip-whitelist.api';
import {
  useIPWhitelist,
  useIPWhitelistConfig,
  useMyIP,
  useCreateIPWhitelist,
  useUpdateIPWhitelist,
  useDeleteIPWhitelist,
  useToggleIPWhitelist,
} from '@/hooks/use-ip-whitelist';

const { TextArea } = Input;
const { Text } = Typography;

export default function IPWhitelistManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IPWhitelistEntry | null>(null);
  const [form] = Form.useForm();

  const { data: ipEntries = [], isLoading: isLoadingEntries } = useIPWhitelist();
  const { data: config, isLoading: isLoadingConfig } = useIPWhitelistConfig();
  const createMutation = useCreateIPWhitelist();
  const updateMutation = useUpdateIPWhitelist();
  const deleteMutation = useDeleteIPWhitelist();
  const toggleMutation = useToggleIPWhitelist();
  const { data: myIP } = useMyIP();

  const whitelistEnabled = config?.enabled ?? false;

  const handleCreate = () => {
    setEditingEntry(null);
    form.resetFields();
    if (myIP) {
      form.setFieldsValue({ ip_address: myIP });
    }
    setIsModalOpen(true);
  };

  const handleEdit = (entry: IPWhitelistEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      ip_address: entry.ip_address,
      description: entry.description,
      is_active: entry.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (entry: IPWhitelistEntry) => {
    showConfirmDialog({
      title: 'Remove IP from Whitelist',
      content: `Are you sure you want to remove ${entry.ip_address} from the whitelist?`,
      onOk: async () => {
        await deleteMutation.mutateAsync(entry.id).catch(() => {});
      },
      danger: true,
    });
  };

  const handleSubmit = async (values: { ip_address: string; description?: string; is_active?: boolean }) => {
    try {
      if (editingEntry) {
        await updateMutation.mutateAsync({ id: editingEntry.id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch {
      // error toast handled by hook onError
    }
  };

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  const validateIP = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject(new Error('IP address is required'));
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(value)) {
      return Promise.reject(new Error('Invalid IP address or CIDR notation'));
    }

    const [ip] = value.split('/');
    const octets = ip.split('.');
    const validOctets = octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });

    if (!validOctets) {
      return Promise.reject(new Error('Invalid IP address'));
    }

    return Promise.resolve();
  };

  const columns: ColumnsType<IPWhitelistEntry> = [
    {
      title: 'IP Address / Range',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip: string) => (
        <Space>
          <GlobalOutlined />
          <Text code strong>
            {ip}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'} icon={active ? <CheckCircleOutlined /> : undefined}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Added',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Global Enable/Disable */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>Enable IP Whitelisting</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                When enabled, only requests from whitelisted IPs will be allowed
              </Text>
            </div>
          </div>
          <Switch
            checked={whitelistEnabled}
            onChange={handleToggle}
            loading={isLoadingConfig || toggleMutation.isPending}
            checkedChildren="Enabled"
            unCheckedChildren="Disabled"
          />
        </div>

        {whitelistEnabled && (
          <Alert
            message="IP Whitelisting is Active"
            description="Only IP addresses in the whitelist below can access the system."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      <Card
        title="Whitelisted IP Addresses"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add IP Address
          </Button>
        }
      >
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>You can use CIDR notation for IP ranges (e.g., 192.168.1.0/24)</span>
            </Space>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={ipEntries}
          rowKey="id"
          loading={isLoadingEntries}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingEntry ? 'Edit IP Whitelist Entry' : 'Add IP to Whitelist'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="ip_address"
            label="IP Address or CIDR Range"
            rules={[
              { required: true },
              { validator: validateIP },
            ]}
          >
            <Input
              placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
              prefix={<GlobalOutlined />}
            />
          </Form.Item>

          <Alert
            message="CIDR Notation Examples"
            description={
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>Single IP: 192.168.1.1</li>
                <li>Class C network: 192.168.1.0/24 (256 addresses)</li>
                <li>Class B network: 172.16.0.0/16 (65,536 addresses)</li>
              </ul>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item name="description" label="Description">
            <TextArea
              rows={3}
              placeholder="e.g., Office network, VPN connection, Remote worker..."
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
