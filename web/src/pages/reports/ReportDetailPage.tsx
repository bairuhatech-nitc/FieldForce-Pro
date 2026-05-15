import { useState, useMemo } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Tag,
  Table,
  Empty,
  Segmented,
} from 'antd';
import {
  FileExcelOutlined,
  DownloadOutlined,
  FileTextOutlined,
  DollarOutlined,
  BarChartOutlined,
  CustomerServiceOutlined,
  CreditCardOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  useWorkOrderReport,
  useInvoiceReport,
  usePerformanceReport,
  useServiceRequestReport,
  usePaymentReport,
} from '@/hooks/use-reports';
import { exportToCSV, exportToExcel } from '@/utils/export.utils';
import { useNotificationStore } from '@/store/notification.store';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const STATUS_COLORS: Record<string, string> = {
  new: '#1890ff',
  triaged: '#2f54eb',
  estimated: '#13c2c2',
  approved: '#722ed1',
  scheduled: '#2f54eb',
  in_progress: '#faad14',
  on_hold: '#fa541c',
  completed: '#52c41a',
  closed: '#8c8c8c',
  cancelled: '#f5222d',
  converted_to_wo: '#52c41a',
  spam: '#595959',
  draft: '#8c8c8c',
  sent: '#1890ff',
  viewed: '#13c2c2',
  partially_paid: '#faad14',
  paid: '#52c41a',
  overdue: '#f5222d',
  void: '#595959',
  pending: '#faad14',
  failed: '#f5222d',
  refunded: '#fa8c16',
};

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

const REPORT_TABS = [
  { value: 'work-orders', label: 'Work Orders', icon: <FileTextOutlined /> },
  { value: 'service-requests', label: 'Service Requests', icon: <CustomerServiceOutlined /> },
  { value: 'invoices', label: 'Invoices', icon: <DollarOutlined /> },
  { value: 'payments', label: 'Payments', icon: <CreditCardOutlined /> },
  { value: 'performance', label: 'Performance', icon: <BarChartOutlined /> },
];

