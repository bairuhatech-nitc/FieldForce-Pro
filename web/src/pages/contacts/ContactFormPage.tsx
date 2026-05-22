import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Select, Skeleton } from 'antd';
import { useContact, useCreateContact, useUpdateContact } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: contact, isLoading } = useContact(id!);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  useEffect(() => {
    if (contact) {
      form.setFieldsValue({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        tags: contact.tags || [],
      });
    }
  }, [contact, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEdit) {
        await updateContact.mutateAsync({ id: id!, ...values });
      } else {
        await createContact.mutateAsync(values);
      }
      navigate('/contacts');
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Contact' : 'Create Contact'}
        onBack={() => navigate('/contacts')}
      />

      <Card>
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

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createContact.isPending || updateContact.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/contacts')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
