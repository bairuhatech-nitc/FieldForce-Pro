import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, InputNumber, Select, Switch } from 'antd';
import { useServiceCatalogItem, useCreateServiceCatalog, useUpdateServiceCatalog } from '@/hooks/use-services-catalog';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function ServiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: service, isLoading } = useServiceCatalogItem(id!);
  const createService = useCreateServiceCatalog();
  const updateService = useUpdateServiceCatalog();

  useEffect(() => {
    if (service) {
      form.setFieldsValue({
        name: service.name,
        description: service.description,
        default_price: service.default_price,
        tax_rate: service.tax_rate,
        duration_minutes: service.duration_minutes,
        category: service.category,
        is_active: service.is_active,
      });
    }
  }, [service, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEdit) {
        await updateService.mutateAsync({ id: id!, ...values });
      } else {
        await createService.mutateAsync(values as Record<string, unknown> & { name: string });
      }
      navigate('/catalog/services');
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
        title={isEdit ? 'Edit Service' : 'Create Service'}
        onBack={() => navigate('/catalog/services')}
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
            label="Service Name"
            rules={[{ required: true, message: 'Please enter service name' }]}
          >
            <Input placeholder="e.g. HVAC Installation" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Describe the service offering" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="default_price" label="Default Price" style={{ flex: 1 }}>
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                prefix="$"
                placeholder="0.00"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="tax_rate" label="Tax Rate (%)" style={{ flex: 1 }}>
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                precision={2}
                placeholder="0.00"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="duration_minutes" label="Duration (minutes)" style={{ flex: 1 }}>
              <InputNumber min={0} step={15} placeholder="60" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="category" label="Category" style={{ flex: 1 }}>
              <Select placeholder="Select category" allowClear>
                <Select.Option value="Installation">Installation</Select.Option>
                <Select.Option value="Repair">Repair</Select.Option>
                <Select.Option value="Maintenance">Maintenance</Select.Option>
                <Select.Option value="Inspection">Inspection</Select.Option>
                <Select.Option value="Consultation">Consultation</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createService.isPending || updateService.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/catalog/services')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
