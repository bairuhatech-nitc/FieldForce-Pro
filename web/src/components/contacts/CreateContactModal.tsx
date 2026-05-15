import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useCreateContact } from '@/hooks/use-contacts';
import type { Contact } from '@/types/models.types';

const { TextArea } = Input;

interface CreateContactModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (contact: Contact) => void;
}

export default function CreateContactModal({
  open,
  onCancel,
  onSuccess,
}: CreateContactModalProps) {
  const [form] = Form.useForm();
  const createContact = useCreateContact();

  // Reset form when modal is closed
  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async (values: any) => {
    try {
      const newContact = await createContact.mutateAsync(values);
      message.success('Customer created successfully');
      form.resetFields();
      onSuccess(newContact);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <Modal
      title="Create New Customer"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={createContact.isPending}
      okText="Create"
      cancelText="Cancel"
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="first_name"
          label="First Name"
          rules={[{ required: true, message: 'Please enter first name' }]}
        >
          <Input placeholder="John" />
        </Form.Item>

        <Form.Item
          name="last_name"
          label="Last Name"
          rules={[{ required: true, message: 'Please enter last name' }]}
        >
          <Input placeholder="Doe" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input placeholder="john.doe@example.com" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="+1234567890" />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <TextArea rows={3} placeholder="123 Main St, City, State, 12345" />
        </Form.Item>

        <Form.Item name="tags" label="Tags">
          <Select
            mode="tags"
            placeholder="Add tags (press Enter to add)"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
