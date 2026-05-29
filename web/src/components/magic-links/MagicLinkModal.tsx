import { Modal, Typography, Alert, Space, Button, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined, LinkOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Text, Paragraph } = Typography;

interface MagicLinkModalProps {
  open: boolean;
  onClose: () => void;
  link: string;
  expiresAt: string;
  purpose: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  super_admin_access: 'Super Admin Access',
  admin_onboarding: 'Company Admin Onboarding',
  user_access: 'User Access',
  user_onboarding: 'User Invitation',
};

export default function MagicLinkModal({ open, onClose, link, expiresAt, purpose }: MagicLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const expiresDate = new Date(expiresAt);
  const expiresFormatted = expiresDate.toLocaleString();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <LinkOutlined />
          <span>Magic Link Generated</span>
        </Space>
      }
      footer={
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      }
      width={560}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          message="Single-use link — expires after one click"
          description="This link can only be used once. Share it securely — anyone with this link can log in as the target user."
          type="warning"
          showIcon
        />

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Purpose: <strong>{PURPOSE_LABELS[purpose] ?? purpose}</strong>
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Expires: <strong>{expiresFormatted}</strong>
          </Text>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Magic Link
          </Text>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f5f5f5',
              borderRadius: 6,
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
            }}
          >
            <Paragraph
              style={{ flex: 1, margin: 0, fontSize: 12, wordBreak: 'break-all', color: '#1677ff' }}
              ellipsis={{ rows: 2, expandable: true }}
            >
              {link}
            </Paragraph>
            <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
              <Button
                type="text"
                icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                onClick={handleCopy}
                size="small"
              />
            </Tooltip>
          </div>
        </div>
      </Space>
    </Modal>
  );
}
