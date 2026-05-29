import { useEffect } from 'react';
import { Modal, Form, Input, Select, Space, Alert } from 'antd';
import { MailOutlined, UserOutlined } from '@ant-design/icons';
import { useAllRoles } from '@/hooks/use-roles';
import { useInviteUser } from '@/hooks/use-users';
import type { InviteResult } from '@/api/users.api';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: (result: InviteResult) => void;
}

export default function InviteUserModal({ open, onClose, onInvited }: InviteUserModalProps) {
  const [form] = Form.useForm();
  const { data: roles, isLoading: rolesLoading } = useAllRoles();
  const inviteUser = useInviteUser();

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      inviteUser.mutate(values, {
        onSuccess: (res) => {
          const result = res.data.data!;
          onClose();
          onInvited(result);
        },
      });
    });
  };

  return (
    <Modal
      open={open}
      title="Invite User"
      okText="Send Invite"
      cancelText="Cancel"
      confirmLoading={inviteUser.isPending}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      width={480}
    >
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size={12}>
        <Alert
          message="An invitation link will be generated. Share it with the user to complete their account setup."
          type="info"
          showIcon
        />
      </Space>

      <Form form={form} layout="vertical">
        <Form.Item
          name="first_name"
          label="First Name"
          rules={[{ required: true, message: 'First name is required' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="First name" />
        </Form.Item>

        <Form.Item
          name="last_name"
          label="Last Name"
          rules={[{ required: true, message: 'Last name is required' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Last name" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Enter a valid email address' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="user@example.com" />
        </Form.Item>

        <Form.Item
          name="role_id"
          label="Role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select
            placeholder="Select a role"
            loading={rolesLoading}
            options={roles?.map((r) => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
