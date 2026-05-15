import { useState } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Space, Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CarOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatDateTime } from '@/utils/format-date';
import { formatCurrency } from '@/utils/format-currency';

const { RangePicker } = DatePicker;

interface MileageStats {
  total_distance_km: number;
  total_fuel_liters: number;
  total_fuel_cost: number;
  average_fuel_efficiency: number;
  total_trips: number;
  average_trip_distance: number;
}

interface TripRecord {
  id: string;
  trip_id: string;
  technician_name: string;
  vehicle: string;
  date: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  fuel_consumed_liters?: number;
  fuel_cost?: number;
  fuel_efficiency?: number;
  purpose: string;
}

interface MileageFuelReportsComponentProps {
  technicianId?: string;
  vehicleId?: string;
}

export default function MileageFuelReportsComponent({
  technicianId,
  vehicleId,
}: MileageFuelReportsComponentProps) {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [selectedTechnician, setSelectedTechnician] = useState<string | undefined>(technicianId);
  const [selectedVehicle, setSelectedVehicle] = useState<string | undefined>(vehicleId);

  // Mock data - replace with actual API calls
  const stats: MileageStats = {
    total_distance_km: 2845.6,
    total_fuel_liters: 285.4,
    total_fuel_cost: 456.78,
    average_fuel_efficiency: 10.0,
    total_trips: 142,
    average_trip_distance: 20.04,
  };

  const trips: TripRecord[] = [
    {
      id: '1',
      trip_id: 'TRIP-001',
      technician_name: 'John Doe',
      vehicle: 'Van 123',
      date: '2024-02-17T08:30:00Z',
      start_location: 'Office',
      end_location: '123 Main St',
      distance_km: 25.5,
      fuel_consumed_liters: 2.8,
      fuel_cost: 4.48,
      fuel_efficiency: 9.1,
      purpose: 'Service Call - WO-2024-001',
    },
    {
      id: '2',
      trip_id: 'TRIP-002',
      technician_name: 'Jane Smith',
      vehicle: 'Truck 456',
      date: '2024-02-17T09:15:00Z',
      start_location: 'Office',
      end_location: '456 Oak Ave',
      distance_km: 42.3,
      fuel_consumed_liters: 4.5,
      fuel_cost: 7.2,
      fuel_efficiency: 9.4,
      purpose: 'Installation - WO-2024-002',
    },
  ];

  const handleExport = () => {
    // Export to CSV or PDF
    console.log('Export report');
  };

  const columns: ColumnsType<TripRecord> = [
    {
      title: 'Trip ID',
      dataIndex: 'trip_id',
      key: 'trip_id',
      render: (id: string) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Technician',
      dataIndex: 'technician_name',
      key: 'technician_name',
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehicle',
      key: 'vehicle',
    },
    {
      title: 'Route',
      key: 'route',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>
            <EnvironmentOutlined style={{ color: '#52c41a' }} /> {record.start_location}
          </Text>
          <Text style={{ fontSize: 12 }}>
            <EnvironmentOutlined style={{ color: '#ff4d4f' }} /> {record.end_location}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Distance (km)',
      dataIndex: 'distance_km',
      key: 'distance_km',
      align: 'right',
      render: (distance: number) => distance.toFixed(1),
      sorter: (a, b) => a.distance_km - b.distance_km,
    },
    {
      title: 'Fuel (L)',
      dataIndex: 'fuel_consumed_liters',
      key: 'fuel_consumed_liters',
      align: 'right',
      render: (fuel?: number) => (fuel ? fuel.toFixed(1) : '-'),
    },
    {
      title: 'Fuel Cost',
      dataIndex: 'fuel_cost',
      key: 'fuel_cost',
      align: 'right',
      render: (cost?: number) => (cost ? formatCurrency(cost) : '-'),
    },
    {
      title: 'Efficiency (km/L)',
      dataIndex: 'fuel_efficiency',
      key: 'fuel_efficiency',
      align: 'right',
      render: (efficiency?: number) => {
        if (!efficiency) return '-';
        const color = efficiency > 10 ? '#52c41a' : efficiency > 8 ? '#faad14' : '#ff4d4f';
        return <span style={{ color, fontWeight: 500 }}>{efficiency.toFixed(1)}</span>;
      },
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
    },
  ];

  return (
    <div>
      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Select technician"
            allowClear
            value={selectedTechnician}
            onChange={setSelectedTechnician}
            style={{ width: 200 }}
            showSearch
            options={[
              { label: 'All Technicians', value: undefined },
              { label: 'John Doe', value: 'tech-1' },
              { label: 'Jane Smith', value: 'tech-2' },
            ]}
          />
          <Select
            placeholder="Select vehicle"
            allowClear
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            style={{ width: 200 }}
            options={[
              { label: 'All Vehicles', value: undefined },
              { label: 'Van 123', value: 'veh-1' },
              { label: 'Truck 456', value: 'veh-2' },
            ]}
          />
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            Export Report
          </Button>
        </Space>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Distance"
              value={stats.total_distance_km}
              precision={1}
              suffix="km"
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Fuel Consumed"
              value={stats.total_fuel_liters}
              precision={1}
              suffix="L"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Fuel Cost"
              value={stats.total_fuel_cost}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Average Efficiency"
              value={stats.average_fuel_efficiency}
              precision={1}
              suffix="km/L"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Trips"
              value={stats.total_trips}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Average Trip Distance"
              value={stats.average_trip_distance}
              precision={1}
              suffix="km"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Trips Table */}
      <Card title="Trip Details">
        <Table
          columns={columns}
          dataSource={trips}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} trips`,
          }}
        />
      </Card>
    </div>
  );
}