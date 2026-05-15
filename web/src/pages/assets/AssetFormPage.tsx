import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, DatePicker, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { useAsset, useCreateAsset, useUpdateAsset } from '@/hooks/use-assets';
import { useAllContacts } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function AssetFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: asset, isLoading } = useAsset(id!);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const { data: contacts } = useAllContacts();

  useEffect(() => {
    if (asset) {
      form.setFieldsValue({
        name: asset.name,
        model: asset.model,
        serial_number: asset.serial_number,
        manufacturer: asset.manufacturer,
        install_date: asset.install_date ? dayjs(asset.install_date) : null,
        warranty_expiry: asset.warranty_expiry ? dayjs(asset.warranty_expiry) : null,
        health_score: asset.health_score,
        category: asset.category,
        contact_id: asset.contact_id,
        location_id: asset.location_id,
        notes: asset.notes,
      });
    }
  }, [asset, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      install_date: values.install_date ? (values.install_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      warranty_expiry: values.warranty_expiry ? (values.warranty_expiry as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };

    try {
      if (isEdit) {
        await updateAsset.mutateAsync({ id: id!, ...payload });
      } else {
        await createAsset.mutateAsync(payload as Record<string, unknown> & { name: string });
      }
      navigate('/assets');
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
        title={isEdit ? 'Edit Asset' : 'Create Asset'}
        onBack={() => navigate('/assets')}
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" style={{ maxWidth: 800 }}>
          <Form.Item name="name" label="Asset Name" rules={[{ required: true, message: 'Please enter asset name' }]}>
            <Input placeholder="HVAC Unit - Carrier 24ACC636A003" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="manufacturer" label="Manufacturer" style={{ flex: 1 }}>
              <Input placeholder="Carrier" />
            </Form.Item>
            <Form.Item name="model" label="Model" style={{ flex: 1 }}>
              <Input placeholder="24ACC636A003" />
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="serial_number" label="Serial Number" style={{ flex: 1 }}>
              <Input placeholder="SN-2024-001234" />
            </Form.Item>
            <Form.Item name="category" label="Category" style={{ flex: 1 }}>
              <Select placeholder="Select category" allowClear>
                <Select.Option value="HVAC">HVAC</Select.Option>
                <Select.Option value="Plumbing">Plumbing</Select.Option>
                <Select.Option value="Electrical">Electrical</Select.Option>
                <Select.Option value="Appliance">Appliance</Select.Option>
                <Select.Option value="Security">Security</Select.Option>
                <Select.Option value="Fire Safety">Fire Safety</Select.Option>
                <Select.Option value="Elevator">Elevator</Select.Option>
                <Select.Option value="Generator">Generator</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="install_date" label="Install Date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="warranty_expiry" label="Warranty Expiry" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="health_score" label="Health Score (0-100)">
            <InputNumber min={0} max={100} step={0.1} placeholder="85.5" style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="contact_id" label="Customer (Contact)">
            <Select
              placeholder="Select customer"
              allowClear
              showSearch
              optionFilterProp="label"
              options={contacts?.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}`,
              })) || []}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={4} placeholder="Additional notes about this asset" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createAsset.isPending || updateAsset.isPending}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/assets')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
