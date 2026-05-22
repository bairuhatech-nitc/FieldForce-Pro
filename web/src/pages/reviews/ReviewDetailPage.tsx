import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Rate } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useReview, useDeleteReview } from '@/hooks/use-reviews';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

const platformColors: Record<string, string> = {
  internal: 'blue',
  google: 'green',
  yelp: 'red',
  facebook: 'blue',
  other: 'default',
};

function formatPlatform(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: review, isLoading } = useReview(id!);
  const deleteReview = useDeleteReview();

  const handleDelete = () => {
    if (!review) return;
    showConfirmDialog({
      title: 'Delete Review',
      content: 'Are you sure you want to delete this review?',
      onOk: async () => {
        await deleteReview.mutateAsync(review.id);
        navigate('/reviews');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Review Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!review) {
    return (
      <div>
        <PageHeader title="Review Not Found" />
        <Card>Review not found</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Review Details"
        onBack={() => navigate('/reviews')}
        extra={
          <Space>
            <PermissionGuard permission="reviews:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/reviews/${review.id}/edit`)}>
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="reviews:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Review Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Rating" span={2}>
            <Rate disabled value={review.rating} allowHalf />
            <span style={{ marginLeft: 8 }}>({review.rating} / 5)</span>
          </Descriptions.Item>

          <Descriptions.Item label="Work Order">
            {review.work_order_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Customer">
            {review.contact_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Platform">
            <Tag color={platformColors[review.platform] || 'default'}>
              {formatPlatform(review.platform)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Submitted">
            {formatDateTime(review.created_at)}
          </Descriptions.Item>

          <Descriptions.Item label="Comment" span={2}>
            {review.comment || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(review.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(review.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
