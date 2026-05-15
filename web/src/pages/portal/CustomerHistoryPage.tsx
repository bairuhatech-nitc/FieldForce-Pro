import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Timeline,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  Button,
  Drawer,
  Descriptions,
  Rate,
  Input,
  Modal,
  Form,
  message,
  DatePicker,
  Select,
  Statistic,
  Badge,
  Avatar,
} from 'antd';
import {
  CalendarOutlined,
  ToolOutlined,
  DollarOutlined,
  StarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Mock data - replace with actual API calls
const mockServiceHistory = [
  {
    id: '1',
    date: '2025-02-18',
    wo_number: 'WO-2025-003',
    type: 'Maintenance',
    service: 'HVAC System Annual Maintenance',
    description: 'Complete system inspection, filter replacement, and performance check',
    technician: {
      name: 'Mike Johnson',
      photo_url: null,
    },
    status: 'Completed',
    amount: 250.0,
    duration: '2 hours',
    location: '123 Main Street, San Francisco, CA 94102',
    rating: 5,
    review: 'Excellent service! Mike was professional and thorough.',
    services_performed: [
      'System inspection',
      'Air filter replacement',
      'Duct cleaning',
      'Performance testing',
    ],
  },
  {
    id: '2',
    date: '2025-01-15',
    wo_number: 'WO-2025-002',
    type: 'Repair',
    service: 'Water Heater Repair',
    description: 'Fixed leaking valve and replaced thermostat',
    technician: {
      name: 'Sarah Williams',
      photo_url: null,
    },
    status: 'Completed',
    amount: 350.0,
    duration: '1.5 hours',
    location: '123 Main Street, San Francisco, CA 94102',
    rating: 5,
    review: 'Quick and efficient. Problem solved!',
    services_performed: ['Valve replacement', 'Thermostat replacement', 'System testing'],
  },
  {
    id: '3',
    date: '2024-12-10',
    wo_number: 'WO-2024-089',
    type: 'Installation',
    service: 'Smart Thermostat Installation',
    description: 'Installed and configured Nest Learning Thermostat',
    technician: {
      name: 'Tom Davis',
      photo_url: null,
    },
    status: 'Completed',
    amount: 180.0,
    duration: '1 hour',
    location: '123 Main Street, San Francisco, CA 94102',
    rating: 4,
    review: 'Good service, explained everything clearly.',
    services_performed: [
      'Old thermostat removal',
      'New thermostat installation',
      'WiFi setup',
      'Customer training',
    ],
  },
  {
    id: '4',
    date: '2024-11-05',
    wo_number: 'WO-2024-067',
    type: 'Inspection',
    service: 'Pre-Winter HVAC Inspection',
    description: 'Comprehensive system check before winter season',
    technician: {
      name: 'Mike Johnson',
      photo_url: null,
    },
    status: 'Completed',
    amount: 120.0,
    duration: '1 hour',
    location: '123 Main Street, San Francisco, CA 94102',
    rating: 5,
    review: 'Great preventive service.',
    services_performed: ['Heating system check', 'Filter inspection', 'Safety check'],
  },
  {
    id: '5',
    date: '2024-08-22',
    wo_number: 'WO-2024-045',
    type: 'Maintenance',
    service: 'AC Tune-Up',
    description: 'Summer AC maintenance and optimization',
    technician: {
      name: 'Sarah Williams',
      photo_url: null,
    },
    status: 'Completed',
    amount: 200.0,
    duration: '1.5 hours',
    location: '123 Main Street, San Francisco, CA 94102',
    rating: 5,
    review: null,
    services_performed: ['Coolant check', 'Coil cleaning', 'Performance optimization'],
  },
];

const getServiceTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'Maintenance': 'blue',
    'Repair': 'orange',
    'Installation': 'green',
    'Inspection': 'purple',
  };
  return colors[type] || 'default';
};

const getServiceTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    'Maintenance': <ToolOutlined />,
    'Repair': <ToolOutlined />,
    'Installation': <CheckCircleOutlined />,
    'Inspection': <FileTextOutlined />,
  };
  return icons[type] || <ToolOutlined />;
};

interface ServiceRecord {
  id: string;
  date: string;
  wo_number: string;
  type: string;
  service: string;
  description: string;
  technician: {
    name: string;
    photo_url: string | null;
  };
  status: string;
  amount: number;
  duration: string;
  location: string;
  rating: number;
  review: string | null;
  services_performed: string[];
}

