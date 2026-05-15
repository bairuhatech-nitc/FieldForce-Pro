import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, InputNumber, Switch } from 'antd';
import { useCustomField, useCreateCustomField, useUpdateCustomField } from '@/hooks/use-custom-fields';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'time', label: 'Time' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'file', label: 'File Upload' },
];

const MODULES = [
  { value: 'work_orders', label: 'Work Orders' },
  { value: 'service_requests', label: 'Service Requests' },
  { value: 'estimates', label: 'Estimates' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'assets', label: 'Assets' },
  { value: 'service_agreements', label: 'Service Agreements' },
];

export default function CustomFieldFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: customField, isLoading } = useCustomField(id!);
  const createCustomField = useCreateCustomField();
  const updateCustomField = useUpdateCustomField();

  useEffect(() => {
    if (customField) {
      form.setFieldsValue({
        module: customField.module,
        field_name: customField.field_name,
        field_type: customField.field_type,
        options: typeof customField.options === 'string' ? customField.options : JSON.stringify(customField.options, null, 2),
        is_required: customField.is_required,
        sort_order: customField.sort_order,
      });
    }
  }, [customField, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      options: values.options ? JSON.parse(values.options as string) : null,
    };

    try {
      if (isEdit) {
        await updateCustomField.mutateAsync({ id: id!, ...payload });
      } else {
        await createCustomField.mutateAsync(payload as never);
      }
      navigate('/customization/custom-fields');
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
        title={isEdit ? 'Edit Custom Field' : 'Create Custom Field'}
        onBack={() => navigate('/customization/custom-fields')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_required: false, sort_order: 0 }}
        >
          <Form.Item
            name="module"
            label="Module"
            rules={[{ required: true, message: 'Please select a module' }]}
          >
            <Select
              placeholder="Select module"
              options={MODULES}
            />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item
              name="field_name"
              label="Field Name"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please enter field name' }]}
            >
              <Input placeholder="e.g. customer_priority" />
            </Form.Item>
            <Form.Item
              name="field_type"
              label="Field Type"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please select field type' }]}
            >
              <Select
                placeholder="Select type"
                options={FIELD_TYPES}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="options"
            label="Options (JSON - for select/multiselect fields)"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                },
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder='["Option 1", "Option 2", "Option 3"]'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="is_required" label="Required" valuePropName="checked" style={{ flex: 1 }}>
              <Switch checkedChildren="Required" unCheckedChildren="Optional" />
            </Form.Item>
            <Form.Item
              name="sort_order"
              label="Sort Order"
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </Space>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createCustomField.isPending || updateCustomField.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/customization/custom-fields')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
