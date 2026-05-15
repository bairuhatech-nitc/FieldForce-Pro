import { Card, Row, Col, Typography, Tag, Progress, Descriptions, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { BeforeAfterResult } from '../../api/vision.api';

const { Text, Paragraph } = Typography;

interface BeforeAfterViewerProps {
  result: BeforeAfterResult | null;
  beforeUrl?: string;
  afterUrl?: string;
  loading?: boolean;
}

export default function BeforeAfterViewer({
  result,
  beforeUrl,
  afterUrl,
  loading = false,
}: BeforeAfterViewerProps) {
  if (!result) return null;

  return (
    <Card loading={loading} title={<><SwapOutlined /> Before / After Comparison</>}>
      <Row gutter={[16, 16]}>
        {beforeUrl && afterUrl && (
          <>
            <Col span={12}>
              <Card size="small" title="Before">
                <img src={beforeUrl} alt="Before" style={{ width: '100%', borderRadius: 4 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="After">
                <img src={afterUrl} alt="After" style={{ width: '100%', borderRadius: 4 }} />
              </Card>
            </Col>
          </>
        )}
        <Col span={24}>
          <Descriptions bordered size="small" column={4}>
            <Descriptions.Item label="Changes Detected">
              <Tag color={result.significant_change ? 'green' : 'orange'}>
                {result.significant_change ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Change %">
              <Progress percent={Math.min(100, Math.round(result.change_percentage))} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="Similarity">
              {(result.similarity_score * 100).toFixed(1)}%
            </Descriptions.Item>
            <Descriptions.Item label="Regions Changed">
              {result.changed_regions.length}
            </Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={24}>
          <Paragraph type="secondary">{result.analysis}</Paragraph>
        </Col>
      </Row>
    </Card>
  );
}
