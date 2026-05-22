import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select } from 'antd';
import { useCompany, useCreateCompany, useUpdateCompany } from '@/hooks/use-companies';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: company, isLoading } = useCompany(id!);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        industry: company.industry,
        status: company.status,
        phone_number: company.phone_number,
        billing_address: company.billing_address,
        shipping_address: company.shipping_address,
        tax_id: company.tax_id,
        website: company.website,
        notes: company.notes,
      });
    }
  }, [company, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: id!, ...values });
      } else {
        await createCompany.mutateAsync(values);
      }
      navigate('/companies');
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
        title={isEdit ? 'Edit Company' : 'Create Company'}
        onBack={() => navigate('/companies')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="Acme Corporation" />
          </Form.Item>

          <Form.Item
            name="industry"
            label="Industry"
          >
            <Input placeholder="Technology, Healthcare, Manufacturing, etc." />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select placeholder="Select a status">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
              <Select.Option value="Lead">Lead</Select.Option>
              <Select.Option value="Churned">Churned</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="phone_number" label="Phone Number">
            <Input placeholder="+1234567890" />
          </Form.Item>

          <Form.Item
            name="tax_id"
            label="Tax ID / EIN"
          >
            <Input placeholder="12-3456789" />
          </Form.Item>

          <Form.Item
            name="website"
            label="Website"
            rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="billing_address"
            label="Billing Address"
          >
            <TextArea rows={3} placeholder="123 Main St, City, State, 12345" />
          </Form.Item>

          <Form.Item name="shipping_address" label="Shipping Address">
            <TextArea rows={3} placeholder="456 Delivery St, City, State, 12345" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={4} placeholder="Additional notes about this company" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createCompany.isPending || updateCompany.isPending}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/companies')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