// Reusable stat card
function StatCard({ label, value, color, prefix, suffix, precision }: {
  label: string;
  value: number | string;
  color?: string;
  prefix?: string;
  suffix?: string;
  precision?: number;
}) {
  const displayValue = typeof value === 'number' && precision !== undefined
    ? `${prefix || ''}${value.toFixed(precision)}${suffix || ''}`
    : `${prefix || ''}${value}${suffix || ''}`;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      padding: '18px 20px',
      border: '1px solid #f0f0f0',
      height: '100%',
    }}>
      <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        marginTop: 6,
        color: color || '#262626',
        lineHeight: 1.2,
      }}>
        {displayValue}
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((s) => s.add);

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  const params = {
    start_date: dateRange[0].format('YYYY-MM-DD'),
    end_date: dateRange[1].format('YYYY-MM-DD'),
  };

  const woQuery = useWorkOrderReport(params, reportId === 'work-orders');
  const invQuery = useInvoiceReport(params, reportId === 'invoices');
  const perfQuery = usePerformanceReport(params, reportId === 'performance');
  const srQuery = useServiceRequestReport(params, reportId === 'service-requests');
  const payQuery = usePaymentReport(params, reportId === 'payments');

  const getActiveQuery = () => {
    switch (reportId) {
      case 'work-orders': return woQuery;
      case 'invoices': return invQuery;
      case 'performance': return perfQuery;
      case 'service-requests': return srQuery;
      case 'payments': return payQuery;
      default: return woQuery;
    }
  };

  const { data, isLoading } = getActiveQuery();

  const handleExport = (format: 'csv' | 'excel') => {
    if (!data) return;
    const exportData = buildExportData();
    const filename = `Report_${(reportId || 'report').replace(/-/g, '_')}_${dayjs().format('YYYY-MM-DD')}`;
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToExcel(exportData, filename);
    }
    addNotification({ type: 'success', message: `Report exported as ${format.toUpperCase()}` });
  };

  const buildExportData = (): Record<string, unknown>[] => {
    if (!data) return [];
    const d = data as Record<string, unknown>;
    switch (reportId) {
      case 'work-orders':
      case 'service-requests': {
        const byStatus = (d.by_status || {}) as Record<string, number>;
        return Object.entries(byStatus).map(([status, count]) => ({ Status: formatStatus(status), Count: count }));
      }
      case 'invoices': {
        const byStatus = (d.by_status || {}) as Record<string, number>;
        return Object.entries(byStatus).map(([status, count]) => ({ Status: formatStatus(status), Count: count, Total_Revenue: d.total_revenue }));
      }
      case 'payments': {
        const byMethod = (d.by_method || {}) as Record<string, { count: number; amount: number }>;
        return Object.entries(byMethod).map(([method, info]) => ({ Method: formatStatus(method), Count: info.count, Amount: info.amount }));
      }
      case 'performance': {
        const top = (d.top_performers || []) as { user_id: string | null; appointments: number }[];
        return top.map((p) => ({ User_ID: p.user_id || 'Unassigned', Appointments: p.appointments }));
      }
      default:
        return [];
    }
  };

  return (
    <div>
      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/reports')} />
        <Title level={3} style={{ margin: 0 }}>Reports</Title>
      </div>

      {/* Navigation tabs */}
      <Segmented
        value={reportId || 'work-orders'}
        onChange={(val) => navigate(`/reports/${val}`, { replace: true })}
        options={REPORT_TABS.map((tab) => ({
          value: tab.value,
          label: (
            <Space size={6}>
              {tab.icon}
              <span>{tab.label}</span>
            </Space>
          ),
        }))}
        block
        style={{ marginBottom: 20 }}
      />

      {/* Filter + Export bar */}
      <Card size="small" style={{ marginBottom: 20, borderRadius: 10 }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              presets={[
                { label: 'Last 7 Days', value: [dayjs().subtract(7, 'days'), dayjs()] },
                { label: 'Last 30 Days', value: [dayjs().subtract(30, 'days'), dayjs()] },
                { label: 'Last 90 Days', value: [dayjs().subtract(90, 'days'), dayjs()] },
                { label: 'This Year', value: [dayjs().startOf('year'), dayjs()] },
              ]}
              size="middle"
            />
          </Space>
          <Space>
            <Button size="middle" icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button size="middle" icon={<FileExcelOutlined />} onClick={() => handleExport('excel')}>Excel</Button>
          </Space>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : !data ? (
        <Empty description="No report data available" />
      ) : (
        <ReportContent reportId={reportId || 'work-orders'} data={data as Record<string, unknown>} />
      )}
    </div>
  );
}

function ReportContent({ reportId, data }: { reportId: string; data: Record<string, unknown> }) {
  switch (reportId) {
    case 'work-orders':
      return <WorkOrderReportContent data={data} />;
    case 'service-requests':
      return <ServiceRequestReportContent data={data} />;
    case 'invoices':
      return <InvoiceReportContent data={data} />;
    case 'payments':
      return <PaymentReportContent data={data} />;
    case 'performance':
      return <PerformanceReportContent data={data} />;
    default:
      return <Empty description="Unknown report type" />;
  }
}

function WorkOrderReportContent({ data }: { data: Record<string, unknown> }) {
  const byStatus = (data.by_status || {}) as Record<string, number>;
  const byPriority = (data.by_priority || {}) as Record<string, number>;

  const statusChartData = useMemo(
    () => Object.entries(byStatus).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byStatus],
  );
  const priorityChartData = useMemo(
    () => Object.entries(byPriority).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byPriority],
  );

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <StatCard label="Total Work Orders" value={data.total_work_orders as number} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard label="Completed" value={byStatus.completed || 0} color="#52c41a" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard label="Avg Completion Time" value={`${data.average_completion_time_hours ?? 0}h`} color="#1890ff" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="By Status" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="By Priority" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={priorityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {priorityChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Status Breakdown" style={{ borderRadius: 10 }}>
        <Table dataSource={statusChartData} rowKey="name" pagination={false} size="middle" columns={[
          { title: 'Status', dataIndex: 'name', render: (name: string) => <Tag color={STATUS_COLORS[name.toLowerCase().replace(/\s+/g, '_')] || 'default'}>{name}</Tag> },
          { title: 'Count', dataIndex: 'value', sorter: (a, b) => a.value - b.value },
          { title: 'Percentage', render: (_, record) => `${(((record.value) / ((data.total_work_orders as number) || 1)) * 100).toFixed(1)}%` },
        ]} />
      </Card>
    </>
  );
}