export default function CustomerHistoryPage() {
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string | undefined>(undefined);

  const [reviewForm] = Form.useForm();

  // Calculate statistics
  const totalServices = mockServiceHistory.length;
  const totalSpent = mockServiceHistory.reduce((sum, service) => sum + service.amount, 0);
  const averageRating =
    mockServiceHistory.reduce((sum, service) => sum + service.rating, 0) / totalServices;
  const lastServiceDate = mockServiceHistory[0]?.date;

  const handleViewDetails = (service: ServiceRecord) => {
    setSelectedService(service);
    setDetailDrawerVisible(true);
  };

  const handleLeaveReview = (service: ServiceRecord) => {
    setSelectedService(service);
    reviewForm.setFieldsValue({
      rating: service.rating || 5,
      review: service.review || '',
    });
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = () => {
    reviewForm.validateFields().then((values) => {
      message.success('Thank you for your review!');
      setReviewModalVisible(false);
      setSelectedService(null);
      reviewForm.resetFields();
    });
  };

  // Filter service history
  const filteredHistory = mockServiceHistory.filter((service) => {
    const matchesSearch =
      searchText === '' ||
      service.service.toLowerCase().includes(searchText.toLowerCase()) ||
      service.wo_number.toLowerCase().includes(searchText.toLowerCase()) ||
      service.description.toLowerCase().includes(searchText.toLowerCase());

    const matchesType = !serviceTypeFilter || service.type === serviceTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div>
      <PageHeader
        title="Service History"
        subtitle="View your complete service history and past appointments"
      />

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Services"
              value={totalServices}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Spent"
              value={totalSpent}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Average Rating"
              value={averageRating}
              precision={1}
              suffix="/ 5"
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Last Service
              </Text>
              <Text strong style={{ fontSize: 16 }}>
                {dayjs(lastServiceDate).format('MMM DD, YYYY')}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Input
              placeholder="Search by service, work order, or description"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              placeholder="Filter by service type"
              style={{ width: '100%' }}
              value={serviceTypeFilter}
              onChange={setServiceTypeFilter}
              allowClear
            >
              <Select.Option value="Maintenance">Maintenance</Select.Option>
              <Select.Option value="Repair">Repair</Select.Option>
              <Select.Option value="Installation">Installation</Select.Option>
              <Select.Option value="Inspection">Inspection</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Service History Timeline */}
      <Card title={`Service History (${filteredHistory.length} records)`}>
        {filteredHistory.length === 0 ? (
          <Empty description="No service history found" />
        ) : (
          <Timeline mode="left">
            {filteredHistory.map((service) => (
              <Timeline.Item
                key={service.id}
                label={
                  <Space direction="vertical" size={0}>
                    <Text strong>{dayjs(service.date).format('MMM DD, YYYY')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {service.duration}
                    </Text>
                  </Space>
                }
                dot={
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#1890ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 16,
                    }}
                  >
                    {getServiceTypeIcon(service.type)}
                  </div>
                }
              >
                <Card
                  size="small"
                  hoverable
                  onClick={() => handleViewDetails(service)}
                  style={{ cursor: 'pointer' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Space direction="vertical" size={0}>
                        <Space>
                          <Text strong style={{ fontSize: 16 }}>
                            {service.service}
                          </Text>
                          <Tag color={getServiceTypeColor(service.type)}>{service.type}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {service.wo_number}
                        </Text>
                      </Space>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                          ${service.amount.toFixed(2)}
                        </Text>
                        <div>
                          <Badge status="success" text={service.status} />
                        </div>
                      </div>
                    </div>

                    <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      {service.description}
                    </Paragraph>

                    <Divider style={{ margin: '8px 0' }} />

                    <Row gutter={16}>
                      <Col span={12}>
                        <Space>
                          <Avatar
                            size="small"
                            style={{ background: '#1890ff' }}
                            icon={<UserOutlined />}
                          />
                          <div>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                              Technician
                            </Text>
                            <Text strong style={{ fontSize: 12 }}>
                              {service.technician.name}
                            </Text>
                          </div>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                            Your Rating
                          </Text>
                          <Rate disabled value={service.rating} style={{ fontSize: 14 }} />
                        </div>
                      </Col>
                    </Row>

                    <Space style={{ marginTop: 8 }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(service);
                        }}
                      >
                        View Details
                      </Button>
                      {!service.review && (
                        <Button
                          type="link"
                          size="small"
                          icon={<StarOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveReview(service);
                          }}
                        >
                          Leave Review
                        </Button>
                      )}
                      <Button type="link" size="small" icon={<CalendarOutlined />}>
                        Book Again
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      {/* Loyalty Message */}
      <Card style={{ marginTop: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row align="middle" gutter={16}>
          <Col>
            <HeartOutlined style={{ fontSize: 48, color: 'white' }} />
          </Col>
          <Col flex={1}>
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0, color: 'white' }}>
                Thank You for Being a Valued Customer!
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                You've been with us for {totalServices} services. We appreciate your trust and loyalty.
              </Text>
            </Space>
          </Col>
          <Col>
            <Button type="primary" size="large" style={{ background: 'white', color: '#667eea' }}>
              Schedule Next Service
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Service Detail Drawer */}
      <Drawer
        title="Service Details"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedService(null);
        }}
      >
        {selectedService && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header */}
            <div>
              <Space>
                <Tag color={getServiceTypeColor(selectedService.type)} style={{ fontSize: 14 }}>
                  {selectedService.type}
                </Tag>
                <Badge status="success" text={selectedService.status} />
              </Space>
              <Title level={4} style={{ marginTop: 8 }}>
                {selectedService.service}
              </Title>
              <Text type="secondary">{selectedService.description}</Text>
            </div>

            <Divider />

            {/* Details */}
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Work Order">
                <Text strong>{selectedService.wo_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedService.date).format('MMMM DD, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">{selectedService.duration}</Descriptions.Item>
              <Descriptions.Item label="Technician">
                <Space>
                  <Avatar size="small" style={{ background: '#1890ff' }} icon={<UserOutlined />} />
                  <Text strong>{selectedService.technician.name}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                <Space>
                  <EnvironmentOutlined style={{ color: '#1890ff' }} />
                  <Text>{selectedService.location}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  ${selectedService.amount.toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Services Performed */}
            <div>
              <Text strong style={{ fontSize: 16 }}>
                Services Performed
              </Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {selectedService.services_performed.map((item, index) => (
                  <li key={index}>
                    <Text>{item}</Text>
                  </li>
                ))}
              </ul>
            </div>

            <Divider />

            {/* Rating & Review */}
            <div>
              <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                Your Rating
              </Text>
              <Rate disabled value={selectedService.rating} />
              {selectedService.review && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 8,
                  }}
                >
                  <Text>{selectedService.review}</Text>
                </div>
              )}
              {!selectedService.review && (
                <Button
                  type="link"
                  icon={<StarOutlined />}
                  onClick={() => {
                    setDetailDrawerVisible(false);
                    handleLeaveReview(selectedService);
                  }}
                  style={{ paddingLeft: 0, marginTop: 8 }}
                >
                  Leave a review
                </Button>
              )}
            </div>

            <Divider />

            {/* Actions */}
            <Space style={{ width: '100%' }} direction="vertical">
              <Button type="primary" block icon={<CalendarOutlined />}>
                Book Similar Service
              </Button>
              <Button block icon={<FileTextOutlined />}>
                Download Invoice
              </Button>
            </Space>
          </Space>
        )}
      </Drawer>

      {/* Review Modal */}
      <Modal
        title="Leave a Review"
        open={reviewModalVisible}
        onOk={handleReviewSubmit}
        onCancel={() => {
          setReviewModalVisible(false);
          setSelectedService(null);
          reviewForm.resetFields();
        }}
        okText="Submit Review"
        width={500}
      >
        {selectedService && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                {selectedService.service}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(selectedService.date).format('MMMM DD, YYYY')} •{' '}
                {selectedService.technician.name}
              </Text>
            </div>

            <Form form={reviewForm} layout="vertical">
              <Form.Item
                label="Rating"
                name="rating"
                rules={[{ required: true, message: 'Please provide a rating' }]}
              >
                <Rate style={{ fontSize: 32 }} />
              </Form.Item>

              <Form.Item
                label="Review"
                name="review"
                rules={[{ required: true, message: 'Please write a review' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Share your experience with this service..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>

            <Alert
              message="Your review helps us improve"
              description="Thank you for taking the time to share your feedback. Your review will help us serve you better."
              type="info"
              showIcon
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
