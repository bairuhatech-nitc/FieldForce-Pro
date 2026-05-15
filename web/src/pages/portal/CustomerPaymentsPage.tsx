import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Divider,
  Alert,
  Modal,
  Form,
  Input,
  Radio,
  Descriptions,
  message,
  Badge,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  CreditCardOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  EyeOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Title, Text, Paragraph } = Typography;

// Mock data - replace with actual API calls
const mockInvoices = [
  {
    key: '1',
    invoice_number: 'INV-2025-001',
    work_order: 'WO-2025-001',
    issue_date: '2025-02-15',
    due_date: '2025-03-15',
    total_amount: 250.0,
    paid_amount: 250.0,
    balance: 0.0,
    status: 'Paid',
    description: 'HVAC System Maintenance',
  },
  {
    key: '2',
    invoice_number: 'INV-2025-002',
    work_order: 'WO-2025-002',
    issue_date: '2025-02-18',
    due_date: '2025-03-18',
    total_amount: 450.0,
    paid_amount: 0.0,
    balance: 450.0,
    status: 'Sent',
    description: 'Plumbing Repair',
  },
  {
    key: '3',
    invoice_number: 'INV-2025-003',
    work_order: 'WO-2025-003',
    issue_date: '2025-02-10',
    due_date: '2025-03-10',
    total_amount: 350.0,
    paid_amount: 200.0,
    balance: 150.0,
    status: 'Partially Paid',
    description: 'Electrical Installation',
  },
  {
    key: '4',
    invoice_number: 'INV-2025-004',
    work_order: 'WO-2025-004',
    issue_date: '2025-01-25',
    due_date: '2025-02-25',
    total_amount: 180.0,
    paid_amount: 0.0,
    balance: 180.0,
    status: 'Overdue',
    description: 'AC Filter Replacement',
  },
];

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Paid': 'success',
    'Sent': 'processing',
    'Partially Paid': 'warning',
    'Overdue': 'error',
    'Draft': 'default',
    'Void': 'default',
  };
  return colors[status] || 'default';
};

interface Invoice {
  key: string;
  invoice_number: string;
  work_order: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  description: string;
}

