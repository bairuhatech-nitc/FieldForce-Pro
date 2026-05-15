import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, InputNumber, Switch } from 'antd';
import { usePricebookItem, useCreatePricebookItem, useUpdatePricebookItem } from '@/hooks/use-pricebook';
import { useAllServicesCatalog } from '@/hooks/use-services-catalog';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function PricebookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: pricebookItem, isLoading } = usePricebookItem(id!);
  const createPricebookItem = useCreatePricebookItem();
  const updatePricebookItem = useUpdatePricebookItem();
  const { data: services } = useAllServicesCatalog();

  useEffect(() => {
    if (pricebookItem) {
      form.setFieldsValue({
        service_id: pricebookItem.service_id,
        name: pricebookItem.name,
        tier: pricebookItem.tier,
        price: pricebookItem.price,
        description: pricebookItem.description,
        is_active: pricebookItem.is_active,
      });
    }
  }, [pricebookItem, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEdit) {
        await updatePricebookItem.mutateAsync({ id: id!, ...values });
      } else {
        await createPricebookItem.mutateAsync(values as never);
      }
      navigate('/pricebook');
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
        title={isEdit ? 'Edit Pricebook Item' : 'Create Pricebook Item'}
        onBack={() => navigate('/pricebook')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ tier: 'good', is_active: true }}
        >
          <Form.Item
            name="service_id"
            label="Service"
            rules={[{ required: true, message: 'Please select a service' }]}
          >
            <Select
              placeholder="Select service"
              allowClear
              showSearch
              optionFilterProp="label"
              options={services?.map((s) => ({
                value: s.id,
                label: s.name,
              })) || []}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g. Premium HVAC Service" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item
              name="tier"
              label="Tier"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please select a tier' }]}
            >
              <Select placeholder="Select tier">
                <Select.Option value="good">Good</Select.Option>
                <Select.Option value="better">Better</Select.Option>
                <Select.Option value="best">Best</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="price"
              label="Price"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please enter the price' }]}
            >
              <InputNumber
                placeholder="0.00"
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                prefix="$"
              />
            </Form.Item>
          </Space>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Describe this pricebook item" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPricebookItem.isPending || updatePricebookItem.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/pricebook')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
