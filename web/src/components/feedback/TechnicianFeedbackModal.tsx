import React from 'react';
import { Modal, Form, Input, Rate, Switch, message } from 'antd';
import { useCreateFeedback } from '@/hooks/use-feedback';

interface TechnicianFeedbackModalProps {
  workOrderId: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function TechnicianFeedbackModal({
  workOrderId,
  open,
  onCancel,
  onSuccess,
}: TechnicianFeedbackModalProps) {
  const [form] = Form.useForm();
  const { mutate: createFeedback, isPending } = useCreateFeedback();

  const handleFinish = (values: { rating: number; comments?: string; is_customer_facing?: boolean }) => {
    createFeedback(
      { work_order_id: workOrderId, ...values },
      {
        onSuccess: () => {
          form.resetFields();
          onSuccess();
        },
      }
    );
  };

  return (
    <Modal
      title="Technician Feedback"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okText="Submit Feedback"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ is_customer_facing: false }}
      >
        <Form.Item
          name="rating"
          label="Rating"
          rules={[{ required: true, message: 'Please provide a rating' }]}
        >
          <Rate allowHalf />
        </Form.Item>

        <Form.Item name="comments" label="Comments">
          <Input.TextArea rows={4} placeholder="Any notes about the job..." />
        </Form.Item>

        <Form.Item
          name="is_customer_facing"
          label="Share with Customer?"
          valuePropName="checked"
          tooltip="If enabled, this feedback will be visible on the customer portal."
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
