import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { usePayment, useCreatePayment, useUpdatePayment } from '@/hooks/use-payments';
import { useAllInvoices } from '@/hooks/use-invoices';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function PaymentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: payment, isLoading } = usePayment(id!);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const { data: invoices } = useAllInvoices();

  useEffect(() => {
    if (payment) {
      form.setFieldsValue({
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        method: payment.method,
        gateway_transaction_id: payment.gateway_transaction_id,
        paid_at: payment.paid_at ? dayjs(payment.paid_at) : null,
        notes: payment.notes,
      });
    }
  }, [payment, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      paid_at: values.paid_at
        ? (values.paid_at as dayjs.Dayjs).toISOString()
        : undefined,
    };

    try {
      if (isEdit) {
        await updatePayment.mutateAsync({ id: id!, ...payload });
      } else {
        await createPayment.mutateAsync(payload as Record<string, unknown> & { invoice_id: string; amount: number });
      }
      navigate('/payments');
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
        title={isEdit ? 'Edit Payment' : 'Record Payment'}
        onBack={() => navigate('/payments')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ method: 'card' }}
        >
          <Form.Item
            name="invoice_id"
            label="Invoice"
            rules={[{ required: true, message: 'Please select an invoice' }]}
          >
            <Select
              placeholder="Select invoice"
              allowClear
              showSearch
              optionFilterProp="label"
              options={invoices?.map((inv) => ({
                value: inv.id,
                label: `${inv.invoice_number || 'INV'} - ${inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name}` : 'No customer'} (Total: ${inv.total || 0})`,
              })) || []}
            />
          </Form.Item>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item
              name="amount"
              label="Amount"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Please enter the payment amount' }]}
            >
              <InputNumber
                placeholder="0.00"
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="method" label="Payment Method" style={{ flex: 1 }}>
              <Select placeholder="Select method">
                <Select.Option value="card">Card</Select.Option>
                <Select.Option value="cash">Cash</Select.Option>
                <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                <Select.Option value="online">Online</Select.Option>
                <Select.Option value="check">Check</Select.Option>
                <Select.Option value="other">Other</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="gateway_transaction_id" label="Transaction ID" style={{ flex: 1 }}>
              <Input placeholder="e.g. txn_1234567890" />
            </Form.Item>
            <Form.Item name="paid_at" label="Paid At" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={4} placeholder="Additional notes for this payment" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPayment.isPending || updatePayment.isPending}
              >
                {isEdit ? 'Update' : 'Record Payment'}
              </Button>
              <Button onClick={() => navigate('/payments')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
