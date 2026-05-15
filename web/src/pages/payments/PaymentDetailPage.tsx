import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Spin, Tag, Empty, Row, Col, Timeline, Alert } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { usePayment, useDeletePayment } from '@/hooks/use-payments';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';

const paymentStatusColors: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
  refunded: 'warning',
  cancelled: 'default',
};

const paymentMethodIcons: Record<string, JSX.Element> = {
  credit_card: <CreditCardOutlined />,
  debit_card: <CreditCardOutlined />,
  cash: <DollarOutlined />,
  check: <FileTextOutlined />,
  bank_transfer: <DollarOutlined />,
  online: <CreditCardOutlined />,
};

export default function PaymentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: payment, isLoading } = usePayment(id || '');
  const deletePayment = useDeletePayment();

  const handleDelete = () => {
    if (!payment) return;

    showConfirmDialog({
      title: 'Delete Payment',
      content: `Are you sure you want to delete this payment record?`,
      onOk: async () => {
        await deletePayment.mutateAsync(payment.id);
        navigate('/payments');
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div style={{ padding: 100 }}>
        <Empty description="Payment not found" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/payments')}>Back to Payments</Button>
        </div>
      </div>
    );
  }

  const getPaymentTimeline = () => {
    const events = [
      {
        label: 'Payment Created',
        time: payment.created_at,
        icon: <FileTextOutlined />,
        color: 'blue',
      },
    ];

    if (payment.status === 'processing') {
      events.push({
        label: 'Payment Processing',
        time: payment.updated_at,
        icon: <ClockCircleOutlined />,
        color: 'orange',
      });
    }

    if (payment.status === 'completed') {
      events.push({
        label: 'Payment Completed',
        time: payment.updated_at,
        icon: <CheckCircleOutlined />,
        color: 'green',
      });
    }

    if (payment.status === 'failed') {
      events.push({
        label: 'Payment Failed',
        time: payment.updated_at,
        icon: <CloseCircleOutlined />,
        color: 'red',
      });
    }

    if (payment.status === 'refunded') {
      events.push({
        label: 'Payment Refunded',
        time: payment.updated_at,
        icon: <DollarOutlined />,
        color: 'purple',
      });
    }

    return events;
  };

  return (
    <div>
      <PageHeader
        title="Payment Details"
        subtitle={`Transaction #${payment.transaction_id || payment.id.slice(0, 8)}`}
        onBack={() => navigate('/payments')}
        extra={
          <Space>
            <PermissionGuard permission="payments:update">
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/payments/${id}/edit`)}
              >
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="payments:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      {payment.status === 'failed' && (
        <Alert
          message="Payment Failed"
          description={payment.notes || 'This payment transaction failed to process.'}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {payment.status === 'refunded' && (
        <Alert
          message="Payment Refunded"
          description="This payment has been refunded to the customer."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Payment Information" style={{ marginBottom: 24 }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Transaction ID" span={2}>
                <Tag color="blue">{payment.transaction_id || payment.id}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Amount">
                <span style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
                  {formatCurrency(payment.amount)}
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                <Tag
                  color={paymentStatusColors[payment.status]}
                  icon={
                    payment.status === 'completed' ? (
                      <CheckCircleOutlined />
                    ) : payment.status === 'failed' ? (
                      <CloseCircleOutlined />
                    ) : (
                      <ClockCircleOutlined />
                    )
                  }
                >
                  {payment.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Payment Method">
                <Space>
                  {paymentMethodIcons[payment.payment_method]}
                  <span>
                    {payment.payment_method.replace('_', ' ').toUpperCase()}
                  </span>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Payment Date">
                {payment.payment_date ? formatDateTime(payment.payment_date) : '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Invoice">
                {payment.invoice_id ? (
                  <Button
                    type="link"
                    onClick={() => navigate(`/invoices/${payment.invoice_id}`)}
                    style={{ padding: 0 }}
                  >
                    View Invoice
                  </Button>
                ) : (
                  <span style={{ color: '#999' }}>No invoice linked</span>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Reference Number">
                {payment.reference_number || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>

              <Descriptions.Item label="Notes" span={2}>
                {payment.notes || <span style={{ color: '#999' }}>No notes</span>}
              </Descriptions.Item>

              <Descriptions.Item label="Created At">
                {formatDateTime(payment.created_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Updated At">
                {formatDateTime(payment.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Custom Fields */}
          {payment.custom_fields && Object.keys(payment.custom_fields).length > 0 && (
            <Card title="Additional Information">
              <Descriptions column={2} bordered>
                {Object.entries(payment.custom_fields).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key.replace(/_/g, ' ').toUpperCase()}>
                    {String(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Payment Timeline" style={{ marginBottom: 24 }}>
            <Timeline>
              {getPaymentTimeline().map((event, index) => (
                <Timeline.Item key={index} color={event.color} dot={event.icon}>
                  <div>
                    <strong>{event.label}</strong>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {formatDateTime(event.time)}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {/* Payment Summary */}
          <Card title="Summary">
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span>Amount Paid:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span>Payment Method:</span>
                <span>{payment.payment_method.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <Tag color={paymentStatusColors[payment.status]}>
                  {payment.status.toUpperCase()}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}