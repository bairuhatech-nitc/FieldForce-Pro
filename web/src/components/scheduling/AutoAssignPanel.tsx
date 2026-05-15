import { useState } from 'react';
import {
  Card,
  Button,
  DatePicker,
  Select,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  Divider,
  Alert,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAutoAssign } from '@/hooks/use-scheduling';
import type { AutoAssignCandidate } from '@/api/scheduling.api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface AutoAssignPanelProps {
  workOrderId?: string;
  onAssigned?: (agentId: string, agentName: string) => void;
}

export default function AutoAssignPanel({ workOrderId, onAssigned }: AutoAssignPanelProps) {
  const [woId, setWoId] = useState(workOrderId || '');
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(null);
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [territory, setTerritory] = useState('');

  const autoAssign = useAutoAssign();
  const result = autoAssign.data?.data;

  const handleAutoAssign = () => {
    if (!woId || !startTime || !endTime) return;
    autoAssign.mutate({
      work_order_id: woId,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      required_skills: skills.length > 0 ? skills : undefined,
      territory: territory || undefined,
    });
  };

  const handleSelectCandidate = (candidate: AutoAssignCandidate) => {
    if (onAssigned) {
      onAssigned(candidate.agent_id, candidate.agent_name);
    }
  };

  const candidateColumns: ColumnsType<AutoAssignCandidate> = [
    {
      title: 'Technician',
      dataIndex: 'agent_name',
      key: 'agent_name',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Available',
      dataIndex: 'available',
      key: 'available',
      width: 100,
      render: (available: boolean) =>
        available ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Yes</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">No</Tag>
        ),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => (
        <Tag color={score >= 50 ? 'green' : score >= 30 ? 'gold' : 'red'}>{score}</Tag>
      ),
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Details',
      dataIndex: 'reasons',
      key: 'reasons',
      render: (reasons: string[]) => (
        <Space direction="vertical" size={0}>
          {reasons.map((r, i) => (
            <Text key={i} type="secondary" style={{ fontSize: 12 }}>{r}</Text>
          ))}
        </Space>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, record) =>
        record.available ? (
          <Button size="small" type="primary" onClick={() => handleSelectCandidate(record)}>
            Assign
          </Button>
        ) : null,
    },
  ];

  const skillOptions = [
    { value: 'hvac', label: 'HVAC' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'appliance', label: 'Appliance' },
    { value: 'general', label: 'General' },
  ];

  const territoryOptions = [
    { value: 'north', label: 'North' },
    { value: 'south', label: 'South' },
    { value: 'east', label: 'East' },
    { value: 'west', label: 'West' },
    { value: 'central', label: 'Central' },
  ];

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Auto-Assign Technician</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {!workOrderId && (
          <Input
            placeholder="Work Order ID"
            value={woId}
            onChange={(e) => setWoId(e.target.value)}
          />
        )}

        <Space wrap>
          <DatePicker
            showTime
            placeholder="Scheduled Start"
            value={startTime}
            onChange={setStartTime}
            style={{ width: 200 }}
          />
          <DatePicker
            showTime
            placeholder="Scheduled End"
            value={endTime}
            onChange={setEndTime}
            style={{ width: 200 }}
          />
        </Space>

        <Space wrap>
          <Select
            mode="multiple"
            placeholder="Required Skills"
            options={skillOptions}
            value={skills}
            onChange={setSkills}
            style={{ minWidth: 200 }}
            allowClear
          />
          <Select
            placeholder="Territory"
            options={territoryOptions}
            value={territory || undefined}
            onChange={(v) => setTerritory(v || '')}
            style={{ width: 150 }}
            allowClear
          />
        </Space>

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={autoAssign.isPending}
          disabled={!woId || !startTime || !endTime}
          onClick={handleAutoAssign}
        >
          Find Best Technician
        </Button>

        {autoAssign.isPending && <Spin tip="Evaluating candidates..." />}

        {result && (
          <>
            <Divider style={{ margin: '8px 0' }} />

            {result.assigned ? (
              <Alert
                type="success"
                message={`Recommended: ${result.agent_name}`}
                description={`Score: ${result.score} — This technician is the best match based on availability, skills, territory, and workload.`}
                showIcon
              />
            ) : (
              <Alert
                type="warning"
                message="No available technician found"
                description="All technicians have conflicts or are unavailable for this time slot. Consider rescheduling or review the candidates below."
                showIcon
              />
            )}

            {result.candidates.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 8, marginBottom: 4 }}>
                  All Candidates ({result.candidates.length})
                </Title>
                <Table
                  columns={candidateColumns}
                  dataSource={result.candidates}
                  rowKey="agent_id"
                  size="small"
                  pagination={false}
                  rowClassName={(record) =>
                    result.agent_id === record.agent_id ? 'ant-table-row-selected' : ''
                  }
                />
              </>
            )}
          </>
        )}
      </Space>
    </Card>
  );
}
