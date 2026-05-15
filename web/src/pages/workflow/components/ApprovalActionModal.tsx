import { Modal, Select, Input, Form } from 'antd';
import type { ApprovalAction } from '@/types/workflow.types';

interface ApprovalActionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (action: ApprovalAction, comments: string) => void;
  loading?: boolean;
  title?: string;
}

const actionOptions = [
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'REQUEST_CORRECTION', label: 'Request Correction' },
  { value: 'SKIP', label: 'Skip' },
];

export default function ApprovalActionModal({
  open,
  onClose,
  onSubmit,
  loading,
  title = 'Process Approval',
}: ApprovalActionModalProps) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values.action, values.comments || '');
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Submit"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="action"
          label="Action"
          rules={[{ required: true, message: 'Please select an action' }]}
        >
          <Select options={actionOptions} placeholder="Select action" />
        </Form.Item>

        <Form.Item name="comments" label="Comments">
          <Input.TextArea rows={4} placeholder="Add any comments (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
