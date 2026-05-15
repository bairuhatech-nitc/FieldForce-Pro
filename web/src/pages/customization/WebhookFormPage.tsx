import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Switch } from 'antd';
import { useWebhook, useCreateWebhook, useUpdateWebhook } from '@/hooks/use-webhooks';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function WebhookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: webhook, isLoading } = useWebhook(id!);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();

  useEffect(() => {
    if (webhook) {
      form.setFieldsValue({
        name: webhook.name,
        url: webhook.url,
        events: typeof webhook.events === 'string' ? webhook.events : JSON.stringify(webhook.events, null, 2),
        secret: webhook.secret,
        is_active: webhook.is_active,
      });
    }
  }, [webhook, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      events: values.events ? JSON.parse(values.events as string) : [],
    };

    try {
      if (isEdit) {
        await updateWebhook.mutateAsync({ id: id!, ...payload });
      } else {
        await createWebhook.mutateAsync(payload as never);
      }
      navigate('/customization/webhooks');
    } catch {
      // Error handled by mutation hooks
    }
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Webhook' : 'Create Webhook'}
        onBack={() => navigate('/customization/webhooks')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_active: true, events: '[]' }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g. Zapier Integration" />
          </Form.Item>

          <Form.Item
            name="url"
            label="Webhook URL"
            rules={[
              { required: true, message: 'Please enter webhook URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://hooks.zapier.com/hooks/catch/..." />
          </Form.Item>

          <Form.Item
            name="events"
            label="Events (JSON Array)"
            rules={[
              { required: true, message: 'Please enter events to subscribe to' },
              {
                validator: (_, value) => {
                  try {
                    if (value) {
                      const parsed = JSON.parse(value);
                      if (!Array.isArray(parsed)) {
                        return Promise.reject(new Error('Events must be an array'));
                      }
                    }
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                },
              },
            ]}
            extra="List of events to trigger this webhook"
          >
            <TextArea
              rows={6}
              placeholder='["work_order.created", "work_order.updated", "invoice.paid"]'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="secret"
            label="Secret Key"
            extra="Used to sign webhook payloads for verification"
          >
            <Input.Password placeholder="Enter secret key (optional)" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createWebhook.isPending || updateWebhook.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/customization/webhooks')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
