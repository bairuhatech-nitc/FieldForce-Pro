import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, InputNumber, Select, Switch } from 'antd';
import { usePartsCatalogItem, useCreatePartsCatalog, useUpdatePartsCatalog } from '@/hooks/use-parts-catalog';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: part, isLoading } = usePartsCatalogItem(id!);
  const createPart = useCreatePartsCatalog();
  const updatePart = useUpdatePartsCatalog();

  useEffect(() => {
    if (part) {
      form.setFieldsValue({
        name: part.name,
        sku: part.sku,
        description: part.description,
        unit_price: part.unit_price,
        stock_qty: part.stock_qty,
        reorder_level: part.reorder_level,
        supplier: part.supplier,
        category: part.category,
        is_active: part.is_active,
      });
    }
  }, [part, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEdit) {
        await updatePart.mutateAsync({ id: id!, ...values });
      } else {
        await createPart.mutateAsync(values as Record<string, unknown> & { name: string });
      }
      navigate('/catalog/parts');
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
        title={isEdit ? 'Edit Part' : 'Create Part'}
        onBack={() => navigate('/catalog/parts')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ is_active: true, stock_qty: 0, reorder_level: 0 }}
        >
          <Form.Item
            name="name"
            label="Part Name"
            rules={[{ required: true, message: 'Please enter part name' }]}
          >
            <Input placeholder="e.g. Compressor Motor" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="sku" label="SKU" style={{ flex: 1 }}>
              <Input placeholder="e.g. COMP-MOT-001" />
            </Form.Item>
            <Form.Item name="category" label="Category" style={{ flex: 1 }}>
              <Select placeholder="Select category" allowClear>
                <Select.Option value="Electrical">Electrical</Select.Option>
                <Select.Option value="Mechanical">Mechanical</Select.Option>
                <Select.Option value="Plumbing">Plumbing</Select.Option>
                <Select.Option value="HVAC">HVAC</Select.Option>
                <Select.Option value="Filters">Filters</Select.Option>
                <Select.Option value="Hardware">Hardware</Select.Option>
                <Select.Option value="Safety">Safety</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Describe the part" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="unit_price" label="Unit Price" style={{ flex: 1 }}>
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                prefix="$"
                placeholder="0.00"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="supplier" label="Supplier" style={{ flex: 1 }}>
              <Input placeholder="e.g. ACME Parts Co." />
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="stock_qty" label="Stock Quantity" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="reorder_level" label="Reorder Level" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} placeholder="0" style={{ width: '100%' }} />
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
                loading={createPart.isPending || updatePart.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/catalog/parts')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
