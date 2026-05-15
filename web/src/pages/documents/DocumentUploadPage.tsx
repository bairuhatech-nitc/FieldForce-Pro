import { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Select,
  Table,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Descriptions,
  Modal,
  Empty,
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../../hooks/use-documents';
import type { ParsedDocument } from '../../api/documents.api';

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
  reviewed: 'blue',
};

const DOC_TYPE_OPTIONS = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contract', label: 'Contract' },
  { value: 'report', label: 'Report' },
  { value: 'general', label: 'General' },
];

export default function DocumentUploadPage() {
  const [docType, setDocType] = useState('general');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [previewDoc, setPreviewDoc] = useState<ParsedDocument | null>(null);

  const { data: documentsData, isLoading } = useDocuments({
    document_type: filterType,
    status: filterStatus,
  });
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();

  const handleUpload = (file: File) => {
    uploadDoc.mutate({ file, documentType: docType });
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (text: string) => (
        <Space>
          <FileTextOutlined />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (val: number) =>
        val ? <Text>{(val * 100).toFixed(1)}%</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Pages',
      dataIndex: 'pages',
      key: 'pages',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ParsedDocument) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewDoc(record)}
          >
            Preview
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteDoc.mutate(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Document AI</Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Upload Document">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Select
                  value={docType}
                  onChange={setDocType}
                  options={DOC_TYPE_OPTIONS}
                  style={{ width: 150 }}
                />
                <Upload
                  beforeUpload={(file) => {
                    handleUpload(file);
                    return false;
                  }}
                  showUploadList={false}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                >
                  <Button
                    icon={<UploadOutlined />}
                    type="primary"
                    loading={uploadDoc.isPending}
                  >
                    Upload & Parse
                  </Button>
                </Upload>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="Parsed Documents"
            extra={
              <Space>
                <Select
                  placeholder="Filter type"
                  allowClear
                  value={filterType}
                  onChange={setFilterType}
                  options={DOC_TYPE_OPTIONS}
                  style={{ width: 130 }}
                />
                <Select
                  placeholder="Filter status"
                  allowClear
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'reviewed', label: 'Reviewed' },
                  ]}
                  style={{ width: 130 }}
                />
              </Space>
            }
          >
            <Table
              dataSource={documentsData?.data || []}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              locale={{ emptyText: <Empty description="No documents uploaded yet" /> }}
            />
          </Card>
        </Col>
      </Row>

      {/* Preview Modal */}
      <Modal
        title={previewDoc?.file_name || 'Document Preview'}
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        width={700}
        footer={null}
      >
        {previewDoc && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Type">{previewDoc.document_type}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[previewDoc.status]}>{previewDoc.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Confidence">
                {previewDoc.confidence ? `${(previewDoc.confidence * 100).toFixed(1)}%` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Pages">{previewDoc.pages || '-'}</Descriptions.Item>
            </Descriptions>

            {previewDoc.extracted_fields && Object.keys(previewDoc.extracted_fields).length > 0 && (
              <Card title="Extracted Fields" size="small">
                <Descriptions bordered size="small" column={1}>
                  {Object.entries(previewDoc.extracted_fields).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      {String(value)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
            )}

            {previewDoc.extracted_text && (
              <Card title="Extracted Text" size="small">
                <Paragraph
                  style={{ maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}
                >
                  {previewDoc.extracted_text}
                </Paragraph>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
