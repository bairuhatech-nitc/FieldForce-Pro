import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag, Table, Tabs, Form, Input, Switch, Upload, Modal, Select, DatePicker, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { EditOutlined, DeleteOutlined, PlusOutlined, PaperClipOutlined, FileTextOutlined, UploadOutlined, UserAddOutlined, CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined, EnvironmentOutlined, CarOutlined, PhoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useWorkOrder, useDeleteWorkOrder, useUpdateWorkOrderStatus, useAcceptJob, useDeclineJob } from '@/hooks/use-work-orders';
import { useCreateAgentLocation } from '@/hooks/use-agent-locations';
import { useAuthStore } from '@/store/auth.store';
import { useWorkOrderLineItems, useDeleteWorkOrderLineItem } from '@/hooks/use-work-order-line-items';
import { useWorkOrderNotes, useCreateWorkOrderNote, useDeleteWorkOrderNote } from '@/hooks/use-work-order-notes';
import { useWorkOrderAttachments, useUploadWorkOrderAttachment, useDeleteWorkOrderAttachment } from '@/hooks/use-work-order-attachments';
import { useCreateAppointment } from '@/hooks/use-appointments';
import { useUsers } from '@/hooks/use-users';
import { useEstimatesByWorkOrder, useAdminApproveEstimate, useAdminRejectEstimate, useGenerateInvoiceFromEstimate } from '@/hooks/use-estimates';
import type { WorkOrderLineItem, WorkOrderNote, WorkOrderAttachment, Estimate } from '@/types/models.types';
import { useSlaTimer } from '@/hooks/use-sla-timers';
import { SlaTimerBadge } from '@/components/work-orders/SlaTimerBadge';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';
import TechnicianFeedbackModal from '@/components/feedback/TechnicianFeedbackModal';
import { useWorkOrderFeedback } from '@/hooks/use-feedback';
import { Alert, Rate } from 'antd';

const { TextArea } = Input;

