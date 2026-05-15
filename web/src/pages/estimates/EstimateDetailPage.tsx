import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Space, Skeleton, Tag, Table, Row, Col,
  Tooltip, Steps, message, Tabs,
  Timeline, Collapse,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined, DeleteOutlined, FilePdfOutlined, CopyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { downloadEstimatePdf } from '@/utils/estimate-pdf';
import {
  useEstimate, useDeleteEstimate, useUpdateEstimateStatus,
} from '@/hooks/use-estimates';
import { useEstimateLineItems } from '@/hooks/use-estimate-line-items';
import type { EstimateLineItem } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';
import ApprovalTrackingView from '@/components/estimates/ApprovalTrackingView';

const statusColors: Record<string, string> = {
  draft: 'default',
  sent: 'blue',
  viewed: 'cyan',
  approved: 'green',
  rejected: 'red',
  expired: 'orange',
  converted_to_wo: 'purple',
};

// Manual transitions only — `approved` and `converted_to_wo` happen automatically
// when the customer signs via magic link (backend auto-converts to WO after signing)
const statusTransitions: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['viewed', 'rejected', 'expired'],
  viewed: ['rejected', 'expired'],
  approved: [],
  rejected: [],
  expired: [],
  converted_to_wo: [],
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: estimate, isLoading } = useEstimate(id!);
  const { data: lineItems, isLoading: lineItemsLoading } = useEstimateLineItems(id!);
  const deleteEstimate = useDeleteEstimate();
  const updateStatus = useUpdateEstimateStatus();

  const handleDelete = () => {
    if (!estimate) return;
    showConfirmDialog({
      title: 'Delete Estimate',
      content: `Are you sure you want to delete estimate ${estimate.estimate_number || estimate.id}?`,
      onOk: async () => {
        await deleteEstimate.mutateAsync(estimate.id);
        navigate('/estimates');
      },
      danger: true,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate) return;
    await updateStatus.mutateAsync({ id: estimate.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Estimate Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div>
        <PageHeader title="Estimate Not Found" />
        <Card>Estimate not found</Card>
      </div>
    );
  }

  const availableTransitions = statusTransitions[estimate.status] || [];

  // Workflow stepper config
  const statusStepMap: Record<string, number> = {
    draft: 0, sent: 1, viewed: 2, approved: 3, rejected: 2, expired: 1, converted_to_wo: 4,
  };
  const currentStep = statusStepMap[estimate.status] ?? 0;
  const stepStatus = (['rejected', 'expired'].includes(estimate.status) ? 'error' : 'process') as 'process' | 'error';

  // Days until expiry
  const daysUntilExpiry = estimate.expiry_date
    ? Math.ceil((new Date(estimate.expiry_date).getTime() - Date.now()) / 86_400_000)
    : null;

  // Activity timeline
  const cf = estimate.custom_fields as Record<string, unknown> | undefined;
  const isCustomerSigned = !!(cf?.signed_at);
  const signedAt = cf?.signed_at as string | undefined;
  const getTimelineEvents = () => {
    const events = [{ label: 'Created', time: estimate.created_at, color: 'gray' }];
    if (['sent', 'viewed', 'approved', 'rejected', 'expired', 'converted_to_wo'].includes(estimate.status))
      events.push({ label: 'Sent to Customer', time: estimate.updated_at, color: 'blue' });
    if (['viewed', 'approved', 'rejected'].includes(estimate.status))
      events.push({ label: 'Viewed by Customer', time: estimate.updated_at, color: 'cyan' });
    if (['approved', 'converted_to_wo'].includes(estimate.status))
      events.push({ label: isCustomerSigned ? 'Digitally Signed & Approved' : 'Approved by Customer', time: isCustomerSigned && signedAt ? signedAt : estimate.updated_at, color: 'green' });
    if (estimate.status === 'rejected')
      events.push({ label: 'Rejected by Customer', time: estimate.updated_at, color: 'red' });
    if (estimate.status === 'converted_to_wo')
      events.push({ label: 'Converted to Work Order', time: estimate.updated_at, color: 'purple' });
    return events;
  };

  const lineItemColumns: ColumnsType<EstimateLineItem> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type.charAt(0).toUpperCase() + type.slice(1)}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Tax Rate',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      render: (rate: number) => `${rate || 0}%`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      render: (discount: number) => formatCurrency(discount || 0),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => <span style={{ fontWeight: 500 }}>{formatCurrency(total)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Estimate ${estimate.estimate_number || ''}`}
        onBack={() => navigate('/estimates')}
        extra={
          <Space>
            {(() => {
              const canDownload = ['approved', 'converted_to_wo'].includes(estimate.status);
              return (
                <Tooltip
                  title={
                    !canDownload
                      ? 'PDF is available only after the customer has approved and signed the estimate'
                      : ''
                  }
                >
                  <Button
                    icon={<FilePdfOutlined />}
                    disabled={!canDownload}
                    onClick={() => downloadEstimatePdf(estimate, lineItems || [])}
                  >
                    Download PDF
                  </Button>
                </Tooltip>
              );
            })()}
            <PermissionGuard permission="estimates:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/estimates/${estimate.id}/edit`)}>
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="estimates:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      {/* ── Workflow progress stepper ── */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '10px 20px' }}
      >
        <Steps
          current={currentStep}
          status={stepStatus}
          size="small"
          labelPlacement="vertical"
          items={[
            { title: 'Draft' },
            { title: 'Sent' },
            { title: 'Viewed' },
            { title: 'Approved' },
            { title: 'Work Order' },
          ]}
        />
      </Card>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card bodyStyle={{ padding: 0 }}>
            {/* Status transitions bar */}
            {availableTransitions.length > 0 && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                <Space wrap>
                  <span style={{ fontWeight: 500, color: '#666', fontSize: 13 }}>Transition to:</span>
                  {availableTransitions.map((status) => (
                    <Button key={status} type="primary" size="small" loading={updateStatus.isPending} onClick={() => handleStatusChange(status)}>
                      {formatStatus(status)}
                    </Button>
                  ))}
                </Space>
              </div>
            )}

            <Tabs
              defaultActiveKey="overview"
              size="large"
              style={{ padding: '0 16px' }}
              items={[
                {
                  key: 'overview',
                  label: 'Overview',
                  children: (
                    <div style={{ paddingBottom: 24 }}>
                      <Descriptions
                        column={2}
                        labelStyle={{ color: '#888', width: 130, paddingBottom: 16 }}
                        contentStyle={{ fontWeight: 500, paddingBottom: 16 }}
                        style={{ marginBottom: 8 }}
                      >
                        <Descriptions.Item label="Customer">
                          {estimate.contact
                            ? `${estimate.contact.first_name} ${estimate.contact.last_name}`
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={statusColors[estimate.status] || 'default'}>
                            {formatStatus(estimate.status)}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Estimate No.">
                          <Space size={4}>
                            <span>{estimate.estimate_number || '—'}</span>
                            {estimate.estimate_number && (
                              <CopyOutlined
                                style={{ fontSize: 11, color: '#bbb', cursor: 'pointer' }}
                                onClick={() => { void navigator.clipboard.writeText(estimate.estimate_number!); void message.success('Copied!'); }}
                              />
                            )}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Expiry Date">
                          {estimate.expiry_date
                            ? <span style={{ color: daysUntilExpiry !== null && daysUntilExpiry <= 0 ? '#ff4d4f' : daysUntilExpiry !== null && daysUntilExpiry <= 3 ? '#fa8c16' : undefined }}>
                                {formatDateTime(estimate.expiry_date)}
                              </span>
                            : <span style={{ color: '#bbb' }}>—</span>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Scheduled Date">
                          {estimate.scheduled_start ? formatDateTime(estimate.scheduled_start) : <span style={{ color: '#bbb' }}>—</span>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Created">
                          {formatDateTime(estimate.created_at)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Last Updated">
                          {formatDateTime(estimate.updated_at)}
                        </Descriptions.Item>
                      </Descriptions>

                      <Descriptions
                        column={4}
                        bordered
                        labelStyle={{ color: '#888', textAlign: 'center', fontSize: 12, padding: '12px 8px' }}
                        contentStyle={{ textAlign: 'center', fontWeight: 500, padding: '12px 8px' }}
                        style={{ marginBottom: estimate.notes ? 24 : 0 }}
                      >
                        <Descriptions.Item label="Subtotal">{formatCurrency(estimate.subtotal || 0)}</Descriptions.Item>
                        <Descriptions.Item label="Tax">{formatCurrency(estimate.tax || 0)}</Descriptions.Item>
                        <Descriptions.Item label="Discount">−{formatCurrency(estimate.discount || 0)}</Descriptions.Item>
                        <Descriptions.Item label="Total">
                          <span style={{ fontWeight: 700, color: '#1677ff' }}>{formatCurrency(estimate.total || 0)}</span>
                        </Descriptions.Item>
                      </Descriptions>

                      {estimate.notes && (
                        <Descriptions column={1} labelStyle={{ color: '#888', paddingBottom: 16 }} contentStyle={{ paddingBottom: 16 }}>
                          <Descriptions.Item label="Notes">
                            <span style={{ color: '#555' }}>{estimate.notes}</span>
                          </Descriptions.Item>
                        </Descriptions>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'line-items',
                  label: (() => {
                    const n = (lineItems || estimate.line_items || []).length;
                    return n > 0 ? `Line Items (${n})` : 'Line Items';
                  })(),
                  children: (
                    <div style={{ paddingBottom: 16 }}>
                      <Table
                        columns={lineItemColumns}
                        dataSource={lineItems || estimate.line_items || []}
                        rowKey="id"
                        loading={lineItemsLoading}
                        pagination={false}
                        locale={{ emptyText: 'No line items added' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                        <Descriptions
                          column={1}
                          size="small"
                          bordered
                          style={{ width: 280 }}
                          labelStyle={{ color: '#888' }}
                          contentStyle={{ fontWeight: 500, textAlign: 'right' }}
                        >
                          <Descriptions.Item label="Subtotal">{formatCurrency(estimate.subtotal || 0)}</Descriptions.Item>
                          <Descriptions.Item label="Tax">{formatCurrency(estimate.tax || 0)}</Descriptions.Item>
                          <Descriptions.Item label="Discount">−{formatCurrency(estimate.discount || 0)}</Descriptions.Item>
                          <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Total</span>}>
                            <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 15 }}>{formatCurrency(estimate.total || 0)}</span>
                          </Descriptions.Item>
                        </Descriptions>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <Collapse
            style={{ marginTop: 16 }}
            expandIconPosition="end"
            items={[
              {
                key: 'activity',
                label: (
                  <Space size={8}>
                    <ClockCircleOutlined />
                    <span style={{ fontWeight: 500 }}>Activity</span>
                  </Space>
                ),
                children: (
                  <Timeline
                    style={{ marginTop: 8 }}
                    items={getTimelineEvents().map((event, i) => ({
                      key: i,
                      color: event.color,
                      children: (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{event.label}</div>
                          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{formatDateTime(event.time)}</div>
                        </div>
                      ),
                    }))}
                  />
                ),
              },
            ]}
          />
        </Col>

        <Col xs={24} lg={8}>
          <ApprovalTrackingView estimate={estimate} />
        </Col>
      </Row>

    </div>
  );
}
