import { useState } from 'react';
import { Card, Row, Col, Typography, Spin, DatePicker, Space, Alert, Divider } from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  BarChartOutlined,
  ArrowRightOutlined,
  WarningOutlined,
  CustomerServiceOutlined,
  CreditCardOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  useWorkOrderReport,
  useInvoiceReport,
  usePerformanceReport,
  useServiceRequestReport,
  usePaymentReport,
} from '@/hooks/use-reports';
import { formatCurrency } from '@/utils/format-currency';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function ReportListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  const params = {
    start_date: dateRange[0].format('YYYY-MM-DD'),
    end_date: dateRange[1].format('YYYY-MM-DD'),
  };

  const { data: woData, isLoading: woLoading, isError: woError } = useWorkOrderReport(params);
  const { data: invData, isLoading: invLoading, isError: invError } = useInvoiceReport(params);
  const { data: perfData, isLoading: perfLoading, isError: perfError } = usePerformanceReport(params);
  const { data: srData, isLoading: srLoading, isError: srError } = useServiceRequestReport(params);
  const { data: payData, isLoading: payLoading, isError: payError } = usePaymentReport(params);

  const reportCards = [
    {
      key: 'work-orders',
      title: 'Work Orders',
      description: 'Track work order status, priority distribution, and completion metrics',
      icon: <FileTextOutlined />,
      color: '#1890ff',
      loading: woLoading,
      error: woError,
      stats: woData
        ? [
            { label: 'Total', value: (woData as any).total_work_orders ?? 0 },
            { label: 'Completed', value: (woData as any).by_status?.completed ?? 0 },
            { label: 'In Progress', value: (woData as any).by_status?.in_progress ?? 0 },
            { label: 'Avg Completion', value: `${(woData as any).average_completion_time_hours ?? 0}h` },
          ]
        : [],
    },
    {
      key: 'service-requests',
      title: 'Service Requests',
      description: 'Monitor incoming requests, triage status, and conversion rates',
      icon: <CustomerServiceOutlined />,
      color: '#13c2c2',
      loading: srLoading,
      error: srError,
      stats: srData
        ? [
            { label: 'Total Requests', value: (srData as any).total_requests ?? 0 },
            { label: 'New', value: (srData as any).by_status?.new ?? 0 },
            { label: 'Converted to WO', value: (srData as any).by_status?.converted_to_wo ?? 0 },
            { label: 'Conversion Rate', value: `${(srData as any).conversion_rate ?? 0}%` },
          ]
        : [],
    },
    {
      key: 'invoices',
      title: 'Invoices & Revenue',
      description: 'Analyze revenue, invoice amounts, and payment collection rates',
      icon: <DollarOutlined />,
      color: '#52c41a',
      loading: invLoading,
      error: invError,
      stats: invData
        ? [
            { label: 'Total Invoices', value: (invData as any).total_invoices ?? 0 },
            { label: 'Revenue', value: formatCurrency((invData as any).total_revenue ?? 0) },
            { label: 'Avg Amount', value: formatCurrency((invData as any).average_invoice_amount ?? 0) },
            { label: 'Collection Rate', value: `${(invData as any).collection_rate ?? 0}%` },
          ]
        : [],
    },
    {
      key: 'payments',
      title: 'Payments',
      description: 'Review payment volumes, methods, and success rates',
      icon: <CreditCardOutlined />,
      color: '#faad14',
      loading: payLoading,
      error: payError,
      stats: payData
        ? [
            { label: 'Total Payments', value: (payData as any).total_payments ?? 0 },
            { label: 'Collected', value: formatCurrency((payData as any).total_collected ?? 0) },
            { label: 'Completed', value: formatCurrency((payData as any).completed_amount ?? 0) },
            { label: 'Success Rate', value: `${(payData as any).success_rate ?? 0}%` },
          ]
        : [],
    },
    {
      key: 'performance',
      title: 'Performance',
      description: 'Evaluate technician efficiency, fix rates, and response times',
      icon: <BarChartOutlined />,
      color: '#722ed1',
      loading: perfLoading,
      error: perfError,
      stats: perfData
        ? [
            { label: 'First-Time Fix', value: `${(perfData as any).first_time_fix_rate ?? 0}%` },
            { label: 'Avg Response', value: `${(perfData as any).average_response_time_hours ?? 0}h` },
            { label: 'Avg Resolution', value: `${(perfData as any).average_resolution_time_hours ?? 0}h` },
            { label: 'Top Performers', value: ((perfData as any).top_performers ?? []).length },
          ]
        : [],
    },
  ];

  return (
    <div>
      {/* Unified header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{t('nav.reports')}</Title>
          <Text type="secondary">View comprehensive business analytics and reports</Text>
        </div>
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
          />
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        {reportCards.map((card) => (
          <Col xs={24} lg={12} key={card.key}>
            <Card
              hoverable
              onClick={() => navigate(`/reports/${card.key}`)}
              style={{
                height: '100%',
                borderRadius: 10,
                borderLeft: `4px solid ${card.color}`,
                cursor: 'pointer',
              }}
              styles={{ body: { padding: '20px 24px' } }}
            >
              {/* Card header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space size={12}>
                  <span style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${card.color}12`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                    fontSize: 20,
                  }}>
                    {card.icon}
                  </span>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>{card.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{card.description}</Text>
                  </div>
                </Space>
                <ArrowRightOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
              </div>

              <Divider style={{ margin: '0 0 16px 0' }} />

              {/* Stats area */}
              {card.loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                </div>
              ) : card.error ? (
                <Alert
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  message="Unable to load data"
                  style={{ borderRadius: 8 }}
                />
              ) : card.stats.length === 0 ? (
                <Alert type="info" showIcon message="No data for this period" style={{ borderRadius: 8 }} />
              ) : (
                <Row gutter={[12, 12]}>
                  {card.stats.map((stat, idx) => (
                    <Col span={12} key={idx}>
                      <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>
                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: '#262626' }}>
                          {stat.value}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