function ServiceRequestReportContent({ data }: { data: Record<string, unknown> }) {
  const byStatus = (data.by_status || {}) as Record<string, number>;
  const byPriority = (data.by_priority || {}) as Record<string, number>;

  const statusChartData = useMemo(
    () => Object.entries(byStatus).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byStatus],
  );
  const priorityChartData = useMemo(
    () => Object.entries(byPriority).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byPriority],
  );

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}><StatCard label="Total Requests" value={data.total_requests as number} /></Col>
        <Col xs={24} sm={6}><StatCard label="New" value={byStatus.new || 0} color="#1890ff" /></Col>
        <Col xs={24} sm={6}><StatCard label="Converted to WO" value={byStatus.converted_to_wo || 0} color="#52c41a" /></Col>
        <Col xs={24} sm={6}><StatCard label="Conversion Rate" value={`${data.conversion_rate ?? 0}%`} color={(data.conversion_rate as number) >= 50 ? '#52c41a' : '#faad14'} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="By Status" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase().replace(/\s+/g, '_')] || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="By Priority" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={priorityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {priorityChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Status Breakdown" style={{ borderRadius: 10 }}>
        <Table dataSource={statusChartData} rowKey="name" pagination={false} size="middle" columns={[
          { title: 'Status', dataIndex: 'name', render: (name: string) => <Tag color={STATUS_COLORS[name.toLowerCase().replace(/\s+/g, '_')] || 'default'}>{name}</Tag> },
          { title: 'Count', dataIndex: 'value', sorter: (a, b) => a.value - b.value },
          { title: 'Percentage', render: (_, record) => `${(((record.value) / ((data.total_requests as number) || 1)) * 100).toFixed(1)}%` },
        ]} />
      </Card>
    </>
  );
}

function InvoiceReportContent({ data }: { data: Record<string, unknown> }) {
  const byStatus = (data.by_status || {}) as Record<string, number>;
  const chartData = useMemo(
    () => Object.entries(byStatus).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byStatus],
  );

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}><StatCard label="Total Invoices" value={data.total_invoices as number} /></Col>
        <Col xs={24} sm={6}><StatCard label="Total Revenue" value={data.total_revenue as number} color="#52c41a" prefix="$" precision={2} /></Col>
        <Col xs={24} sm={6}><StatCard label="Avg Invoice" value={data.average_invoice_amount as number} prefix="$" precision={2} /></Col>
        <Col xs={24} sm={6}><StatCard label="Collection Rate" value={`${data.collection_rate ?? 0}%`} color={(data.collection_rate as number) >= 80 ? '#52c41a' : '#faad14'} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Invoices by Status" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase().replace(/\s+/g, '_')] || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Invoice Distribution" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Status Breakdown" style={{ borderRadius: 10 }}>
        <Table dataSource={chartData} rowKey="name" pagination={false} size="middle" columns={[
          { title: 'Status', dataIndex: 'name', render: (name: string) => <Tag color={STATUS_COLORS[name.toLowerCase().replace(/\s+/g, '_')] || 'default'}>{name}</Tag> },
          { title: 'Count', dataIndex: 'value', sorter: (a, b) => a.value - b.value },
        ]} />
      </Card>
    </>
  );
}

