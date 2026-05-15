import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Timeline,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  Spin,
  Alert,
  Descriptions,
  Steps,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Title, Text, Paragraph } = Typography;

// Mock data - replace with actual API calls
const getMockWorkOrder = (woNumber: string) => {
  if (!woNumber) return null;

  return {
    wo_number: woNumber,
    summary: 'HVAC System Maintenance',
    description: 'Annual maintenance check for central air conditioning system',
    status: 'In Progress',
    priority: 'Medium',
    scheduled_date: '2025-02-18',
    scheduled_time: '10:00 AM - 12:00 PM',
    customer: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
    },
    service_location: {
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
    },
    assigned_agent: {
      name: 'Mike Johnson',
      phone: '(555) 987-6543',
      photo_url: null,
    },
    current_status: {
      step: 2,
      total_steps: 5,
    },
    timeline: [
      {
        time: '2025-02-15 09:30 AM',
        title: 'Work Order Created',
        description: 'Service request submitted and work order created',
        status: 'completed',
      },
      {
        time: '2025-02-15 02:15 PM',
        title: 'Scheduled',
        description: 'Appointment scheduled for Feb 18, 10:00 AM',
        status: 'completed',
      },
      {
        time: '2025-02-18 09:45 AM',
        title: 'Agent En Route',
        description: 'Mike Johnson is on the way to your location',
        status: 'current',
      },
      {
        time: 'Pending',
        title: 'Service In Progress',
        description: 'Technician working on your service request',
        status: 'pending',
      },
      {
        time: 'Pending',
        title: 'Completed',
        description: 'Service completed and signed off',
        status: 'pending',
      },
    ],
    services: [
      { name: 'HVAC Inspection', duration: '30 min' },
      { name: 'Filter Replacement', duration: '15 min' },
      { name: 'System Cleaning', duration: '45 min' },
    ],
    estimated_total: 250.0,
  };
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'New': 'blue',
    'Scheduled': 'cyan',
    'In Progress': 'orange',
    'Completed': 'green',
    'Cancelled': 'red',
  };
  return colors[status] || 'default';
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'Low': 'green',
    'Medium': 'orange',
    'High': 'red',
    'Critical': 'purple',
  };
  return colors[priority] || 'default';
};

