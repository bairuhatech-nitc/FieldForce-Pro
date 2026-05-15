import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Tag, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { usePayments, useDeletePayment } from '@/hooks/use-payments';
import type { Payment } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';

const statusColors: Record<string, string> = {
  pending: 'blue',
  completed: 'green',
  failed: 'red',
  refunded: 'orange',
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function PaymentListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = usePayments({ page, take: pageSize, search });
  const deletePayment = useDeletePayment();

  const payments = data?.data || [];
  const meta = data?.meta;

  const filteredPayments = payments.filter((pmt) => {
    if (statusFilter && pmt.status !== statusFilter) return false;
    return true;
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (payment: Payment) => {
    showConfirmDialog({
      title: 'Delete Payment',
      content: 'Are you sure you want to delete this payment record?',
      onOk: async () => {
        await deletePayment.mutateAsync(payment.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_, record) =>
        record.invoice?.invoice_number
          ? <span style={{ fontWeight: 500 }}>{record.invoice.invoice_number}</span>
          : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 500 }}>{formatCurrency(amount || 0)}</span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag>{formatStatus(method)}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {formatStatus(status)}
        </Tag>
      ),
    },
    {
      title: 'Transaction ID',
      dataIndex: 'gateway_transaction_id',
      key: 'gateway_transaction_id',
      render: (txId: string) => txId || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Paid At',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ color: '#999' }}>-</span>,
      sorter: (a, b) => {
        if (!a.paid_at) return 1;
        if (!b.paid_at) return -1;
        return new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="payments:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/payments/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="payments:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/payments/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="payments:delete">
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)} />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        subtitle="Manage payments"
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <SearchFilter
          placeholder="Search payments by transaction ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select
          placeholder="Filter by status"
          allowClear
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={statusOptions}
          style={{ width: 180 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredPayments}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} payments`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}
