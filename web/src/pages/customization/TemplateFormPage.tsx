import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, Switch } from 'antd';
import { useTemplate, useCreateTemplate, useUpdateTemplate } from '@/hooks/use-templates';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

const TEMPLATE_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'email', label: 'Email' },
  { value: 'report', label: 'Report' },
  { value: 'job_sheet', label: 'Job Sheet' },
  { value: 'work_order', label: 'Work Order' },
  { value: 'contract', label: 'Contract' },
];

export default function TemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: template, isLoading } = useTemplate(id!);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        type: template.type,
        name: template.name,
        content: template.content,
        is_default: template.is_default,
      });
    }
  }, [template, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({ id: id!, ...values });
      } else {
        await createTemplate.mutateAsync(values as never);
      }
      navigate('/customization/templates');
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
        title={isEdit ? 'Edit Template' : 'Create Template'}
        onBack={() => navigate('/customization/templates')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_default: false }}
        >
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item
              name="type"
              label="Type"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please select a type' }]}
            >
              <Select
                placeholder="Select type"
                options={TEMPLATE_TYPES}
              />
            </Form.Item>
            <Form.Item
              name="name"
              label="Name"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="e.g. Standard Invoice Template" />
            </Form.Item>
          </Space>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please enter template content' }]}
            extra="Use template variables like {{work_order.summary}}, {{contact.name}}, etc."
          >
            <TextArea
              rows={12}
              placeholder="Enter your template content here..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item name="is_default" label="Default Template" valuePropName="checked">
            <Switch checkedChildren="Default" unCheckedChildren="Not Default" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createTemplate.isPending || updateTemplate.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/customization/templates')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
