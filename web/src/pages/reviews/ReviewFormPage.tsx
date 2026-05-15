import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, Skeleton, Select, Rate } from 'antd';
import { useReview, useCreateReview, useUpdateReview } from '@/hooks/use-reviews';
import { useAllWorkOrders } from '@/hooks/use-work-orders';
import { useAllContacts } from '@/hooks/use-contacts';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;

export default function ReviewFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: review, isLoading } = useReview(id!);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const { data: workOrders } = useAllWorkOrders();
  const { data: contacts } = useAllContacts();

  useEffect(() => {
    if (review) {
      form.setFieldsValue({
        work_order_id: review.work_order_id,
        contact_id: review.contact_id,
        rating: review.rating,
        comment: review.comment,
        platform: review.platform,
      });
    }
  }, [review, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (isEdit) {
        await updateReview.mutateAsync({ id: id!, ...values });
      } else {
        await createReview.mutateAsync(values as never);
      }
      navigate('/reviews');
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
        title={isEdit ? 'Edit Review' : 'Create Review'}
        onBack={() => navigate('/reviews')}
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          style={{ maxWidth: 800 }}
          initialValues={{ platform: 'internal' }}
        >
          <Form.Item
            name="work_order_id"
            label="Work Order"
            rules={[{ required: true, message: 'Please select a work order' }]}
          >
            <Select
              placeholder="Select work order"
              allowClear
              showSearch
              optionFilterProp="label"
              options={workOrders?.map((wo) => ({
                value: wo.id,
                label: `${wo.wo_number || 'WO'} - ${wo.summary}`,
              })) || []}
            />
          </Form.Item>

          <Form.Item
            name="contact_id"
            label="Customer (Contact)"
            rules={[{ required: true, message: 'Please select a contact' }]}
          >
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

          <Form.Item
            name="rating"
            label="Rating"
            rules={[{ required: true, message: 'Please provide a rating' }]}
          >
            <Rate allowHalf />
          </Form.Item>

          <Form.Item
            name="comment"
            label="Comment"
            rules={[{ required: true, message: 'Please enter a comment' }]}
          >
            <TextArea rows={4} placeholder="Write your review here..." />
          </Form.Item>

          <Form.Item
            name="platform"
            label="Platform"
            rules={[{ required: true, message: 'Please select a platform' }]}
          >
            <Select placeholder="Select platform">
              <Select.Option value="internal">Internal</Select.Option>
              <Select.Option value="google">Google</Select.Option>
              <Select.Option value="yelp">Yelp</Select.Option>
              <Select.Option value="facebook">Facebook</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createReview.isPending || updateReview.isPending}
              >
                {isEdit ? 'Update' : 'Submit Review'}
              </Button>
              <Button onClick={() => navigate('/reviews')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
