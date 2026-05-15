import { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Progress,
  Descriptions,
  List,
  Result,
  Divider,
  Tabs,
} from 'antd';
import {
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  EyeOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useVerifyWork, useIdentifyEquipment, useCompareBeforeAfter } from '../../hooks/use-vision';
import type { WorkVerificationResult, EquipmentDetectionResult, BeforeAfterResult } from '../../api/vision.api';

const { Title, Text, Paragraph } = Typography;

export default function VisionDashboardPage() {
  const [activeTab, setActiveTab] = useState('verify');
  const [verifyResult, setVerifyResult] = useState<WorkVerificationResult | null>(null);
  const [detectResult, setDetectResult] = useState<EquipmentDetectionResult | null>(null);
  const [compareResult, setCompareResult] = useState<BeforeAfterResult | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const verifyWork = useVerifyWork();
  const identifyEquipment = useIdentifyEquipment();
  const compareBA = useCompareBeforeAfter();

  const handleVerify = (file: File) => {
    verifyWork.mutate({ file }, {
      onSuccess: (res) => setVerifyResult(res.data || null),
    });
  };

  const handleDetect = (file: File) => {
    identifyEquipment.mutate({ file }, {
      onSuccess: (res) => setDetectResult(res.data || null),
    });
  };

  const handleCompare = () => {
    if (!beforeFile || !afterFile) return;
    compareBA.mutate({ beforeFile, afterFile }, {
      onSuccess: (res) => setCompareResult(res.data || null),
    });
  };

  const tabItems = [
    {
      key: 'verify',
      label: (
        <Space>
          <CheckCircleOutlined />
          Work Verification
        </Space>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Upload Work Photo">
              <Upload
                beforeUpload={(file) => {
                  handleVerify(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<CameraOutlined />} loading={verifyWork.isPending} type="primary" size="large">
                  Upload Photo for Verification
                </Button>
              </Upload>
            </Card>
          </Col>
          <Col span={12}>
            {verifyResult && (
              <Card title="Verification Result">
                <Result
                  status={verifyResult.verified ? 'success' : 'warning'}
                  title={verifyResult.verified ? 'Work Verified' : 'Issues Found'}
                  subTitle={`Confidence: ${(verifyResult.confidence * 100).toFixed(1)}%`}
                />
                {verifyResult.issues.length > 0 && (
                  <List
                    size="small"
                    header={<Text strong>Issues</Text>}
                    dataSource={verifyResult.issues}
                    renderItem={(issue) => (
                      <List.Item>
                        <Tag color="red"><CloseCircleOutlined /> {issue}</Tag>
                      </List.Item>
                    )}
                  />
                )}
                {verifyResult.findings.length > 0 && (
                  <List
                    size="small"
                    header={<Text strong>Findings ({verifyResult.findings.length})</Text>}
                    dataSource={verifyResult.findings}
                    renderItem={(finding) => (
                      <List.Item>
                        <Space>
                          <Tag color="blue">{finding.class}</Tag>
                          <Text type="secondary">{(finding.confidence * 100).toFixed(0)}%</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            )}
          </Col>
        </Row>
      ),
    },
    {
      key: 'detect',
      label: (
        <Space>
          <EyeOutlined />
          Equipment Detection
        </Space>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Upload Equipment Photo">
              <Upload
                beforeUpload={(file) => {
                  handleDetect(file);
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<CameraOutlined />} loading={identifyEquipment.isPending} type="primary" size="large">
                  Upload Photo for Detection
                </Button>
              </Upload>
            </Card>
          </Col>
          <Col span={12}>
            {detectResult && (
              <Card title={`Equipment Detected: ${detectResult.equipment_count}`}>
                {detectResult.labels.length > 0 && (
                  <Space wrap style={{ marginBottom: 16 }}>
                    {detectResult.labels.map((label) => (
                      <Tag key={label} color="green">{label}</Tag>
                    ))}
                  </Space>
                )}
                {detectResult.detections.length > 0 ? (
                  <List
                    size="small"
                    dataSource={detectResult.detections}
                    renderItem={(det) => (
                      <List.Item>
                        <Space>
                          <Tag color="blue">{det.label}</Tag>
                          <Text>{(det.confidence * 100).toFixed(0)}% confidence</Text>
                          {det.category && <Tag>{det.category}</Tag>}
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">No equipment detected. Try a clearer photo.</Text>
                )}
              </Card>
            )}
          </Col>
        </Row>
      ),
    },
    {
      key: 'compare',
      label: (
        <Space>
          <SwapOutlined />
          Before/After
        </Space>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="Before Photo">
              <Upload
                beforeUpload={(file) => {
                  setBeforeFile(file);
                  return false;
                }}
                showUploadList
                maxCount={1}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>Select Before</Button>
              </Upload>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="After Photo">
              <Upload
                beforeUpload={(file) => {
                  setAfterFile(file);
                  return false;
                }}
                showUploadList
                maxCount={1}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>Select After</Button>
              </Upload>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Button
                type="primary"
                onClick={handleCompare}
                loading={compareBA.isPending}
                disabled={!beforeFile || !afterFile}
                block
                size="large"
                icon={<SwapOutlined />}
              >
                Compare
              </Button>
            </Card>
          </Col>
          {compareResult && (
            <Col span={24}>
              <Card title="Comparison Result">
                <Descriptions bordered column={3} size="small">
                  <Descriptions.Item label="Change Detected">
                    <Tag color={compareResult.significant_change ? 'green' : 'orange'}>
                      {compareResult.significant_change ? 'Yes' : 'No'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Change Percentage">
                    <Progress
                      percent={Math.min(100, compareResult.change_percentage)}
                      size="small"
                      status={compareResult.significant_change ? 'active' : 'normal'}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Similarity">
                    {(compareResult.similarity_score * 100).toFixed(1)}%
                  </Descriptions.Item>
                </Descriptions>
                <Divider />
                <Paragraph>{compareResult.analysis}</Paragraph>
                {compareResult.changed_regions.length > 0 && (
                  <>
                    <Text strong>Changed Regions: {compareResult.changed_regions.length}</Text>
                    <List
                      size="small"
                      dataSource={compareResult.changed_regions}
                      renderItem={(region, idx) => (
                        <List.Item>
                          <Space>
                            <Tag>Region {idx + 1}</Tag>
                            <Text>{region.change_percentage.toFixed(1)}% change</Text>
                            <Tag color={region.significance === 'high' ? 'red' : 'orange'}>
                              {region.significance}
                            </Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                )}
              </Card>
            </Col>
          )}
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>AI Vision & Verification</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
}
