import { useState } from 'react';
import { Input, Button, Card, Space, Typography, Tag, Table, Empty, Alert } from 'antd';
import { SearchOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNLQuery } from '../../hooks/use-analytics';

const { Text, Paragraph } = Typography;

const VIZ_ICONS: Record<string, string> = {
  bar_chart: 'Bar Chart',
  line_chart: 'Line Chart',
  pie_chart: 'Pie Chart',
  metric: 'Metric',
};

export default function NLQueryBar() {
  const [query, setQuery] = useState('');
  const nlQuery = useNLQuery();

  const handleSearch = () => {
    if (!query.trim()) return;
    nlQuery.mutate({ query: query.trim() });
  };

  const result = nlQuery.data?.data;

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>AI Analytics Query</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your data... e.g., 'How many work orders are open?'"
            onPressEnter={handleSearch}
            size="large"
            prefix={<SearchOutlined />}
          />
          <Button
            type="primary"
            size="large"
            onClick={handleSearch}
            loading={nlQuery.isPending}
          >
            Query
          </Button>
        </Space.Compact>

        <Space wrap>
          <Text type="secondary">Try:</Text>
          {[
            'How many work orders by status?',
            'Show me overdue invoices',
            'What is the health score of assets?',
          ].map((suggestion) => (
            <Tag
              key={suggestion}
              color="blue"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setQuery(suggestion);
              }}
            >
              {suggestion}
            </Tag>
          ))}
        </Space>

        {result && (
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Result</Text>
              <Paragraph type="secondary">{result.explanation}</Paragraph>

              {result.sql_query && (
                <Alert
                  type="info"
                  message={
                    <code style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {result.sql_query}
                    </code>
                  }
                  style={{ marginBottom: 8 }}
                />
              )}

              {result.visualization_hint && (
                <Tag icon={<BarChartOutlined />} color="purple">
                  Suggested: {VIZ_ICONS[result.visualization_hint] || result.visualization_hint}
                </Tag>
              )}

              {result.results && result.results.length > 0 ? (
                <Table
                  dataSource={result.results}
                  columns={Object.keys(result.results[0]).map((key) => ({
                    title: key,
                    dataIndex: key,
                    key,
                  }))}
                  size="small"
                  pagination={false}
                  rowKey={(_, i) => String(i)}
                />
              ) : (
                result.sql_query && (
                  <Text type="secondary">
                    Query generated successfully. Execute on the server to see results.
                  </Text>
                )
              )}
            </Space>
          </Card>
        )}

        {!result && !nlQuery.isPending && (
          <Empty description="Ask a question to get started" />
        )}
      </Space>
    </Card>
  );
}
