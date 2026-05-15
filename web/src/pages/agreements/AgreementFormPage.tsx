import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, DatePicker, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import {
  useServiceAgreement,
  useCreateServiceAgreement,
  useUpdateServiceAgreement,
} from '@/hooks/use-service-agreements';
import { useAllContacts } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function AgreementFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: agreement, isLoading } = useServiceAgreement(id!);
  const createAgreement = useCreateServiceAgreement();
  const updateAgreement = useUpdateServiceAgreement();
  const { data: contacts } = useAllContacts();

  useEffect(() => {
    if (agreement) {
      form.setFieldsValue({
        name: agreement.name,
        type: agreement.type,
        contact_id: agreement.contact_id,
        start_date: agreement.start_date ? dayjs(agreement.start_date) : null,
        end_date: agreement.end_date ? dayjs(agreement.end_date) : null,
        value: agreement.value,
        sla_response_hours: agreement.sla_response_hours,
        sla_resolution_hours: agreement.sla_resolution_hours,
        description: agreement.description,
      });
    }
  }, [agreement, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      start_date: values.start_date ? (values.start_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      end_date: values.end_date ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };

    try {
      if (isEdit) {
        await updateAgreement.mutateAsync({ id: id!, ...payload });
      } else {
        await createAgreement.mutateAsync(payload as Record<string, unknown> & { name: string; contact_id: string; type: string; start_date: string; end_date: string; value: number });
      }
      navigate('/agreements');
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
        title={isEdit ? 'Edit Agreement' : 'Create Agreement'}
        onBack={() => navigate('/agreements')}
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" style={{ maxWidth: 800 }}>
          <Form.Item name="name" label="Agreement Name" rules={[{ required: true, message: 'Please enter agreement name' }]}>
            <Input placeholder="Annual Maintenance Agreement" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Please select type' }]} style={{ flex: 1 }}>
              <Select placeholder="Select type">
                <Select.Option value="maintenance">Maintenance</Select.Option>
                <Select.Option value="warranty">Warranty</Select.Option>
                <Select.Option value="support">Support</Select.Option>
                <Select.Option value="subscription">Subscription</Select.Option>
                <Select.Option value="custom">Custom</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="contact_id" label="Contact" rules={[{ required: true, message: 'Please select contact' }]} style={{ flex: 1 }}>
              <Select
                placeholder="Select contact"
                allowClear
                showSearch
                optionFilterProp="label"
                options={contacts?.map((c: { id: string; first_name: string; last_name: string; email?: string }) => ({
                  value: c.id,
                  label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}`,
                })) || []}
              />
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Please select start date' }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="end_date" label="End Date" rules={[{ required: true, message: 'Please select end date' }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="value" label="Value ($)" rules={[{ required: true, message: 'Please enter value' }]}>
            <InputNumber min={0} step={0.01} prefix="$" style={{ width: 300 }} placeholder="5000.00" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="sla_response_hours" label="SLA Response Hours" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="4" />
            </Form.Item>
            <Form.Item name="sla_resolution_hours" label="SLA Resolution Hours" style={{ flex: 1 }}>
              <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="24" />
            </Form.Item>
          </Space>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Agreement details and terms" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createAgreement.isPending || updateAgreement.isPending}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/agreements')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
