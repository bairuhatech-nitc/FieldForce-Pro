import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEstimate, useCreateEstimate, useUpdateEstimate } from '@/hooks/use-estimates';
import { useAllContacts } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function EstimateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: estimate, isLoading } = useEstimate(id!);
  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const { data: contacts } = useAllContacts();

  useEffect(() => {
    if (estimate) {
      form.setFieldsValue({
        contact_id: estimate.contact_id,
        notes: estimate.notes,
        expiry_date: estimate.expiry_date ? dayjs(estimate.expiry_date) : null,
        scheduled_start: estimate.scheduled_start ? dayjs(estimate.scheduled_start) : null,
      });
    }
  }, [estimate, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      expiry_date: values.expiry_date
        ? (values.expiry_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : undefined,
      scheduled_start: values.scheduled_start
        ? (values.scheduled_start as dayjs.Dayjs).toISOString()
        : undefined,
    };

    try {
      if (isEdit) {
        await updateEstimate.mutateAsync({ id: id!, ...payload });
      } else {
        await createEstimate.mutateAsync(payload);
      }
      navigate('/estimates');
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
        title={isEdit ? 'Edit Estimate' : 'Create Estimate'}
        onBack={() => navigate('/estimates')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
        >
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

          <Form.Item name="expiry_date" label="Expiry Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="scheduled_start" label="Scheduled Date">
            <DatePicker
              format="YYYY-MM-DD"
              placeholder="Select scheduled date"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={4} placeholder="Additional notes for this estimate" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createEstimate.isPending || updateEstimate.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/estimates')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
