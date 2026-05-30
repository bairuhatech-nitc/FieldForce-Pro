import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next'; // Rule 1
import { useInvoice, useDeleteInvoice, useUpdateInvoiceStatus, useInvoiceLineItems } from '@/hooks/use-invoices';
import { useInvoicePayments } from '@/hooks/use-payments';
import type { InvoiceLineItem, Payment } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';

const statusColors: Record<string, string> = {
  draft: 'default',
  sent: 'blue',
  viewed: 'cyan',
  partially_paid: 'gold',
  paid: 'green',
  overdue: 'red',
  void: 'default',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'blue',
  completed: 'green',
  failed: 'red',
  refunded: 'orange',
};

// Status transitions: Draft -> Sent -> Viewed -> Partially Paid -> Paid | Overdue | Void
const statusTransitions: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['viewed', 'void'],
  viewed: ['partially_paid', 'paid', 'overdue', 'void'],
  partially_paid: ['paid', 'overdue', 'void'],
  paid: [],
  overdue: ['partially_paid', 'paid', 'void'],
  void: [],
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(); // Rule 2
  const { data: invoice, isLoading } = useInvoice(id!);
  const { data: lineItems, isLoading: lineItemsLoading } = useInvoiceLineItems(id!);
  const { data: payments, isLoading: paymentsLoading } = useInvoicePayments(id!);
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();

  const handleDelete = () => {
    if (!invoice) return;
    showConfirmDialog({
      title: t('invoiceDetails.deleteInvoiceTitle'),
      content: t('invoiceDetails.deleteInvoiceContent', { invoiceNumber: invoice.invoice_number || invoice.id }),
      onOk: async () => {
        await deleteInvoice.mutateAsync(invoice.id);
        navigate('/invoices');
      },
      danger: true,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    await updateStatus.mutateAsync({ id: invoice.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('invoiceDetails.invoiceDetailsTitle')} />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <PageHeader title={t('invoiceDetails.invoiceNotFoundTitle')} />
        <Card>{t('invoiceDetails.invoiceNotFoundMessage')}</Card>
      </div>
    );
  }

  const availableTransitions = statusTransitions[invoice.status] || [];
  const currency = invoice.currency || 'USD';

  const lineItemColumns: ColumnsType<InvoiceLineItem> = [
    {
      title: t('invoiceDetails.lineItemColumns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type.charAt(0).toUpperCase() + type.slice(1)}</Tag>,
    },
    {
      title: t('invoiceDetails.lineItemColumns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: t('invoiceDetails.lineItemColumns.description'),
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: t('invoiceDetails.lineItemColumns.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: t('invoiceDetails.lineItemColumns.unitPrice'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number) => formatCurrency(price, currency),
    },
    {
      title: t('invoiceDetails.lineItemColumns.taxRate'),
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      render: (rate: number) => `${rate || 0}%`,
    },
    {
      title: t('invoiceDetails.lineItemColumns.discount'),
      dataIndex: 'discount',
      key: 'discount',
      render: (discount: number, record: InvoiceLineItem) => {
        if (!discount) return <span style={{ opacity: 0.5 }}>-</span>;
        if (record.discount_type === 'percentage') return `${discount}%`;
        return formatCurrency(discount, currency);
      },
    },
    {
      title: t('invoiceDetails.lineItemColumns.total'),
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => <span style={{ fontWeight: 500 }}>{formatCurrency(total, currency)}</span>,
    },
  ];

  const paymentColumns: ColumnsType<Payment> = [
    {
      title: t('invoiceDetails.paymentColumns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span style={{ fontWeight: 500 }}>{formatCurrency(amount, currency)}</span>,
    },
    {
      title: t('invoiceDetails.paymentColumns.method'),
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag>{formatStatus(method)}</Tag>,
    },
    {
      title: t('invoiceDetails.paymentColumns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={paymentStatusColors[status] || 'default'}>
          {formatStatus(status)}
        </Tag>
      ),
    },
    {
      title: t('invoiceDetails.paymentColumns.transactionId'),
      dataIndex: 'gateway_transaction_id',
      key: 'gateway_transaction_id',
      render: (txId: string) => txId || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: t('invoiceDetails.paymentColumns.paidAt'),
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: t('invoiceDetails.paymentColumns.notes'),
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || <span style={{ opacity: 0.5 }}>-</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('invoiceDetails.pageHeaderTitle', { invoiceNumber: invoice.invoice_number || '' })}
        onBack={() => navigate('/invoices')}
        extra={
          <Space>
            <PermissionGuard permission="invoices:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                {t('common.edit')}
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="invoices:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                {t('common.delete')}
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      {availableTransitions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span style={{ fontWeight: 500 }}>{t('invoiceDetails.transitionTo')}</span>
            {availableTransitions.map((status) => (
              <Button
                key={status}
                type="primary"
                size="small"
                loading={updateStatus.isPending}
                onClick={() => handleStatusChange(status)}
              >
                {formatStatus(status)}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Card title={t('invoiceDetails.invoiceInformationCardTitle')}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('invoiceDetails.invoiceNumberLabel')}>
            {invoice.invoice_number || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.statusLabel')}>
            <Tag color={statusColors[invoice.status] || 'default'}>
              {formatStatus(invoice.status)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.customerLabel')}>
            {invoice.contact
              ? `${invoice.contact.first_name} ${invoice.contact.last_name}`
              : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.workOrderLabel')}>
            {invoice.work_order
              ? invoice.work_order.wo_number || invoice.work_order.summary
              : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.dueDateLabel')}>
            {invoice.due_date ? formatDateTime(invoice.due_date) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.currencyLabel')}>
            <Tag>{currency}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.subtotalLabel')}>
            {formatCurrency(invoice.subtotal || 0, currency)}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.taxLabel')}>
            {formatCurrency(invoice.tax || 0, currency)}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.discountLabel')}>
            {formatCurrency(invoice.discount || 0, currency)}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.totalLabel')}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{formatCurrency(invoice.total || 0, currency)}</span>
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.paidAmountLabel')}>
            <span style={{ fontWeight: 500, color: invoice.paid_amount >= invoice.total ? '#52c41a' : '#faad14' }}>
              {formatCurrency(invoice.paid_amount || 0, currency)}
            </span>
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.balanceDueLabel')}>
            <span style={{ fontWeight: 500 }}>
              {formatCurrency((invoice.total || 0) - (invoice.paid_amount || 0), currency)}
            </span>
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.notesLabel')} span={2}>
            {invoice.notes || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label={t('invoiceDetails.createdAtLabel')}>
            {formatDateTime(invoice.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label={t('invoiceDetails.updatedAtLabel')}>
            {formatDateTime(invoice.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('invoiceDetails.lineItemsCardTitle')} style={{ marginTop: 16 }}>
        <Table
          columns={lineItemColumns}
          dataSource={lineItems || invoice.line_items || []}
          rowKey="id"
          loading={lineItemsLoading}
          pagination={false}
          locale={{ emptyText: t('invoiceDetails.noLineItems') }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong>{t('invoiceDetails.summarySubtotal')}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{formatCurrency(invoice.subtotal || 0, currency)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  {t('invoiceDetails.summaryTax')}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  {formatCurrency(invoice.tax || 0, currency)}
                </Table.Summary.Cell>
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  {t('invoiceDetails.summaryDiscount')}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  -{formatCurrency(invoice.discount || 0, currency)}
                </Table.Summary.Cell>
              </Table.Summary.Row>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong style={{ fontSize: 16 }}>{t('invoiceDetails.summaryTotal')}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong style={{ fontSize: 16 }}>{formatCurrency(invoice.total || 0, currency)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <Card title={t('invoiceDetails.paymentsCardTitle')} style={{ marginTop: 16 }}>
        <Table
          columns={paymentColumns}
          dataSource={payments || []}
          rowKey="id"
          loading={paymentsLoading}
          pagination={false}
          locale={{ emptyText: t('invoiceDetails.noPayments') }}
        />
      </Card>
    </div>
  );
}