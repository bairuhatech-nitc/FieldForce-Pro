import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, Switch } from 'antd';
import { useJobSheetTemplate, useCreateJobSheetTemplate, useUpdateJobSheetTemplate } from '@/hooks/use-job-sheets';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function JobSheetTemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: template, isLoading } = useJobSheetTemplate(id!);
  const createTemplate = useCreateJobSheetTemplate();
  const updateTemplate = useUpdateJobSheetTemplate();

  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        is_active: template.is_active,
      });
    }
  }, [template, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
    };

    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({ id: id!, ...payload });
      } else {
        await createTemplate.mutateAsync(payload as Record<string, unknown> & { name: string });
      }
      navigate('/job-sheets/templates');
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
        title={isEdit ? 'Edit Job Sheet Template' : 'Create Job Sheet Template'}
        onBack={() => navigate('/job-sheets/templates')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a template name' }]}
          >
            <Input placeholder="e.g. HVAC Inspection Checklist" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Describe this template" />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Select placeholder="Select category" allowClear>
              <Select.Option value="Inspection">Inspection</Select.Option>
              <Select.Option value="Maintenance">Maintenance</Select.Option>
              <Select.Option value="Repair">Repair</Select.Option>
              <Select.Option value="Installation">Installation</Select.Option>
              <Select.Option value="Safety">Safety</Select.Option>
              <Select.Option value="General">General</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
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
              <Button onClick={() => navigate('/job-sheets/templates')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
