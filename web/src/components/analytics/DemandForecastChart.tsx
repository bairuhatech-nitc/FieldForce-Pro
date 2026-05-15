import React, { useMemo } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Card, Space, Typography, Tag, Row, Col, Statistic, Alert } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  CalendarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { DemandForecastResponse } from '../../api/scheduling.api';

const { Title, Text } = Typography;

interface DemandForecastChartProps {
  forecast: DemandForecastResponse;
  height?: number;
}

export const DemandForecastChart: React.FC<DemandForecastChartProps> = ({
  forecast,
  height = 400,
}) => {
  const chartOptions = useMemo(() => {
    const dates = forecast.forecast.map((f) => new Date(f.date).toLocaleDateString());
    const predicted = forecast.forecast.map((f) => f.predicted_demand);
    const lowerBound = forecast.forecast.map((f) => f.lower_bound);
    const upperBound = forecast.forecast.map((f) => f.upper_bound);

    return {
      title: {
        text: 'Service Demand Forecast',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          const date = params[0].axisValue;
          let tooltip = `<strong>${date}</strong><br/>`;

          params.forEach((param: any) => {
            tooltip += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
          });

          return tooltip;
        },
      },
      legend: {
        data: ['Predicted Demand', 'Upper Bound', 'Lower Bound'],
        top: 30,
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
          },
          restore: {},
          saveAsImage: {},
        },
        right: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Number of Jobs',
        axisLabel: {
          formatter: '{value}',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          start: 0,
          end: 100,
        },
      ],
      series: [
        {
          name: 'Predicted Demand',
          type: 'line',
          data: predicted,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: '#1890ff',
          },
          itemStyle: {
            color: '#1890ff',
          },
          emphasis: {
            focus: 'series',
          },
          markPoint: {
            data: [
              { type: 'max', name: 'Peak' },
              { type: 'min', name: 'Low' },
            ],
          },
          markLine: {
            data: [
              { type: 'average', name: 'Average' },
            ],
          },
        },
        {
          name: 'Upper Bound',
          type: 'line',
          data: upperBound,
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            type: 'dashed',
            color: '#ff7875',
          },
          itemStyle: {
            opacity: 0,
          },
          areaStyle: {
            opacity: 0,
          },
        },
        {
          name: 'Lower Bound',
          type: 'line',
          data: lowerBound,
          smooth: true,
          lineStyle: {
            opacity: 0.5,
            type: 'dashed',
            color: '#95de64',
          },
          itemStyle: {
            opacity: 0,
          },
          areaStyle: {
            opacity: 0.1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(149, 222, 100, 0.2)',
              },
              {
                offset: 1,
                color: 'rgba(149, 222, 100, 0.05)',
              },
            ]),
          },
          stack: 'confidence',
        },
      ],
    };
  }, [forecast]);

  const getTrendIcon = () => {
    switch (forecast.trend) {
      case 'increasing':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'decreasing':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <span style={{ color: '#1890ff' }}>→</span>;
    }
  };

  const getTrendColor = () => {
    switch (forecast.trend) {
      case 'increasing':
        return 'green';
      case 'decreasing':
        return 'red';
      default:
        return 'blue';
    }
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Summary Statistics */}
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Trend"
              value={forecast.trend}
              prefix={getTrendIcon()}
              valueStyle={{ textTransform: 'capitalize' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Avg Daily Capacity"
              value={forecast.capacity_recommendations.average_daily_capacity}
              suffix="jobs"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Peak Capacity"
              value={forecast.capacity_recommendations.peak_capacity}
              suffix="jobs"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Min Technicians"
              value={forecast.capacity_recommendations.minimum_technicians}
              prefix={<TeamOutlined />}
            />
          </Col>
        </Row>

        {/* Alerts for Peak Days */}
        {forecast.capacity_recommendations.peak_days && forecast.capacity_recommendations.peak_days.length > 0 && (
          <Alert
            message="Peak Demand Days"
            description={
              <Space direction="vertical">
                <Text>High demand expected on the following days:</Text>
                <Space wrap>
                  {forecast.capacity_recommendations.peak_days.map((day) => (
                    <Tag key={day} icon={<CalendarOutlined />} color="orange">
                      {new Date(day).toLocaleDateString()}
                    </Tag>
                  ))}
                </Space>
                <Text type="secondary">
                  Consider scheduling additional technicians or overtime for these days.
                </Text>
              </Space>
            }
            type="warning"
            showIcon
            icon={<WarningOutlined />}
          />
        )}

        {/* Forecast Chart */}
        <ReactECharts option={chartOptions} style={{ height }} />

        {/* Seasonality Information */}
        {forecast.seasonality && Object.keys(forecast.seasonality).length > 0 && (
          <Card size="small" style={{ backgroundColor: '#fafafa' }}>
            <Title level={5}>Seasonality Patterns</Title>
            <Space wrap>
              {forecast.seasonality.weekly && (
                <Tag color="blue">
                  Weekly Pattern: {forecast.seasonality.weekly.strength}
                </Tag>
              )}
              {forecast.seasonality.yearly && (
                <Tag color="green">
                  Yearly Pattern: Peak in {forecast.seasonality.yearly.peak_months?.join(', ')}
                </Tag>
              )}
            </Space>
          </Card>
        )}

        {/* Capacity Recommendations */}
        <Card size="small" style={{ backgroundColor: '#e6f7ff' }}>
          <Title level={5}>AI Recommendations</Title>
          <Space direction="vertical">
            <Text>
              <TeamOutlined /> Maintain a minimum of{' '}
              <strong>{forecast.capacity_recommendations.minimum_technicians}</strong> technicians
              to handle average demand
            </Text>
            <Text>
              <CalendarOutlined /> Add a{' '}
              <strong>{forecast.capacity_recommendations.buffer_percentage}%</strong> buffer
              for unexpected demand spikes
            </Text>
            {forecast.trend === 'increasing' && (
              <Text>
                <ArrowUpOutlined style={{ color: '#52c41a' }} /> Demand is trending upward.
                Consider hiring additional technicians or contractors.
              </Text>
            )}
            {forecast.trend === 'decreasing' && (
              <Text>
                <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> Demand is trending downward.
                Review staffing levels and consider cross-training for flexibility.
              </Text>
            )}
          </Space>
        </Card>

        {/* Metadata */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Forecast generated using {forecast.metrics?.model_type || 'AI'} model with{' '}
          {forecast.metrics?.confidence_level ? `${(forecast.metrics.confidence_level * 100).toFixed(0)}%` : '95%'}{' '}
          confidence level. Based on {forecast.metrics?.historical_days || 'N/A'} days of historical data.
        </Text>
      </Space>
    </Card>
  );
};