export default function CustomerPaymentsPage() {
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  // Calculate totals
  const totalOutstanding = mockInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  const totalPaid = mockInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const overdueCount = mockInvoices.filter((inv) => inv.status === 'Overdue').length;

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentModalVisible(true);
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedInvoice) return;

    form.validateFields().then((values) => {
      setLoading(true);

      // Simulate payment processing
      setTimeout(() => {
        setLoading(false);
        message.success(`Payment of $${selectedInvoice.balance.toFixed(2)} processed successfully!`);
        setPaymentModalVisible(false);
        setSelectedInvoice(null);
        form.resetFields();
      }, 2000);
    });
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      responsive: ['md'],
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      responsive: ['md'],
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => <Text>${amount.toFixed(2)}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance) => (
        <Text strong style={{ color: balance > 0 ? '#ff4d4f' : '#52c41a' }}>
          ${balance.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Badge status={getStatusColor(status)} text={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View
          </Button>
          {record.balance > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handlePayNow(record)}
            >
              Pay Now
            </Button>
          )}
          <Button type="link" size="small" icon={<DownloadOutlined />}>
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments & Invoices"
        subtitle="View and pay your invoices online"
      />

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={totalOutstanding}
              precision={2}
              prefix="$"
              valueStyle={{ color: totalOutstanding > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Paid (This Year)"
              value={totalPaid}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Overdue Invoices"
              value={overdueCount}
              valueStyle={{ color: overdueCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={overdueCount > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Alert
          message="You have overdue invoices"
          description={`${overdueCount} invoice(s) are past due. Please make a payment to avoid late fees.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" danger type="primary">
              Pay Overdue
            </Button>
          }
        />
      )}

      {/* Invoices Table */}
      <Card title="Your Invoices">
        <Table
          columns={columns}
          dataSource={mockInvoices}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} invoices`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Payment Methods Info */}
      <Card style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size="small">
              <Text strong>Accepted Payment Methods</Text>
              <Space wrap>
                <Tag icon={<CreditCardOutlined />} color="blue">
                  Credit/Debit Card
                </Tag>
                <Tag icon={<BankOutlined />} color="cyan">
                  ACH/Bank Transfer
                </Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                All payments are secured with 256-bit SSL encryption
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Alert
              message="Auto-Pay Available"
              description="Set up automatic payments and never miss a due date. Contact us to enable."
              type="info"
              showIcon
              icon={<SafetyOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Payment Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#1890ff' }} />
            <span>Make a Payment</span>
          </Space>
        }
        open={paymentModalVisible}
        onOk={handlePaymentSubmit}
        onCancel={() => {
          setPaymentModalVisible(false);
          setSelectedInvoice(null);
          form.resetFields();
        }}
        width={600}
        okText="Process Payment"
        confirmLoading={loading}
      >
        {selectedInvoice && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Invoice Summary */}
            <Card size="small" style={{ background: '#f5f5f5' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Invoice Number">
                  <Text strong>{selectedInvoice.invoice_number}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selectedInvoice.description}
                </Descriptions.Item>
                <Descriptions.Item label="Amount Due">
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    ${selectedInvoice.balance.toFixed(2)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Divider style={{ margin: 0 }} />

            {/* Payment Form */}
            <Form form={form} layout="vertical">
              <Form.Item
                label="Payment Method"
                name="payment_method"
                initialValue="credit_card"
              >
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="credit_card">
                      <Space>
                        <CreditCardOutlined />
                        <Text>Credit/Debit Card</Text>
                      </Space>
                    </Radio>
                    <Radio value="bank_transfer">
                      <Space>
                        <BankOutlined />
                        <Text>Bank Transfer (ACH)</Text>
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {paymentMethod === 'credit_card' && (
                <>
                  <Form.Item
                    label="Card Number"
                    name="card_number"
                    rules={[{ required: true, message: 'Please enter card number' }]}
                  >
                    <Input
                      placeholder="1234 5678 9012 3456"
                      prefix={<CreditCardOutlined />}
                      maxLength={19}
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Expiry Date"
                        name="expiry"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="MM/YY" maxLength={5} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="CVV"
                        name="cvv"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="123" maxLength={4} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Cardholder Name"
                    name="cardholder_name"
                    rules={[{ required: true, message: 'Please enter cardholder name' }]}
                  >
                    <Input placeholder="John Smith" />
                  </Form.Item>
                </>
              )}

              {paymentMethod === 'bank_transfer' && (
                <>
                  <Form.Item
                    label="Account Holder Name"
                    name="account_name"
                    rules={[{ required: true, message: 'Please enter account holder name' }]}
                  >
                    <Input placeholder="John Smith" />
                  </Form.Item>

                  <Form.Item
                    label="Routing Number"
                    name="routing_number"
                    rules={[{ required: true, message: 'Please enter routing number' }]}
                  >
                    <Input placeholder="123456789" maxLength={9} />
                  </Form.Item>

                  <Form.Item
                    label="Account Number"
                    name="account_number"
                    rules={[{ required: true, message: 'Please enter account number' }]}
                  >
                    <Input placeholder="1234567890" />
                  </Form.Item>

                  <Form.Item label="Account Type" name="account_type" initialValue="checking">
                    <Radio.Group>
                      <Radio value="checking">Checking</Radio>
                      <Radio value="savings">Savings</Radio>
                    </Radio.Group>
                  </Form.Item>
                </>
              )}
            </Form>

            <Alert
              message="Secure Payment"
              description="Your payment information is encrypted and secure. We never store your full card details."
              type="info"
              showIcon
              icon={<SafetyOutlined />}
            />
          </Space>
        )}
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal
        title={`Invoice Details - ${selectedInvoice?.invoice_number}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={[
          <Button key="download" icon={<DownloadOutlined />}>
            Download PDF
          </Button>,
          selectedInvoice && selectedInvoice.balance > 0 && (
            <Button
              key="pay"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                setDetailModalVisible(false);
                setPaymentModalVisible(true);
              }}
            >
              Pay ${selectedInvoice.balance.toFixed(2)}
            </Button>
          ),
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedInvoice && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Invoice Number" span={2}>
                <Text strong>{selectedInvoice.invoice_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Work Order">
                {selectedInvoice.work_order}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={getStatusColor(selectedInvoice.status)} text={selectedInvoice.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Issue Date">
                {selectedInvoice.issue_date}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">{selectedInvoice.due_date}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedInvoice.description}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <Text strong style={{ fontSize: 16 }}>
                Payment Summary
              </Text>
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <Text>Total Amount:</Text>
                  <Text strong>${selectedInvoice.total_amount.toFixed(2)}</Text>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <Text>Paid Amount:</Text>
                  <Text style={{ color: '#52c41a' }}>
                    ${selectedInvoice.paid_amount.toFixed(2)}
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <Text strong style={{ fontSize: 16 }}>
                    Balance Due:
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: 18,
                      color: selectedInvoice.balance > 0 ? '#ff4d4f' : '#52c41a',
                    }}
                  >
                    ${selectedInvoice.balance.toFixed(2)}
                  </Text>
                </div>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