export default function CustomerTrackingPage() {
  const [searchValue, setSearchValue] = useState('');
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!searchValue.trim()) return;

    setLoading(true);
    setSearched(true);

    // Simulate API call
    setTimeout(() => {
      const result = getMockWorkOrder(searchValue);
      setWorkOrder(result);
      setLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div>
      <PageHeader
        title="Track Your Service"
        subtitle="Enter your work order number to track service status"
      />

      {/* Search Section */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              Track Your Work Order
            </Title>
            <Paragraph type="secondary">
              Enter the work order number you received via email or SMS to track your service in real-time.
            </Paragraph>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={18} md={20}>
              <Input
                size="large"
                placeholder="Enter work order number (e.g., WO-2025-001)"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </Col>
            <Col xs={24} sm={6} md={4}>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleSearch}
                loading={loading}
              >
                Track Order
              </Button>
            </Col>
          </Row>

          <Alert
            message="Where to find your work order number?"
            description="Your work order number was sent to you via email and SMS when your service was scheduled. It starts with 'WO-' followed by the year and order number."
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading work order details...</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Not Found State */}
      {!loading && searched && !workOrder && (
        <Card>
          <Empty
            description={
              <Space direction="vertical" size="small">
                <Text strong>Work Order Not Found</Text>
                <Text type="secondary">
                  We couldn't find a work order with number "{searchValue}".
                  <br />
                  Please check the number and try again.
                </Text>
              </Space>
            }
          />
        </Card>
      )}

      {/* Work Order Details */}
      {!loading && workOrder && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Status Overview */}
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Space size="middle" wrap>
                  <Title level={3} style={{ margin: 0 }}>
                    {workOrder.summary}
                  </Title>
                  <Tag color={getStatusColor(workOrder.status)} style={{ fontSize: 14 }}>
                    {workOrder.status}
                  </Tag>
                  <Tag color={getPriorityColor(workOrder.priority)}>{workOrder.priority} Priority</Tag>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  Work Order: <Text strong>{workOrder.wo_number}</Text>
                </Paragraph>
              </div>

              <Divider style={{ margin: 0 }} />

              {/* Progress Steps */}
              <Steps
                current={workOrder.current_status.step}
                items={[
                  { title: 'Created', icon: <FileTextOutlined /> },
                  { title: 'Scheduled', icon: <CalendarOutlined /> },
                  { title: 'En Route', icon: <EnvironmentOutlined /> },
                  { title: 'In Progress', icon: <ToolOutlined /> },
                  { title: 'Completed', icon: <CheckCircleOutlined /> },
                ]}
              />
            </Space>
          </Card>

          <Row gutter={16}>
            {/* Left Column */}
            <Col xs={24} lg={12}>
              {/* Schedule Information */}
              <Card title="Schedule" style={{ marginBottom: 16 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Space>
                      <CalendarOutlined style={{ color: '#1890ff' }} />
                      <div>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          Scheduled Date
                        </Text>
                        <Text strong>{workOrder.scheduled_date}</Text>
                      </div>
                    </Space>
                  </div>
                  <div>
                    <Space>
                      <ClockCircleOutlined style={{ color: '#1890ff' }} />
                      <div>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          Time Window
                        </Text>
                        <Text strong>{workOrder.scheduled_time}</Text>
                      </div>
                    </Space>
                  </div>
                </Space>
              </Card>

              {/* Assigned Technician */}
              <Card
                title="Your Technician"
                style={{ marginBottom: 16 }}
                extra={<Badge status="processing" text="En Route" />}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#1890ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 20,
                        fontWeight: 'bold',
                      }}
                    >
                      {workOrder.assigned_agent.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <Text strong style={{ display: 'block' }}>
                        {workOrder.assigned_agent.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Licensed Technician
                      </Text>
                    </div>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <PhoneOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                      <Text>{workOrder.assigned_agent.phone}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Call your technician if you have any questions
                    </Text>
                  </Space>
                </Space>
              </Card>

              {/* Services */}
              <Card title="Services Scheduled">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {workOrder.services.map((service: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                      }}
                    >
                      <Text>{service.name}</Text>
                      <Text type="secondary">{service.duration}</Text>
                    </div>
                  ))}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Estimated Total</Text>
                    <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                      ${workOrder.estimated_total.toFixed(2)}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Right Column */}
            <Col xs={24} lg={12}>
              {/* Service Location */}
              <Card title="Service Location" style={{ marginBottom: 16 }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <EnvironmentOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    <Text strong>Address</Text>
                  </div>
                  <div style={{ paddingLeft: 24 }}>
                    <Text>{workOrder.service_location.address}</Text>
                    <br />
                    <Text>
                      {workOrder.service_location.city}, {workOrder.service_location.state}{' '}
                      {workOrder.service_location.zip_code}
                    </Text>
                  </div>
                </Space>
              </Card>

              {/* Timeline */}
              <Card title="Activity Timeline">
                <Timeline
                  items={workOrder.timeline.map((item: any) => ({
                    color:
                      item.status === 'completed'
                        ? 'green'
                        : item.status === 'current'
                        ? 'blue'
                        : 'gray',
                    dot:
                      item.status === 'completed' ? (
                        <CheckCircleOutlined style={{ fontSize: 16 }} />
                      ) : item.status === 'current' ? (
                        <ClockCircleOutlined style={{ fontSize: 16 }} />
                      ) : undefined,
                    children: (
                      <div>
                        <Text strong style={{ display: 'block' }}>
                          {item.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          {item.description}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.time}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              </Card>
            </Col>
          </Row>

          {/* Contact Information */}
          <Card>
            <Alert
              message="Need Help?"
              description={
                <Space direction="vertical" size="small">
                  <Text>If you have any questions or need to reschedule, please contact us:</Text>
                  <Space size="large" wrap>
                    <div>
                      <PhoneOutlined style={{ marginRight: 8 }} />
                      <Text strong>(555) 123-4567</Text>
                    </div>
                    <div>
                      <MailOutlined style={{ marginRight: 8 }} />
                      <Text strong>support@fieldforce.com</Text>
                    </div>
                  </Space>
                </Space>
              }
              type="info"
              showIcon
            />
          </Card>
        </Space>
      )}
    </div>
  );
}
