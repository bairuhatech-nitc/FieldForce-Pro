import { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Checkbox,
  Tag,
  Alert,
  Progress,
  Steps,
  DatePicker,
  Select,
  Form,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface WorkOrderForInvoicing {
  id: string;
  wo_number: string;
  customer_name: string;
  service_date: string;
  total_amount: number;
  status: string;
  has_invoice: boolean;
}

interface BatchInvoiceGenerationProps {
  visible: boolean;
  onClose: () => void;
  onGenerate?: (workOrderIds: string[], dueDate: string) => Promise<void>;
}

export default function BatchInvoiceGenerationComponent({
  visible,
  onClose,
  onGenerate,
}: BatchInvoiceGenerationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [dueDate, setDueDate] = useState<dayjs.Dayjs>(dayjs().add(30, 'days'));
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [form] = Form.useForm();

  // Mock data - replace with actual API call
  const workOrders: WorkOrderForInvoicing[] = [
    {
      id: '1',
      wo_number: 'WO-2024-001',
      customer_name: 'ABC Company',
      service_date: '2024-02-15T10:00:00Z',
      total_amount: 1250.0,
      status: 'Completed',
      has_invoice: false,
    },
    {
      id: '2',
      wo_number: 'WO-2024-002',
      customer_name: 'XYZ Corp',
      service_date: '2024-02-16T14:00:00Z',
      total_amount: 850.0,
      status: 'Completed',
      has_invoice: false,
    },
    {
      id: '3',
      wo_number: 'WO-2024-003',
      customer_name: 'Smith Industries',
      service_date: '2024-02-17T09:00:00Z',
      total_amount: 2100.0,
      status: 'Completed',
      has_invoice: true,
    },
  ];

  const eligibleWorkOrders = workOrders.filter((wo) => !wo.has_invoice);

  const columns: ColumnsType<WorkOrderForInvoicing> = [
    {
      title: 'Work Order',
      dataIndex: 'wo_number',
      key: 'wo_number',
      render: (number: string) => <Tag color="blue">{number}</Tag>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Service Date',
      dataIndex: 'service_date',
      key: 'service_date',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Completed' ? 'success' : 'processing'}>{status}</Tag>
      ),
    },
    {
      title: 'Invoice',
      dataIndex: 'has_invoice',
      key: 'has_invoice',
      render: (hasInvoice: boolean) =>
        hasInvoice ? (
          <Tag color="success">
            <CheckCircleOutlined /> Invoiced
          </Tag>
        ) : (
          <Tag color="default">
            <WarningOutlined /> Pending
          </Tag>
        ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: WorkOrderForInvoicing) => ({
      disabled: record.has_invoice,
    }),
  };

  const handleNext = () => {
    if (currentStep === 0 && selectedRowKeys.length === 0) {
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate batch generation
      const workOrderIds = selectedRowKeys as string[];
      const total = workOrderIds.length;

      for (let i = 0; i < total; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setGenerationProgress(((i + 1) / total) * 100);
        setGeneratedCount(i + 1);
      }

      if (onGenerate) {
        await onGenerate(workOrderIds, dueDate.format('YYYY-MM-DD'));
      }

      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to generate invoices', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleFinish = () => {
    setCurrentStep(0);
    setSelectedRowKeys([]);
    setGenerationProgress(0);
    setGeneratedCount(0);
    onClose();
  };

  const totalAmount = eligibleWorkOrders
    .filter((wo) => selectedRowKeys.includes(wo.id))
    .reduce((sum, wo) => sum + wo.total_amount, 0);

  return (
    <Modal
      title="Batch Invoice Generation"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <Steps
        current={currentStep}
        style={{ marginBottom: 24 }}
        items={[
          { title: 'Select Work Orders', icon: <FileTextOutlined /> },
          { title: 'Configure Settings', icon: <CheckCircleOutlined /> },
          { title: 'Generate Invoices', icon: <LoadingOutlined /> },
        ]}
      />

      {currentStep === 0 && (
        <div>
          <Alert
            message={`Found ${eligibleWorkOrders.length} completed work orders without invoices`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space style={{ marginBottom: 16 }}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            />
            <Button onClick={() => setSelectedRowKeys(eligibleWorkOrders.map((wo) => wo.id))}>
              Select All Eligible
            </Button>
            <Button onClick={() => setSelectedRowKeys([])}>Clear Selection</Button>
          </Space>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={eligibleWorkOrders}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{selectedRowKeys.length} work orders selected</strong>
              {selectedRowKeys.length > 0 && (
                <span style={{ marginLeft: 16, color: '#52c41a' }}>
                  Total: {formatCurrency(totalAmount)}
                </span>
              )}
            </div>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleNext}
                disabled={selectedRowKeys.length === 0}
              >
                Next
              </Button>
            </Space>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <Alert
            message={`Generating ${selectedRowKeys.length} invoices`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form form={form} layout="vertical">
            <Form.Item label="Invoice Due Date" required>
              <DatePicker
                value={dueDate}
                onChange={(date) => date && setDueDate(date)}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Form.Item>

            <Form.Item label="Default Payment Terms" initialValue={30}>
              <Select>
                <Select.Option value={0}>Due on Receipt</Select.Option>
                <Select.Option value={7}>Net 7</Select.Option>
                <Select.Option value={15}>Net 15</Select.Option>
                <Select.Option value={30}>Net 30</Select.Option>
                <Select.Option value={60}>Net 60</Select.Option>
                <Select.Option value={90}>Net 90</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Late Fee Percentage (%)" initialValue={0}>
              <InputNumber min={0} max={25} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Form>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handlePrevious}>Previous</Button>
            <Space>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" onClick={handleGenerate} loading={generating}>
                Generate {selectedRowKeys.length} Invoices
              </Button>
            </Space>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          {generating ? (
            <div>
              <Progress
                type="circle"
                percent={Math.round(generationProgress)}
                status="active"
                strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              />
              <div style={{ marginTop: 24, fontSize: 16 }}>
                Generating invoices... {generatedCount} / {selectedRowKeys.length}
              </div>
            </div>
          ) : (
            <div>
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                Successfully Generated!
              </div>
              <div style={{ color: '#8c8c8c', marginBottom: 24 }}>
                {generatedCount} invoices have been created successfully
              </div>
              <Space>
                <Button onClick={() => window.location.href = '/invoices'}>
                  View Invoices
                </Button>
                <Button type="primary" onClick={handleFinish}>
                  Done
                </Button>
              </Space>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}