const priorityColors: Record<string, string> = {
  urgent: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const statusColors: Record<string, string> = {
  new: 'blue',
  estimated: 'gold',
  approved: 'green',
  scheduled: 'cyan',
  in_progress: 'processing',
  on_hold: 'orange',
  completed: 'green',
  closed: 'default',
  cancelled: 'red',
};

// Status transitions: New -> Estimated -> Approved -> Scheduled -> In Progress -> On Hold -> Completed -> Closed | Cancelled
const statusTransitions: Record<string, string[]> = {
  new: ['estimated', 'cancelled'],
  estimated: ['approved', 'cancelled'],
  approved: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: ['closed'],
  closed: [],
  cancelled: [],
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [noteForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [declineForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('details');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);

  const currentUser = useAuthStore((s) => s.user);

  const { data: workOrder, isLoading } = useWorkOrder(id!);
  const { data: slaTimer } = useSlaTimer(id!);
  const { data: feedbackData, isLoading: feedbackLoading } = useWorkOrderFeedback(id!);
  const { data: lineItems, isLoading: lineItemsLoading } = useWorkOrderLineItems(id!);
  const { data: notes, isLoading: notesLoading } = useWorkOrderNotes(id!);
  const { data: attachments, isLoading: attachmentsLoading } = useWorkOrderAttachments(id!);
  const { data: usersData } = useUsers();
  const deleteWorkOrder = useDeleteWorkOrder();
  const updateStatus = useUpdateWorkOrderStatus();
  const deleteLineItem = useDeleteWorkOrderLineItem();
  const createNote = useCreateWorkOrderNote();
  const deleteNote = useDeleteWorkOrderNote();
  const uploadAttachment = useUploadWorkOrderAttachment();
  const deleteAttachment = useDeleteWorkOrderAttachment();
  const createAppointment = useCreateAppointment();
  const acceptJob = useAcceptJob();
  const declineJob = useDeclineJob();
  const createAgentLocation = useCreateAgentLocation();
  const { data: woEstimates, isLoading: woEstimatesLoading } = useEstimatesByWorkOrder(id!);
  const adminApproveEstimate = useAdminApproveEstimate();
  const adminRejectEstimate = useAdminRejectEstimate();
  const generateInvoiceFromEstimate = useGenerateInvoiceFromEstimate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isTripActive, setIsTripActive] = useState(false);
  const tripIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = () => {
    if (!currentUser) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      createAgentLocation.mutate({
        user_id: currentUser.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
        recorded_at: new Date().toISOString(),
      });
    });
  };

  const startTrip = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }
    sendLocation();
    tripIntervalRef.current = setInterval(sendLocation, 30000);
    setIsTripActive(true);
    message.success('Trip started — sharing location every 30 seconds');
  };

  const stopTrip = () => {
    if (tripIntervalRef.current) {
      clearInterval(tripIntervalRef.current);
      tripIntervalRef.current = null;
    }
    setIsTripActive(false);
    message.info('Trip stopped');
  };

  useEffect(() => {
    return () => {
      if (tripIntervalRef.current) clearInterval(tripIntervalRef.current);
    };
  }, []);

  const handleAssignTechnician = async (values: { agent_id: string; scheduled_start: dayjs.Dayjs; scheduled_end: dayjs.Dayjs }) => {
    if (!workOrder) return;
    try {
      await createAppointment.mutateAsync({
        work_order_id: workOrder.id,
        agent_id: values.agent_id,
        scheduled_start: values.scheduled_start.toISOString(),
        scheduled_end: values.scheduled_end.toISOString(),
      });
      message.success('Technician assigned successfully!');
      setAssignModalOpen(false);
      assignForm.resetFields();
    } catch {
      message.error('Failed to assign technician');
    }
  };

  const handleDelete = () => {
    if (!workOrder) return;
    showConfirmDialog({
      title: 'Delete Work Order',
      content: `Are you sure you want to delete work order ${workOrder.wo_number || workOrder.id}?`,
      onOk: async () => {
        await deleteWorkOrder.mutateAsync(workOrder.id);
        navigate('/work-orders');
      },
      danger: true,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!workOrder) return;
    await updateStatus.mutateAsync({ id: workOrder.id, status: newStatus });
  };

  const handleAddNote = async (values: { content: string; is_internal: boolean }) => {
    if (!workOrder) return;
    await createNote.mutateAsync({
      work_order_id: workOrder.id,
      content: values.content,
      is_internal: values.is_internal,
    });
    noteForm.resetFields();
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Work Order Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div>
        <PageHeader title="Work Order Not Found" />
        <Card>Work order not found</Card>
      </div>
    );
  }

  const availableTransitions = statusTransitions[workOrder.status] || [];

  const lineItemColumns: ColumnsType<WorkOrderLineItem> = [
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
      render: (desc: string) => desc || <span style={{ opacity: 0.5 }}>-</span>,
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
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => <span style={{ fontWeight: 500 }}>{formatCurrency(total)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <PermissionGuard permission="work-orders:update">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              showConfirmDialog({
                title: 'Delete Line Item',
                content: `Are you sure you want to delete "${record.name}"?`,
                onOk: () => deleteLineItem.mutateAsync(record.id),
                danger: true,
              });
            }}
          />
        </PermissionGuard>
      ),
    },
  ];

  const noteColumns: ColumnsType<WorkOrderNote> = [
    {
      title: 'Note',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: 'Internal',
      dataIndex: 'is_internal',
      key: 'is_internal',
      render: (internal: boolean) =>
        internal ? <Tag color="orange">Internal</Tag> : <Tag color="blue">External</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <PermissionGuard permission="work-orders:update">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              showConfirmDialog({
                title: 'Delete Note',
                content: 'Are you sure you want to delete this note?',
                onOk: () => deleteNote.mutateAsync(record.id),
                danger: true,
              });
            }}
          />
        </PermissionGuard>
      ),
    },
  ];

  const attachmentColumns: ColumnsType<WorkOrderAttachment> = [
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (name: string, record) => (
        <a href={record.file_url} target="_blank" rel="noopener noreferrer">
          <PaperClipOutlined style={{ marginRight: 4 }} />
          {name}
        </a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type: string) => type || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number | null) => {
        if (!size) return <span style={{ opacity: 0.5 }}>-</span>;
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <PermissionGuard permission="work-orders:update">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              showConfirmDialog({
                title: 'Delete Attachment',
                content: `Are you sure you want to delete "${record.file_name}"?`,
                onOk: () => deleteAttachment.mutateAsync(record.id),
                danger: true,
              });
            }}
          />
        </PermissionGuard>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <Card>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="WO Number">
              {workOrder.wo_number || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              <Tag color={statusColors[workOrder.status] || 'default'}>
                {formatStatus(workOrder.status)}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Summary" span={2}>
              {workOrder.summary}
            </Descriptions.Item>

            <Descriptions.Item label="Priority">
              <Tag color={priorityColors[workOrder.priority] || 'default'}>
                {workOrder.priority?.charAt(0).toUpperCase() + workOrder.priority?.slice(1)}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Category">
              {workOrder.category ? <Tag>{workOrder.category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Customer">
              {workOrder.contact
                ? `${workOrder.contact.first_name} ${workOrder.contact.last_name}`
                : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Location">
              {workOrder.location?.address || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Asset">
              {workOrder.asset?.name || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Assigned To">
              {workOrder.assigned_to || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Scheduled Date">
              {workOrder.scheduled_start ? formatDateTime(workOrder.scheduled_start) : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Actual Start">
              {workOrder.actual_start ? formatDateTime(workOrder.actual_start) : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Actual End">
              {workOrder.actual_end ? formatDateTime(workOrder.actual_end) : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Description" span={2}>
              {workOrder.description || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Tags" span={2}>
              {workOrder.tags && workOrder.tags.length > 0
                ? workOrder.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                : <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Recurring">
              {workOrder.is_recurring ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label="Recurrence Rule">
              {workOrder.recurrence_rule || <span style={{ opacity: 0.5 }}>-</span>}
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              {formatDateTime(workOrder.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {formatDateTime(workOrder.updated_at)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'location',
      label: <span><EnvironmentOutlined style={{ marginRight: 4 }} />Location</span>,
      children: (() => {
        const lat = workOrder.location?.lat as number | undefined;
        const lng = workOrder.location?.lng as number | undefined;
        const address = workOrder.location?.address;
        if (!lat || !lng) {
          return (
            <Card>
              <p style={{ color: '#999', textAlign: 'center', padding: '32px 0' }}>
                No GPS location available for this work order.
              </p>
            </Card>
          );
        }
        const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01},${Number(lat) - 0.01},${Number(lng) + 0.01},${Number(lat) + 0.01}&layer=mapnik&marker=${lat},${lng}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        return (
          <Card>
            {address && <p style={{ marginBottom: 8, fontWeight: 500, fontSize: 15 }}>{address}</p>}
            <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
              GPS: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
            </p>
            <iframe
              src={mapSrc}
              title="Work Order Location Map"
              style={{ width: '100%', height: 300, border: '1px solid #e8e8e8', borderRadius: 4, marginBottom: 16 }}
              loading="lazy"
            />
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button type="primary" icon={<EnvironmentOutlined />}>Get Directions</Button>
            </a>
          </Card>
        );
      })(),
    },
    {
      key: 'line-items',
      label: 'Line Items',
      children: (
        <Card>
          <Table
            columns={lineItemColumns}
            dataSource={lineItems || []}
            rowKey="id"
            loading={lineItemsLoading}
            pagination={false}
            locale={{ emptyText: 'No line items added' }}
          />
        </Card>
      ),
    },
    {
      key: 'notes',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 4 }} />
          Notes
        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card title="Add Note">
            <Form
              form={noteForm}
              onFinish={handleAddNote}
              layout="vertical"
              initialValues={{ is_internal: false }}
            >
              <Form.Item
                name="content"
                label="Note"
                rules={[{ required: true, message: 'Please enter a note' }]}
              >
                <TextArea rows={3} placeholder="Write a note..." />
              </Form.Item>
              <Space>
                <Form.Item name="is_internal" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Internal" unCheckedChildren="External" />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={createNote.isPending}>
                  Add Note
                </Button>
              </Space>
            </Form>
          </Card>
          <Card>
            <Table
              columns={noteColumns}
              dataSource={notes || []}
              rowKey="id"
              loading={notesLoading}
              pagination={false}
              locale={{ emptyText: 'No notes added' }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'attachments',
      label: (
        <span>
          <PaperClipOutlined style={{ marginRight: 4 }} />
          Attachments
        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card title="Upload Attachment">
            <Space>
              <Upload
                fileList={fileList}
                beforeUpload={(file) => {
                  setFileList([file]);
                  return false;
                }}
                onRemove={() => setFileList([])}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select File</Button>
              </Upload>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={uploadAttachment.isPending}
                disabled={fileList.length === 0}
                onClick={async () => {
                  if (!workOrder || fileList.length === 0) return;
                  try {
                    await uploadAttachment.mutateAsync({
                      file: fileList[0] as unknown as File,
                      workOrderId: workOrder.id,
                    });
                    setFileList([]);
                  } catch {
                    // Error handled by mutation hook
                  }
                }}
              >
                Upload
              </Button>
            </Space>
          </Card>
          <Card>
            <Table
              columns={attachmentColumns}
              dataSource={attachments || []}
              rowKey="id"
              loading={attachmentsLoading}
              pagination={false}
              locale={{ emptyText: 'No attachments added' }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'estimates',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 4 }} />
          Estimates
        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card
            extra={
              <Space>
                {['in_progress', 'scheduled'].includes(workOrder.status) && (
                  <PermissionGuard permission="estimates:create">
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      onClick={() => navigate(`/estimates/new?work_order_id=${workOrder.id}&estimate_type=on_site`)}
                    >
                      Create On-Site Estimate
                    </Button>
                  </PermissionGuard>
                )}
                <PermissionGuard permission="estimates:create">
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => navigate(`/estimates/new?work_order_id=${workOrder.id}`)}
                  >
                    Create Estimate
                  </Button>
                </PermissionGuard>
              </Space>
            }
          >
            <Table
              columns={[
                {
                  title: 'Estimate #',
                  dataIndex: 'estimate_number',
                  key: 'estimate_number',
                  render: (num: string, record: Estimate) => (
                    <Button type="link" size="small" onClick={() => navigate(`/estimates/${record.id}`)}>
                      {num || record.id.slice(0, 8)}
                    </Button>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => {
                    const colors: Record<string, string> = {
                      draft: 'default',
                      pending_approval: 'orange',
                      sent: 'blue',
                      viewed: 'purple',
                      approved: 'green',
                      rejected: 'red',
                      expired: 'volcano',
                      converted_to_wo: 'cyan',
                      converted_to_invoice: 'geekblue',
                    };
                    return (
                      <Tag color={colors[status] || 'default'}>
                        {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Tag>
                    );
                  },
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (total: number) => formatCurrency(total),
                },
                {
                  title: 'Created',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) => formatDateTime(date),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 240,
                  render: (_: unknown, record: Estimate) => (
                    <Space size="small">
                      {['draft', 'pending_approval'].includes(record.status) && (
                        <PermissionGuard permission="estimates:update">
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={adminApproveEstimate.isPending}
                            onClick={() => {
                              showConfirmDialog({
                                title: 'Approve Estimate',
                                content: `Approve estimate ${record.estimate_number || record.id.slice(0, 8)}?`,
                                onOk: async () => { await adminApproveEstimate.mutateAsync(record.id); },
                              });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<CloseCircleOutlined />}
                            loading={adminRejectEstimate.isPending}
                            onClick={() => {
                              showConfirmDialog({
                                title: 'Reject Estimate',
                                content: `Reject estimate ${record.estimate_number || record.id.slice(0, 8)}?`,
                                onOk: async () => { await adminRejectEstimate.mutateAsync({ id: record.id }); },
                                danger: true,
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </PermissionGuard>
                      )}
                      {record.status === 'approved' && (
                        <PermissionGuard permission="invoices:create">
                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            loading={generateInvoiceFromEstimate.isPending}
                            onClick={async () => {
                              const res = await generateInvoiceFromEstimate.mutateAsync(record.id);
                              const inv = res.data.data;
                              if (inv?.id) navigate(`/invoices/${inv.id}`);
                            }}
                          >
                            Generate Invoice
                          </Button>
                        </PermissionGuard>
                      )}
                    </Space>
                  ),
                },
              ]}
              dataSource={woEstimates || []}
              rowKey="id"
              loading={woEstimatesLoading}
              pagination={false}
              locale={{ emptyText: 'No estimates for this work order' }}
            />
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Work Order ${workOrder.wo_number || ''}`}
        onBack={() => navigate('/work-orders')}
        extra={
          <Space>
            <PermissionGuard permission="service_appointments:create">
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setAssignModalOpen(true)}
              >
                Assign Technician
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="work-orders:update">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/work-orders/${workOrder.id}/edit`)}>
                Edit
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="work-orders:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      {availableTransitions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span style={{ fontWeight: 500 }}>Transition to:</span>
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

      {currentUser && workOrder.assigned_to === currentUser.id && (
        <Card style={{ marginBottom: 16, borderColor: '#1677ff', background: '#f0f5ff' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              {['new', 'approved', 'estimated'].includes(workOrder.status) && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={acceptJob.isPending}
                    onClick={() => {
                      showConfirmDialog({
                        title: 'Accept Job',
                        content: 'Accept this work order? It will be marked as Scheduled.',
                        onOk: async () => { await acceptJob.mutateAsync(workOrder.id); },
                      });
                    }}
                  >
                    Accept Job
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setDeclineModalOpen(true)}
                  >
                    Decline Job
                  </Button>
                </>
              )}
              {workOrder.status === 'scheduled' && (
                <>
                  <Tag color="green" style={{ padding: '4px 8px', fontSize: 13 }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    Job Accepted
                  </Tag>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={updateStatus.isPending}
                    onClick={() => handleStatusChange('in_progress')}
                  >
                    Start Job
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setDeclineModalOpen(true)}
                  >
                    Decline Job
                  </Button>
                </>
              )}
              {workOrder.status === 'in_progress' && (
                <Button
                  type="primary"
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handleStatusChange('completed')}
                >
                  Complete Job
                </Button>
              )}
            </Space>

            {['scheduled', 'in_progress'].includes(workOrder.status) && (
              <Space wrap style={{ borderTop: '1px solid #d6e4ff', paddingTop: 12 }}>
                {workOrder.location?.lat && workOrder.location?.lng && (
                  <>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${workOrder.location.lat},${workOrder.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button icon={<CarOutlined />}>Google Maps</Button>
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${workOrder.location.lat},${workOrder.location.lng}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button icon={<CarOutlined />}>Waze</Button>
                    </a>
                  </>
                )}
                {workOrder.contact?.phone && (
                  <a href={`tel:${workOrder.contact.phone}`}>
                    <Button icon={<PhoneOutlined />}>Call Customer</Button>
                  </a>
                )}
                <Button
                  type={isTripActive ? 'default' : 'primary'}
                  danger={isTripActive}
                  icon={<EnvironmentOutlined />}
                  onClick={isTripActive ? stopTrip : startTrip}
                >
                  {isTripActive ? 'Stop Trip' : 'Start Trip'}
                </Button>
              </Space>
            )}
          </Space>
        </Card>
      )}

      {slaTimer && (
        <div style={{ marginBottom: 16 }}>
          <SlaTimerBadge timer={slaTimer} />
        </div>
      )}

      {feedbackData && feedbackData.length > 0 && (
        <Card style={{ marginBottom: 16 }} title="Feedback">
          {feedbackData.map((fb: any) => (
            <Alert
              key={fb.id}
              message={
                <Space>
                  <span>Rating:</span>
                  <Rate disabled defaultValue={Number(fb.rating)} allowHalf />
                  {fb.is_customer_facing && <Tag color="blue">Shared with Customer</Tag>}
                </Space>
              }
              description={fb.comments || 'No comments provided.'}
              type="info"
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      )}

      {workOrder.status === 'completed' && (!feedbackData || feedbackData.length === 0) && (
        <Card style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Space>
            <span>Great job completing this work order! Please provide some feedback.</span>
            <Button type="primary" onClick={() => setIsFeedbackModalOpen(true)}>
              Submit Feedback
            </Button>
          </Space>
        </Card>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <Modal
        title="Assign Technician"
        open={assignModalOpen}
        onCancel={() => { setAssignModalOpen(false); assignForm.resetFields(); }}
        onOk={() => assignForm.submit()}
        okText="Assign"
        confirmLoading={createAppointment.isPending}
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignTechnician}>
          <Form.Item name="agent_id" label="Technician" rules={[{ required: true, message: 'Please select a technician' }]}>
            <Select
              showSearch
              placeholder="Select a technician"
              optionFilterProp="label"
              options={(usersData?.data || []).map((u: any) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name} (${u.email})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="scheduled_start" label="Scheduled Start" rules={[{ required: true, message: 'Required' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="scheduled_end" label="Scheduled End" rules={[{ required: true, message: 'Required' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <TechnicianFeedbackModal
        workOrderId={workOrder.id}
        open={isFeedbackModalOpen}
        onCancel={() => setIsFeedbackModalOpen(false)}
        onSuccess={() => setIsFeedbackModalOpen(false)}
      />

      <Modal
        title="Decline Job"
        open={declineModalOpen}
        onCancel={() => { setDeclineModalOpen(false); declineForm.resetFields(); }}
        onOk={() => declineForm.submit()}
        okText="Decline"
        okButtonProps={{ danger: true, loading: declineJob.isPending }}
      >
        <Form
          form={declineForm}
          layout="vertical"
          onFinish={async (values: { reason: string }) => {
            await declineJob.mutateAsync({ id: workOrder.id, reason: values.reason });
            setDeclineModalOpen(false);
            declineForm.resetFields();
          }}
        >
          <Form.Item
            name="reason"
            label="Reason for declining"
            rules={[{ required: true, message: 'Please provide a reason' }, { min: 5, message: 'Reason must be at least 5 characters' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