function PaymentReportContent({ data }: { data: Record<string, unknown> }) {
  const byStatus = (data.by_status || {}) as Record<string, number>;
  const byMethod = (data.by_method || {}) as Record<string, { count: number; amount: number }>;

  const statusChartData = useMemo(
    () => Object.entries(byStatus).map(([name, value]) => ({ name: formatStatus(name), value })),
    [byStatus],
  );
  const methodChartData = useMemo(
    () => Object.entries(byMethod).map(([name, info]) => ({ name: formatStatus(name), count: info.count, amount: info.amount })),
    [byMethod],
  );

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}><StatCard label="Total Payments" value={data.total_payments as number} /></Col>
        <Col xs={24} sm={6}><StatCard label="Total Collected" value={data.total_collected as number} color="#52c41a" prefix="$" precision={2} /></Col>
        <Col xs={24} sm={6}><StatCard label="Completed Amount" value={data.completed_amount as number} prefix="$" precision={2} /></Col>
        <Col xs={24} sm={6}><StatCard label="Success Rate" value={`${data.success_rate ?? 0}%`} color={(data.success_rate as number) >= 80 ? '#52c41a' : '#faad14'} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="By Status" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase().replace(/\s+/g, '_')] || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="By Payment Method" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={methodChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {methodChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {methodChartData.length > 0 && (
        <Card title="Payment Methods" style={{ borderRadius: 10, marginBottom: 16 }}>
          <Table dataSource={methodChartData} rowKey="name" pagination={false} size="middle" columns={[
            { title: 'Method', dataIndex: 'name', render: (name: string) => <Tag color="blue">{name}</Tag> },
            { title: 'Count', dataIndex: 'count', sorter: (a, b) => a.count - b.count },
            { title: 'Amount', dataIndex: 'amount', render: (v: number) => <Text strong>${v.toFixed(2)}</Text>, sorter: (a, b) => a.amount - b.amount },
          ]} />
        </Card>
      )}

      <Card title="Status Breakdown" style={{ borderRadius: 10 }}>
        <Table dataSource={statusChartData} rowKey="name" pagination={false} size="middle" columns={[
          { title: 'Status', dataIndex: 'name', render: (name: string) => <Tag color={STATUS_COLORS[name.toLowerCase().replace(/\s+/g, '_')] || 'default'}>{name}</Tag> },
          { title: 'Count', dataIndex: 'value', sorter: (a, b) => a.value - b.value },
        ]} />
      </Card>
    </>
  );
}

function PerformanceReportContent({ data }: { data: Record<string, unknown> }) {
  const topPerformers = (data.top_performers || []) as { user_id: string | null; appointments: number }[];

  const chartData = useMemo(
    () => topPerformers.map((p) => ({
      name: p.user_id ? p.user_id.substring(0, 8) + '...' : 'Unassigned',
      appointments: p.appointments,
      fullId: p.user_id || 'Unassigned',
    })),
    [topPerformers],
  );

  const kpis = [
    { label: 'First-Time Fix Rate', value: `${data.first_time_fix_rate ?? 0}%`, color: (data.first_time_fix_rate as number) >= 80 ? '#52c41a' : '#faad14' },
    { label: 'Avg Response Time', value: `${data.average_response_time_hours ?? 0}h`, color: '#1890ff' },
    { label: 'Avg Resolution Time', value: `${data.average_resolution_time_hours ?? 0}h`, color: '#722ed1' },
    { label: 'Technician Utilization', value: data.technician_utilization_rate as number, color: '#13c2c2' },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {kpis.map((kpi, idx) => (
          <Col xs={24} sm={6} key={idx}>
            <StatCard label={kpi.label} value={kpi.value} color={kpi.color} />
          </Col>
        ))}
      </Row>

      {chartData.length > 0 && (
        <Card title="Top Performers" style={{ borderRadius: 10, marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="appointments" name="Appointments" fill="#722ed1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="Performer Details" style={{ borderRadius: 10 }}>
        {topPerformers.length === 0 ? (
          <Empty description="No performance data for this period" />
        ) : (
          <Table dataSource={topPerformers} rowKey={(r) => r.user_id || 'unassigned'} pagination={false} size="middle" columns={[
            { title: 'Rank', render: (_, __, idx) => <Tag color={idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'default'}>#{idx + 1}</Tag>, width: 70 },
            { title: 'User ID', dataIndex: 'user_id', render: (v: string | null) => v || <Text type="secondary">Unassigned</Text>, ellipsis: true },
            { title: 'Appointments', dataIndex: 'appointments', sorter: (a, b) => a.appointments - b.appointments, render: (v: number) => <Text strong>{v}</Text> },
          ]} />
        )}
      </Card>
    </>
  );
}
