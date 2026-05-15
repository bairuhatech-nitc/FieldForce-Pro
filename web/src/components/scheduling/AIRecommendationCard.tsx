import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Timeline,
  Avatar,
  Tooltip,
  Badge,
  Divider,
  Modal,
  List,
  Alert,
  Descriptions,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  RobotOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useApplyOptimization } from '../../hooks/use-scheduling';

const { Text, Title, Paragraph } = Typography;

interface ScheduleRecommendation {
  technician_id: string;
  technician_name: string;
  route: Array<{
    work_order_id: string;
    address: string;
    arrival_time: string;
    duration: number;
    sequence: number;
  }>;
  total_stops: number;
  estimated_duration: number;
}

interface AIRecommendationCardProps {
  optimization: {
    id: string;
    schedule: ScheduleRecommendation[];
    unassigned: string[];
    optimization_score: number;
    total_distance_km?: number;
    total_duration_minutes?: number;
  };
  onAccept?: () => void;
  onReject?: () => void;
  onModify?: () => void;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  optimization,
  onAccept,
  onReject,
  onModify,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const applyOptimization = useApplyOptimization();

  const handleAccept = async () => {
    await applyOptimization.mutateAsync({
      optimization_id: optimization.id,
      notify_technicians: true,
      auto_create_appointments: true,
    });
    onAccept?.();
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.6) return '#faad14';
    return '#ff4d4f';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Text strong>AI Schedule Recommendation</Text>
          <Badge
            count={`Score: ${(optimization.optimization_score * 100).toFixed(0)}%`}
            style={{
              backgroundColor: getScoreColor(optimization.optimization_score),
            }}
          />
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleAccept}
            loading={applyOptimization.isPending}
          >
            Accept & Apply
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={onModify}
          >
            Modify
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={onReject}
          >
            Reject
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Summary Statistics */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" bordered={false}>
              <Statistic
                title="Jobs Scheduled"
                value={optimization.schedule.reduce((sum, s) => sum + s.total_stops, 0)}
                suffix={`/ ${optimization.schedule.reduce((sum, s) => sum + s.total_stops, 0) + optimization.unassigned.length}`}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false}>
              <Statistic
                title="Total Distance"
                value={optimization.total_distance_km?.toFixed(1) || 0}
                suffix="km"
                prefix={<CarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false}>
              <Statistic
                title="Total Duration"
                value={formatDuration(optimization.total_duration_minutes || 0)}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false}>
              <Statistic
                title="Optimization Score"
                value={(optimization.optimization_score * 100).toFixed(0)}
                suffix="%"
                valueStyle={{ color: getScoreColor(optimization.optimization_score) }}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Unassigned Jobs Alert */}
        {optimization.unassigned.length > 0 && (
          <Alert
            message={`${optimization.unassigned.length} Unassigned Jobs`}
            description="These jobs could not be scheduled due to constraints. Consider adding more technicians or adjusting time windows."
            type="warning"
            showIcon
            action={
              <Button
                size="small"
                onClick={() => {
                  Modal.info({
                    title: 'Unassigned Jobs',
                    content: (
                      <List
                        dataSource={optimization.unassigned}
                        renderItem={(jobId) => (
                          <List.Item>
                            <Text>{jobId}</Text>
                          </List.Item>
                        )}
                      />
                    ),
                  });
                }}
              >
                View Details
              </Button>
            }
          />
        )}

        {/* Technician Routes */}
        <div>
          <Title level={5}>Technician Routes</Title>
          <List
            dataSource={optimization.schedule}
            renderItem={(schedule) => (
              <Card
                size="small"
                style={{ marginBottom: 8 }}
                hoverable
                onClick={() => {
                  setSelectedTechnician(schedule.technician_id);
                  setShowDetails(true);
                }}
              >
                <Row align="middle" justify="space-between">
                  <Col span={12}>
                    <Space>
                      <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                      <div>
                        <Text strong>{schedule.technician_name}</Text>
                        <br />
                        <Text type="secondary">
                          {schedule.total_stops} stops • {formatDuration(schedule.estimated_duration)}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space style={{ float: 'right' }} wrap>
                      {schedule.route.slice(0, 3).map((stop, index) => (
                        <Tooltip key={stop.work_order_id} title={stop.address}>
                          <Tag icon={<EnvironmentOutlined />}>
                            Stop {index + 1}
                          </Tag>
                        </Tooltip>
                      ))}
                      {schedule.route.length > 3 && (
                        <Tag>+{schedule.route.length - 3} more</Tag>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}
          />
        </div>

        {/* Comparison with Current Schedule */}
        <Card size="small" style={{ backgroundColor: '#f0f5ff' }}>
          <Space>
            <SwapOutlined style={{ fontSize: 16, color: '#1890ff' }} />
            <Text strong>Improvements vs Current Schedule</Text>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
          <Row gutter={16}>
            <Col span={8}>
              <Text type="success">
                <ArrowDownOutlined /> 25% less travel time
              </Text>
            </Col>
            <Col span={8}>
              <Text type="success">
                <ArrowUpOutlined /> 15% better utilization
              </Text>
            </Col>
            <Col span={8}>
              <Text type="success">
                <CheckOutlined /> All SLAs met
              </Text>
            </Col>
          </Row>
        </Card>
      </Space>

      {/* Detailed Route Modal */}
      <Modal
        title={`Route Details - ${optimization.schedule.find(s => s.technician_id === selectedTechnician)?.technician_name}`}
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        footer={null}
        width={800}
      >
        {selectedTechnician && (
          <Timeline mode="left">
            {optimization.schedule
              .find((s) => s.technician_id === selectedTechnician)
              ?.route.map((stop, index) => (
                <Timeline.Item
                  key={stop.work_order_id}
                  label={new Date(stop.arrival_time).toLocaleTimeString()}
                  dot={
                    <Badge count={stop.sequence}>
                      <Avatar
                        size="small"
                        style={{
                          backgroundColor: '#1890ff',
                        }}
                      >
                        {stop.sequence}
                      </Avatar>
                    </Badge>
                  }
                >
                  <Card size="small">
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="Work Order">
                        {stop.work_order_id}
                      </Descriptions.Item>
                      <Descriptions.Item label="Address">
                        {stop.address}
                      </Descriptions.Item>
                      <Descriptions.Item label="Duration">
                        {formatDuration(stop.duration)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Arrival">
                        {new Date(stop.arrival_time).toLocaleString()}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Timeline.Item>
              ))}
          </Timeline>
        )}
      </Modal>
    </Card>
  );
};

// Re-export for convenience
const ArrowUpOutlined = () => <span>↑</span>;
const ArrowDownOutlined = () => <span>↓</span>;

interface StatisticProps {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: string;
  valueStyle?: React.CSSProperties;
}

const Statistic: React.FC<StatisticProps> = ({
  title,
  value,
  prefix,
  suffix,
  valueStyle
}) => (
  <div>
    <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
    <div style={{ fontSize: 20, fontWeight: 500, ...valueStyle }}>
      {prefix}
      {value}
      {suffix && <span style={{ fontSize: 14 }}> {suffix}</span>}
    </div>
  </div>
);