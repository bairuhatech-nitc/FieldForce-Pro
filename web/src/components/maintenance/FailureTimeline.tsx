import { Card, Timeline, Tag, Typography, Empty } from 'antd';
import {
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface FailureEvent {
  date: string;
  equipment_name: string;
  event_type: 'predicted_failure' | 'maintenance_due' | 'anomaly_detected' | 'maintenance_completed';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface FailureTimelineProps {
  events?: FailureEvent[];
  loading?: boolean;
}

const EVENT_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  predicted_failure: { color: 'red', icon: <WarningOutlined />, label: 'Predicted Failure' },
  maintenance_due: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Maintenance Due' },
  anomaly_detected: { color: 'gold', icon: <ExclamationCircleOutlined />, label: 'Anomaly' },
  maintenance_completed: { color: 'green', icon: <CheckCircleOutlined />, label: 'Completed' },
};

const DEMO_EVENTS: FailureEvent[] = [
  { date: '2026-02-25', equipment_name: 'Pump D-410', event_type: 'predicted_failure', description: 'High failure probability (85%). Immediate inspection recommended.', severity: 'critical' },
  { date: '2026-03-01', equipment_name: 'Compressor C-302', event_type: 'maintenance_due', description: 'Preventive maintenance overdue by 180+ days.', severity: 'high' },
  { date: '2026-03-15', equipment_name: 'Boiler F-102', event_type: 'anomaly_detected', description: 'Temperature readings 15% above normal baseline.', severity: 'medium' },
  { date: '2026-03-20', equipment_name: 'Compressor C-302', event_type: 'predicted_failure', description: 'Failure probability trending upward (62%).', severity: 'high' },
  { date: '2026-04-01', equipment_name: 'Generator B-205', event_type: 'maintenance_due', description: 'Scheduled preventive maintenance window.', severity: 'medium' },
  { date: '2026-01-28', equipment_name: 'Elevator E-001', event_type: 'maintenance_completed', description: 'Regular maintenance completed. Health score: 81%.', severity: 'low' },
];

export default function FailureTimeline({
  events = DEMO_EVENTS,
  loading = false,
}: FailureTimelineProps) {
  if (!events.length && !loading) {
    return (
      <Card title="Failure Timeline">
        <Empty description="No timeline events" />
      </Card>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card title="Predicted Failure Timeline" loading={loading}>
      <Timeline
        items={sortedEvents.map((event) => {
          const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.anomaly_detected;
          return {
            color: config.color,
            dot: config.icon,
            children: (
              <div>
                <div>
                  <Text strong>{event.equipment_name}</Text>
                  {' '}
                  <Tag color={config.color} style={{ fontSize: 11 }}>
                    {config.label}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {event.date}
                </Text>
                <br />
                <Text>{event.description}</Text>
              </div>
            ),
          };
        })}
      />
    </Card>
  );
}
