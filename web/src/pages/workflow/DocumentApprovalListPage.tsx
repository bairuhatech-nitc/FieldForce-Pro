import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Space, Card, Select, Tooltip, Tabs } from 'antd';
import {
  EyeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatDateTime } from '@/utils/format-date';
import {
  useDocumentApprovals,
  useSentToMeApprovals,
} from '@/hooks/use-workflow';
import type { DocumentApproval } from '@/types/workflow.types';
import ApprovalDetailsModal from './components/ApprovalDetailsModal';
import DocumentTimeline from './components/DocumentTimeline';

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  SKIPPED: 'default',
  CORRECTION_REQUIRED: 'gold',
};

const documentTypeColors: Record<string, string> = {
  INVOICE: 'blue',
  QUOTATION: 'purple',
  VENDOR: 'orange',
  CONTRACT: 'cyan',
  DRAFT_INVOICE: 'blue',
  PRQ: 'gold',
  PO: 'gold',
  PROFORMA: 'geekblue',
  PAYMENT_REQUEST: 'volcano',
  SERVICE_CONTRACT: 'lime',
  PETTY_CASH: 'magenta',
  PURCHASE_REQUEST: 'gold',
  SERVICE_REQUEST: 'green',
  PETTY_CASH_REPORT: 'magenta',
  RESOURCE_BOOKING: 'geekblue',
  PURCHASE_ORDER: 'gold',
  WORK_ORDER: 'geekblue',
  ESTIMATE: 'magenta',
  ESTIMATE_APPROVAL: 'magenta',
  EXPENSE: 'red',
  SCHEDULE: 'cyan',
  FIELD_WORKFLOW: 'lime',
};

// Navigate to the related document based on type
const documentRoutes: Record<string, (docId: string) => string> = {
  SERVICE_REQUEST: (id) => `/service-requests/${id}`,
  WORK_ORDER: (id) => `/work-orders/${id}`,
  ESTIMATE: (id) => `/estimates/${id}`,
  ESTIMATE_APPROVAL: (id) => `/estimates/${id}`,
  SCHEDULE: (id) => `/scheduling?tab=review&appointment_id=${id}`,
  FIELD_WORKFLOW: (id) => `/work-orders?wo_id=${id}#field-workflow`,
};

export default function DocumentApprovalListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [docTypeFilter, setDocTypeFilter] = useState<string | undefined>(undefined);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState('');

  // All approvals query
  const allApprovalsQuery = useDocumentApprovals(
    activeTab === 'all'
      ? { page, take: pageSize, status: statusFilter, document_type: docTypeFilter }
      : undefined,
  );

  // Sent to me (all statuses) query
  const sentToMeQuery = useSentToMeApprovals(
    activeTab === 'sent-to-me' ? { page, take: pageSize } : undefined,
  );

  const currentQuery = activeTab === 'all' ? allApprovalsQuery : sentToMeQuery;

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    setStatusFilter(undefined);
    setDocTypeFilter(undefined);
  };

  const handleViewDetails = (id: string) => {
    setSelectedApprovalId(id);
    setDetailsModalOpen(true);
  };

  const columns: ColumnsType<DocumentApproval> = [
    {
      title: 'Document',
      key: 'document',
      render: (_: unknown, record) => {
        const route = documentRoutes[record.document_type];
        return (
          <div>
            <Tag color={documentTypeColors[record.document_type] || 'default'}>
              {record.document_type.replace(/_/g, ' ')}
            </Tag>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              {record.document_id.slice(0, 8)}...
              {route && (
                <Tooltip title="Go to document">
                  <Button
                    type="link"
                    size="small"
                    icon={<LinkOutlined />}
                    style={{ padding: '0 4px', fontSize: 12 }}
                    onClick={() => navigate(route(record.document_id))}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Workflow',
      key: 'workflow',
      render: (_: unknown, record) => record.workflow_template?.name || '-',
    },
    {
      title: 'Step',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 70,
      align: 'center',
      render: (v: number) => `#${v}`,
    },
    {
      title: 'Approver',
      key: 'approver',
      render: (_: unknown, record) =>
        record.approver
          ? `${record.approver.first_name} ${record.approver.last_name}`
          : record.approver_id.slice(0, 8),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => (date ? formatDateTime(date) : '-'),
    },
    {
      title: 'Action Date',
      dataIndex: 'action_date',
      key: 'action_date',
      render: (date: string) => (date ? formatDateTime(date) : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, record) => (
        <Tooltip title="View Details">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Document Approvals</h2>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: 'all', label: 'All Approvals' },
          { key: 'sent-to-me', label: 'Sent to Me' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            {activeTab === 'all' && (
              <>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  style={{ width: 180 }}
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                  options={[
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'REJECTED', label: 'Rejected' },
                    { value: 'SKIPPED', label: 'Skipped' },
                    { value: 'CORRECTION_REQUIRED', label: 'Correction Required' },
                  ]}
                />
                <Select
                  placeholder="Filter by document type"
                  allowClear
                  style={{ width: 200 }}
                  value={docTypeFilter}
                  onChange={(v) => { setDocTypeFilter(v); setPage(1); }}
                  options={[
                    { value: 'INVOICE', label: 'Invoice' },
                    { value: 'QUOTATION', label: 'Quotation' },
                    { value: 'VENDOR', label: 'Vendor' },
                    { value: 'CONTRACT', label: 'Contract' },
                    { value: 'DRAFT_INVOICE', label: 'Draft Invoice' },
                    { value: 'PRQ', label: 'PRQ' },
                    { value: 'PO', label: 'PO' },
                    { value: 'PROFORMA', label: 'Proforma' },
                    { value: 'PAYMENT_REQUEST', label: 'Payment Request' },
                    { value: 'SERVICE_CONTRACT', label: 'Service Contract' },
                    { value: 'PETTY_CASH', label: 'Petty Cash' },
                    { value: 'PURCHASE_REQUEST', label: 'Purchase Request' },
                    { value: 'SERVICE_REQUEST', label: 'Service Request' },
                    { value: 'PETTY_CASH_REPORT', label: 'Petty Cash Report' },
                    { value: 'RESOURCE_BOOKING', label: 'Resource Booking' },
                    { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
                    { value: 'WORK_ORDER', label: 'Work Order' },
                    { value: 'ESTIMATE', label: 'Estimate' },
                    { value: 'ESTIMATE_APPROVAL', label: 'Estimate Approval' },
                    { value: 'EXPENSE', label: 'Expense' },
                    { value: 'SCHEDULE', label: 'Schedule' },
                    { value: 'FIELD_WORKFLOW', label: 'Field Workflow' },
                  ]}
                />
              </>
            )}
          </Space>

        </div>

        <Table
          columns={columns}
          dataSource={currentQuery.data?.data || []}
          loading={currentQuery.isLoading}
          rowKey="id"
          expandable={{
            expandedRowRender: (record) => (
              <DocumentTimeline documentId={record.document_id} />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total: currentQuery.data?.meta?.itemCount || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} approvals`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <ApprovalDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        approvalId={selectedApprovalId}
      />
    </div>
  );
}
