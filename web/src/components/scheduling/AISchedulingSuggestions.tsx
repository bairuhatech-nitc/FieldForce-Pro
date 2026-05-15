import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  Statistic,
  Row,
  Col,
  Spin,
  Tooltip,
  Badge,
  Modal,
  Switch,
  InputNumber,
  Progress,
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useOptimizeSchedule, useOptimizationStatus } from '../../hooks/use-scheduling';
import { WorkOrderInput, TechnicianInput } from '../../api/scheduling.api';

const { Title, Text, Paragraph } = Typography;

interface AISchedulingSuggestionsProps {
  workOrders: WorkOrderInput[];
  technicians: TechnicianInput[];
  onOptimizationComplete?: (result: any) => void;
}

export const AISchedulingSuggestions: React.FC<AISchedulingSuggestionsProps> = ({
  workOrders,
  technicians,
  onOptimizationComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizationSettings, setOptimizationSettings] = useState({
    optimization_time_limit: 30,
    use_traffic_data: true,
    allow_overtime: false,
    buffer_percentage: 15,
  });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const optimizeSchedule = useOptimizeSchedule();
  const { data: taskStatus } = useOptimizationStatus(currentTaskId, !!currentTaskId);

  const handleOptimize = async () => {
    if (!workOrders.length || !technicians.length) {
      return;
    }

    const result = await optimizeSchedule.mutateAsync({
      work_orders: workOrders,
      technicians: technicians,
      constraints: optimizationSettings,
    });

    // Check if it's a large optimization that runs in background
    if (result.data?.task_id) {
      setCurrentTaskId(result.data.task_id);
    } else {
      onOptimizationComplete?.(result.data);
    }
  };

  // Calculate optimization potential
  const calculateOptimizationPotential = () => {
    if (!workOrders.length) return 0;

    // Simulate calculation based on current schedule efficiency
    const totalJobs = workOrders.length;
    const techCount = technicians.length;
    const avgJobsPerTech = totalJobs / techCount;

    // If jobs are unevenly distributed or too many per tech, high potential
    if (avgJobsPerTech > 8) return 85;
    if (avgJobsPerTech > 6) return 60;
    return 30;
  };

  const optimizationPotential = calculateOptimizationPotential();

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Text strong>AI Scheduling Assistant</Text>
          <Badge
            count={optimizationPotential > 60 ? 'High Potential' : optimizationPotential > 30 ? 'Medium' : 'Low'}
            style={{
              backgroundColor: optimizationPotential > 60 ? '#52c41a' : optimizationPotential > 30 ? '#faad14' : '#d9d9d9',
            }}
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Settings">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(true)}
              size="small"
            />
          </Tooltip>
          <Button
            type={isExpanded ? 'default' : 'text'}
            onClick={() => setIsExpanded(!isExpanded)}
            size="small"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Quick Stats */}
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Jobs to Schedule"
              value={workOrders.length}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Available Technicians"
              value={technicians.length}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Optimization Potential"
              value={optimizationPotential}
              suffix="%"
              valueStyle={{ color: optimizationPotential > 60 ? '#3f8600' : undefined }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Est. Time Savings"
              value={Math.round((optimizationPotential / 100) * 45)}
              suffix="min"
              prefix={<ThunderboltOutlined />}
            />
          </Col>
        </Row>

        {isExpanded && (
          <>
            {/* AI Insights */}
            <Alert
              message="AI Recommendations"
              description={
                <Space direction="vertical">
                  {optimizationPotential > 60 && (
                    <Text>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} /> High optimization potential detected.
                      AI can reduce travel time by up to 30% and improve technician utilization.
                    </Text>
                  )}
                  {workOrders.length > technicians.length * 8 && (
                    <Text>
                      <WarningOutlined style={{ color: '#faad14' }} /> Workload exceeds capacity.
                      Consider adding {Math.ceil((workOrders.length - technicians.length * 8) / 8)} more technicians.
                    </Text>
                  )}
                  {optimizationSettings.use_traffic_data && (
                    <Text>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} /> Real-time traffic data will be used
                      to optimize routes and avoid congestion.
                    </Text>
                  )}
                </Space>
              }
              type={optimizationPotential > 60 ? 'success' : 'info'}
              showIcon
            />

            {/* Optimization Settings Preview */}
            <Space wrap>
              <Tag icon={<ClockCircleOutlined />}>
                {optimizationSettings.optimization_time_limit}s time limit
              </Tag>
              <Tag icon={<ThunderboltOutlined />} color={optimizationSettings.use_traffic_data ? 'green' : 'default'}>
                Traffic: {optimizationSettings.use_traffic_data ? 'ON' : 'OFF'}
              </Tag>
              <Tag icon={<TeamOutlined />} color={optimizationSettings.allow_overtime ? 'orange' : 'default'}>
                Overtime: {optimizationSettings.allow_overtime ? 'Allowed' : 'Normal Hours'}
              </Tag>
              <Tag icon={<InfoCircleOutlined />}>
                {optimizationSettings.buffer_percentage}% buffer
              </Tag>
            </Space>

            {/* Progress indicator for background optimization */}
            {currentTaskId && taskStatus && (
              <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Optimization in Progress...</Text>
                  <Progress
                    percent={taskStatus.progress || 0}
                    status={taskStatus.status === 'completed' ? 'success' : 'active'}
                  />
                  {taskStatus.status === 'completed' && (
                    <Alert
                      message="Optimization Complete!"
                      description={`Successfully optimized ${taskStatus.result?.assigned_jobs || 0} jobs`}
                      type="success"
                      showIcon
                    />
                  )}
                </Space>
              </Card>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Space>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleOptimize}
            loading={optimizeSchedule.isPending || !!currentTaskId}
            disabled={!workOrders.length || !technicians.length}
            size="large"
          >
            Optimize with AI
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={() => window.location.reload()}
          >
            Refresh Data
          </Button>
        </Space>
      </Space>

      {/* Settings Modal */}
      <Modal
        title="AI Optimization Settings"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        onOk={() => setShowSettings(false)}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Optimization Time Limit (seconds)</Text>
            <InputNumber
              min={5}
              max={300}
              value={optimizationSettings.optimization_time_limit}
              onChange={(value) =>
                setOptimizationSettings((prev) => ({
                  ...prev,
                  optimization_time_limit: value || 30,
                }))
              }
              style={{ width: '100%', marginTop: 8 }}
            />
            <Text type="secondary">
              Longer time limits allow for better optimization but take more time
            </Text>
          </div>

          <div>
            <Space>
              <Text strong>Use Real-Time Traffic Data</Text>
              <Switch
                checked={optimizationSettings.use_traffic_data}
                onChange={(checked) =>
                  setOptimizationSettings((prev) => ({
                    ...prev,
                    use_traffic_data: checked,
                  }))
                }
              />
            </Space>
            <br />
            <Text type="secondary">
              Consider current traffic conditions when optimizing routes
            </Text>
          </div>

          <div>
            <Space>
              <Text strong>Allow Overtime</Text>
              <Switch
                checked={optimizationSettings.allow_overtime}
                onChange={(checked) =>
                  setOptimizationSettings((prev) => ({
                    ...prev,
                    allow_overtime: checked,
                  }))
                }
              />
            </Space>
            <br />
            <Text type="secondary">
              Allow scheduling beyond normal working hours if needed
            </Text>
          </div>

          <div>
            <Text strong>Buffer Percentage (%)</Text>
            <InputNumber
              min={0}
              max={50}
              value={optimizationSettings.buffer_percentage}
              onChange={(value) =>
                setOptimizationSettings((prev) => ({
                  ...prev,
                  buffer_percentage: value || 15,
                }))
              }
              style={{ width: '100%', marginTop: 8 }}
            />
            <Text type="secondary">
              Extra time buffer between appointments for delays
            </Text>
          </div>
        </Space>
      </Modal>
    </Card>
  );
};