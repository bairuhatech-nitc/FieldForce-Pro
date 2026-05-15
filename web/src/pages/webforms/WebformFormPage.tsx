import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Switch } from 'antd';
import { useWebform, useCreateWebform, useUpdateWebform } from '@/hooks/use-webforms';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function WebformFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: webform, isLoading } = useWebform(id!);
  const createWebform = useCreateWebform();
  const updateWebform = useUpdateWebform();

  useEffect(() => {
    if (webform) {
      form.setFieldsValue({
        name: webform.name,
        fields: typeof webform.fields === 'string' ? webform.fields : JSON.stringify(webform.fields, null, 2),
        styling: typeof webform.styling === 'string' ? webform.styling : JSON.stringify(webform.styling, null, 2),
        redirect_url: webform.redirect_url,
        is_active: webform.is_active,
      });
    }
  }, [webform, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      fields: values.fields ? JSON.parse(values.fields as string) : {},
      styling: values.styling ? JSON.parse(values.styling as string) : {},
    };

    try {
      if (isEdit) {
        await updateWebform.mutateAsync({ id: id!, ...payload });
      } else {
        await createWebform.mutateAsync(payload as never);
      }
      navigate('/webforms');
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
        title={isEdit ? 'Edit Webform' : 'Create Webform'}
        onBack={() => navigate('/webforms')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_active: true, fields: '{}', styling: '{}' }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g. Contact Form" />
          </Form.Item>

          <Form.Item
            name="fields"
            label="Fields (JSON)"
            rules={[
              { required: true, message: 'Please enter fields configuration' },
              {
                validator: (_, value) => {
                  try {
                    if (value) JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                },
              },
            ]}
          >
            <TextArea
              rows={8}
              placeholder='{"email": {"type": "email", "required": true}, "message": {"type": "textarea", "required": true}}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="styling"
            label="Styling (JSON)"
            rules={[
              {
                validator: (_, value) => {
                  try {
                    if (value) JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                },
              },
            ]}
          >
            <TextArea
              rows={6}
              placeholder='{"theme": "light", "primaryColor": "#1890ff"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item name="redirect_url" label="Redirect URL">
            <Input placeholder="https://example.com/thank-you" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createWebform.isPending || updateWebform.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/webforms')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
