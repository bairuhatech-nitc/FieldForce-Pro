import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Space,
  Tabs,
  Alert,
  Divider,
  Select,
  Tag,
  Typography,
} from 'antd';
import {
  CreditCardOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ApiOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useNotificationStore } from '@/store/notification.store';

const { TextArea } = Input;
const { Text } = Typography;

interface GatewayConfig {
  enabled: boolean;
  test_mode: boolean;
  api_key: string;
  api_secret: string;
  webhook_secret?: string;
  currency: string;
  auto_capture: boolean;
}

export default function PaymentGatewaySettingsPage() {
  const [stripeForm] = Form.useForm();
  const [squareForm] = Form.useForm();
  const [paypalForm] = Form.useForm();
  const [authorizeForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const addNotification = useNotificationStore((s) => s.add);

  // Mock data - replace with actual API calls
  const [stripeConfig, setStripeConfig] = useState<GatewayConfig>({
    enabled: true,
    test_mode: true,
    api_key: 'pk_test_*********************',
    api_secret: 'sk_test_*********************',
    webhook_secret: 'whsec_*********************',
    currency: 'USD',
    auto_capture: true,
  });

  const handleSaveStripe = async (values: any) => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStripeConfig(values);
      addNotification({ type: 'success', message: 'Stripe settings saved successfully' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSquare = async (values: any) => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addNotification({ type: 'success', message: 'Square settings saved successfully' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayPal = async (values: any) => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addNotification({ type: 'success', message: 'PayPal settings saved successfully' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuthorize = async (values: any) => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addNotification({ type: 'success', message: 'Authorize.Net settings saved successfully' });
    } finally {
      setSaving(false);
    }
  };

  const StripeSettings = () => (
    <Form
      form={stripeForm}
      layout="vertical"
      onFinish={handleSaveStripe}
      initialValues={stripeConfig}
    >
      <Alert
        message={
          <Space>
            {stripeConfig.enabled ? (
              <>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Stripe is enabled and configured</span>
              </>
            ) : (
              <>
                <WarningOutlined style={{ color: '#faad14' }} />
                <span>Stripe is disabled</span>
              </>
            )}
          </Space>
        }
        type={stripeConfig.enabled ? 'success' : 'warning'}
        showIcon={false}
        style={{ marginBottom: 24 }}
      />

      <Form.Item name="enabled" label="Enable Stripe" valuePropName="checked">
        <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
      </Form.Item>

      <Form.Item name="test_mode" label="Test Mode" valuePropName="checked">
        <Switch checkedChildren="Test" unCheckedChildren="Live" />
      </Form.Item>

      <Divider />

      <Form.Item
        name="api_key"
        label="Publishable Key"
        rules={[{ required: true, message: 'API key is required' }]}
      >
        <Input.Password placeholder="pk_test_..." />
      </Form.Item>

      <Form.Item
        name="api_secret"
        label="Secret Key"
        rules={[{ required: true, message: 'Secret key is required' }]}
      >
        <Input.Password placeholder="sk_test_..." />
      </Form.Item>

      <Form.Item name="webhook_secret" label="Webhook Secret">
        <Input.Password placeholder="whsec_..." />
      </Form.Item>

      <Divider />

      <Form.Item name="currency" label="Default Currency">
        <Select>
          <Select.Option value="USD">USD - US Dollar</Select.Option>
          <Select.Option value="EUR">EUR - Euro</Select.Option>
          <Select.Option value="GBP">GBP - British Pound</Select.Option>
          <Select.Option value="CAD">CAD - Canadian Dollar</Select.Option>
          <Select.Option value="AUD">AUD - Australian Dollar</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="auto_capture" label="Auto Capture" valuePropName="checked">
        <Switch
          checkedChildren="Auto Capture"
          unCheckedChildren="Manual Capture"
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Stripe Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const SquareSettings = () => (
    <Form form={squareForm} layout="vertical" onFinish={handleSaveSquare}>
      <Alert
        message="Square Integration"
        description="Configure your Square payment gateway settings"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item name="enabled" label="Enable Square" valuePropName="checked">
        <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
      </Form.Item>

      <Form.Item name="test_mode" label="Sandbox Mode" valuePropName="checked">
        <Switch checkedChildren="Sandbox" unCheckedChildren="Production" />
      </Form.Item>

      <Form.Item name="application_id" label="Application ID">
        <Input.Password placeholder="sq0idp-..." />
      </Form.Item>

      <Form.Item name="access_token" label="Access Token">
        <Input.Password placeholder="Enter your Square access token" />
      </Form.Item>

      <Form.Item name="location_id" label="Location ID">
        <Input placeholder="Enter your Square location ID" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Square Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const PayPalSettings = () => (
    <Form form={paypalForm} layout="vertical" onFinish={handleSavePayPal}>
      <Alert
        message="PayPal Integration"
        description="Configure your PayPal payment gateway settings"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item name="enabled" label="Enable PayPal" valuePropName="checked">
        <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
      </Form.Item>

      <Form.Item name="test_mode" label="Sandbox Mode" valuePropName="checked">
        <Switch checkedChildren="Sandbox" unCheckedChildren="Live" />
      </Form.Item>

      <Form.Item name="client_id" label="Client ID">
        <Input.Password placeholder="Enter your PayPal client ID" />
      </Form.Item>

      <Form.Item name="client_secret" label="Client Secret">
        <Input.Password placeholder="Enter your PayPal client secret" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save PayPal Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const AuthorizeNetSettings = () => (
    <Form form={authorizeForm} layout="vertical" onFinish={handleSaveAuthorize}>
      <Alert
        message="Authorize.Net Integration"
        description="Configure your Authorize.Net payment gateway settings"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form.Item name="enabled" label="Enable Authorize.Net" valuePropName="checked">
        <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
      </Form.Item>

      <Form.Item name="test_mode" label="Sandbox Mode" valuePropName="checked">
        <Switch checkedChildren="Sandbox" unCheckedChildren="Production" />
      </Form.Item>

      <Form.Item name="api_login_id" label="API Login ID">
        <Input placeholder="Enter your API Login ID" />
      </Form.Item>

      <Form.Item name="transaction_key" label="Transaction Key">
        <Input.Password placeholder="Enter your transaction key" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Authorize.Net Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    {
      key: 'stripe',
      label: (
        <Space>
          <CreditCardOutlined />
          Stripe
          {stripeConfig.enabled && <Tag color="success">Active</Tag>}
        </Space>
      ),
      children: <StripeSettings />,
    },
    {
      key: 'square',
      label: (
        <Space>
          <ApiOutlined />
          Square
        </Space>
      ),
      children: <SquareSettings />,
    },
    {
      key: 'paypal',
      label: (
        <Space>
          <DollarOutlined />
          PayPal
        </Space>
      ),
      children: <PayPalSettings />,
    },
    {
      key: 'authorize',
      label: (
        <Space>
          <CreditCardOutlined />
          Authorize.Net
        </Space>
      ),
      children: <AuthorizeNetSettings />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payment Gateway Settings"
        subtitle="Configure payment processors and gateways"
      />

      <Alert
        message="Security Notice"
        description="All API keys and secrets are encrypted and stored securely. Never share your production keys."
        type="warning"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      <Card>
        <Tabs items={tabItems} defaultActiveKey="stripe" />
      </Card>
    </div>
  );
}