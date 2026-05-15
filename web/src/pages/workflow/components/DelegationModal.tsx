import { Modal, Select, Input, Form } from 'antd';
import { useUsers } from '@/hooks/use-users';
import type { User } from '@/types/models.types';

interface DelegationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (delegateToId: string, comments: string) => void;
  loading?: boolean;
}

export default function DelegationModal({
  open,
  onClose,
  onSubmit,
  loading,
}: DelegationModalProps) {
  const [form] = Form.useForm();
  const { data: usersData } = useUsers({ take: 100 });
  const users = usersData?.data || [];

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values.delegate_to_id, values.comments || '');
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Delegate Approval"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Delegate"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="delegate_to_id"
          label="Delegate To"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            placeholder="Select user to delegate to"
            showSearch
            optionFilterProp="label"
            options={users.map((u: User) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name} (${u.email})`,
            }))}
          />
        </Form.Item>

        <Form.Item name="comments" label="Reason for Delegation">
          <Input.TextArea rows={3} placeholder="Explain why you're delegating (optional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
