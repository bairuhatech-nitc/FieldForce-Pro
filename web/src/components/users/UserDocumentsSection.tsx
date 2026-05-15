import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  message,
  Tooltip,
} from 'antd';
import {
  UploadOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import {
  useUserDocumentsByUserId,
  useCreateUserDocument,
  useDeleteUserDocument,
  useVerifyDocument,
  useUnverifyDocument,
} from '@/hooks/use-user-documents';
import type { UserDocument, DocumentType } from '@/api/user-documents.api';
import { formatDateTime } from '@/utils/format-date';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';

interface UserDocumentsSectionProps {
  userId: string;
}

const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: 'certification', label: 'Certification' },
  { value: 'license', label: 'License' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export default function UserDocumentsSection({ userId }: UserDocumentsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const { data: documents, isLoading } = useUserDocumentsByUserId(userId);
  const createDocument = useCreateUserDocument();
  const deleteDocument = useDeleteUserDocument();
  const verifyDocument = useVerifyDocument();
  const unverifyDocument = useUnverifyDocument();

  const handleUpload = async (values: {
    document_type: DocumentType;
    document_name: string;
    document_number?: string;
    issuing_authority?: string;
    issue_date?: dayjs.Dayjs;
    expiry_date?: dayjs.Dayjs;
    notes?: string;
  }) => {
    if (fileList.length === 0) {
      message.error('Please select a file to upload');
      return;
    }

    // In a real application, you would upload the file to a storage service (S3, etc.)
    // and get the file_url. For now, we'll use a placeholder.
    const file = fileList[0];
    const fileUrl = `https://example.com/uploads/${file.name}`;

    await createDocument.mutateAsync({
      user_id: userId,
      document_type: values.document_type,
      document_name: values.document_name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      document_number: values.document_number,
      issuing_authority: values.issuing_authority,
      issue_date: values.issue_date?.toISOString(),
      expiry_date: values.expiry_date?.toISOString(),
      notes: values.notes,
    });

    setIsModalOpen(false);
    form.resetFields();
    setFileList([]);
  };

  const handleDelete = async (id: string) => {
    showConfirmDialog({
      title: 'Delete Document',
      content: 'Are you sure you want to delete this document?',
      onOk: async () => {
        await deleteDocument.mutateAsync(id);
      },
      danger: true,
    });
  };

  const handleVerify = async (id: string) => {
    await verifyDocument.mutateAsync(id);
  };

  const handleUnverify = async (id: string) => {
    await unverifyDocument.mutateAsync(id);
  };

  const columns: ColumnsType<UserDocument> = [
    {
      title: 'Type',
      dataIndex: 'document_type',
      key: 'document_type',
      render: (type: DocumentType) => {
        const option = documentTypeOptions.find((opt) => opt.value === type);
        return <Tag color="blue">{option?.label || type}</Tag>;
      },
    },
    {
      title: 'Name',
      dataIndex: 'document_name',
      key: 'document_name',
      render: (name: string) => (
        <Space>
          <FileOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: 'Document Number',
      dataIndex: 'document_number',
      key: 'document_number',
      render: (val: string) => val || '-',
    },
    {
      title: 'Issuing Authority',
      dataIndex: 'issuing_authority',
      key: 'issuing_authority',
      render: (val: string) => val || '-',
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (val: string) => (val ? formatDateTime(val) : '-'),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (val: string) => {
        if (!val) return '-';
        const isExpired = dayjs(val).isBefore(dayjs());
        const isExpiringSoon = dayjs(val).diff(dayjs(), 'days') <= 30;
        return (
          <span style={{ color: isExpired ? 'red' : isExpiringSoon ? 'orange' : undefined }}>
            {formatDateTime(val)}
            {isExpired && ' (Expired)'}
            {!isExpired && isExpiringSoon && ' (Expiring Soon)'}
          </span>
        );
      },
    },
    {
      title: 'Verified',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (isVerified: boolean) =>
        isVerified ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Verified
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">
            Not Verified
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: UserDocument) => (
        <Space size="small">
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => window.open(record.file_url, '_blank')}
            />
          </Tooltip>
          <PermissionGuard permission="users:update">
            {record.is_verified ? (
              <Tooltip title="Unverify">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  size="small"
                  onClick={() => handleUnverify(record.id)}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Verify">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  size="small"
                  style={{ color: '#52c41a' }}
                  onClick={() => handleVerify(record.id)}
                />
              </Tooltip>
            )}
          </PermissionGuard>
          <PermissionGuard permission="users:delete">
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDelete(record.id)}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="Documents"
        extra={
          <PermissionGuard permission="users:update">
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setIsModalOpen(true)}>
              Upload Document
            </Button>
          </PermissionGuard>
        }
      >
        <Table
          columns={columns}
          dataSource={documents || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
        />
      </Card>

      <Modal
        title="Upload Document"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setFileList([]);
        }}
        onOk={() => form.submit()}
        confirmLoading={createDocument.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="document_type"
            label="Document Type"
            rules={[{ required: true, message: 'Please select document type' }]}
          >
            <Select options={documentTypeOptions} placeholder="Select document type" />
          </Form.Item>

          <Form.Item
            name="document_name"
            label="Document Name"
            rules={[{ required: true, message: 'Please enter document name' }]}
          >
            <Input placeholder="e.g., Driver's License, Certification" />
          </Form.Item>

          <Form.Item label="File" required>
            <Upload
              beforeUpload={(file) => {
                setFileList([file]);
                return false;
              }}
              fileList={fileList}
              onRemove={() => setFileList([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="document_number" label="Document Number">
            <Input placeholder="e.g., License number, Certificate ID" />
          </Form.Item>

          <Form.Item name="issuing_authority" label="Issuing Authority">
            <Input placeholder="e.g., DMV, Certification body" />
          </Form.Item>

          <Form.Item name="issue_date" label="Issue Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="expiry_date" label="Expiry Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
