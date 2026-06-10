import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Button, Space, Row, Col, DatePicker, Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import {
  useEquipment, useCreateEquipment, useUpdateEquipment, useEquipmentCategories,
} from '@/hooks/use-equipment';
import type { CreateEquipmentPayload } from '@/api/equipment.api';

type FormValues = {
  name: string;
  description?: string;
  equipment_category_id?: string;
  serial_number?: string;
  barcode?: string;
  manufacturer?: string;
  model_number?: string;
  purchase_date?: ReturnType<typeof dayjs>;
  notes?: string;
};

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form] = Form.useForm<FormValues>();
  const [seeded, setSeeded] = useState(false);

  const { data: existing, isLoading } = useEquipment(id ?? '');
  const { data: categories } = useEquipmentCategories();
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  if (isEdit && existing && !seeded) {
    form.setFieldsValue({
      name: existing.name,
      description: existing.description ?? undefined,
      equipment_category_id: existing.equipment_category_id ?? undefined,
      serial_number: existing.serial_number ?? undefined,
      barcode: existing.barcode ?? undefined,
      manufacturer: existing.manufacturer ?? undefined,
      model_number: existing.model_number ?? undefined,
      purchase_date: existing.purchase_date ? dayjs(existing.purchase_date) : undefined,
      notes: existing.notes ?? undefined,
    });
    setSeeded(true);
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateEquipmentPayload = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
      };
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...payload });
        navigate(`/workforce/equipment/${id}`);
      } else {
        await createMutation.mutateAsync(payload);
        navigate('/workforce/equipment');
      }
    } catch { /* validation */ }
  };

  if (isEdit && isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit: ${existing?.name ?? ''}` : 'Add Equipment'}
        extra={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(isEdit && id ? `/workforce/equipment/${id}` : '/workforce/equipment')}
            >
              Cancel
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={isMutating} onClick={handleSubmit}>
              {isEdit ? 'Save Changes' : 'Add Equipment'}
            </Button>
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Equipment Name"
            rules={[{ required: true, message: 'Name is required' }, { max: 150 }]}
          >
            <Input placeholder="e.g. Ford Transit Van #3" />
          </Form.Item>

          <Form.Item name="equipment_category_id" label="Category">
            <Select
              placeholder="Select category"
              allowClear
              options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="manufacturer" label="Manufacturer">
                <Input placeholder="e.g. Ford" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="model_number" label="Model">
                <Input placeholder="e.g. Transit 250" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="serial_number" label="Serial Number">
                <Input placeholder="Unique serial number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="barcode" label="Barcode / QR">
                <Input placeholder="Barcode value" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purchase_date" label="Purchase Date">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Form.Item name="notes" label="Internal Notes">
            <Input.TextArea rows={2} placeholder="Internal notes visible to managers only" />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
