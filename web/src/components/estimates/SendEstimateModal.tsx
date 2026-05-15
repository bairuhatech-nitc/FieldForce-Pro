import { useState } from 'react';
import {
  Modal, Button, Space, Alert, Tooltip, Input, Typography, message,
} from 'antd';
import {
  SendOutlined, WhatsAppOutlined, MailOutlined, CopyOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useEstimate, useGenerateEstimateLink } from '@/hooks/use-estimates';

interface SendEstimateModalProps {
  estimateId: string | null;
  onClose: () => void;
}

export default function SendEstimateModal({ estimateId, onClose }: SendEstimateModalProps) {
  const { data: estimate } = useEstimate(estimateId || '');
  const generateLink = useGenerateEstimateLink();

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const contactPhone = (estimate?.contact as Record<string, unknown> | undefined)?.phone as string | undefined;
  const contactEmail = (estimate?.contact as Record<string, unknown> | undefined)?.email as string | undefined;
  const contactFirstName = (estimate?.contact as Record<string, unknown> | undefined)?.first_name as string | undefined;

  const getMagicLink = async (): Promise<string | null> => {
    if (!estimateId) return null;
    try {
      const resp = await generateLink.mutateAsync(estimateId);
      const token = resp.data?.data?.public_token;
      if (token) return `${window.location.origin}/estimate/sign/${token}`;
      return null;
    } catch { return null; }
  };

  const handleSendWhatsApp = async () => {
    if (!contactPhone) { Modal.warning({ title: 'No Phone Number', content: 'This customer has no phone number on record.' }); return; }
    const phone = contactPhone.replace(/\D/g, '');
    if (!phone) { Modal.warning({ title: 'Invalid Phone Number', content: 'The phone number contains no digits.' }); return; }
    const link = await getMagicLink();
    const firstName = contactFirstName || 'there';
    const total = Number(estimate?.total || 0).toFixed(2);
    const ref = estimate?.estimate_number || estimateId?.slice(0, 8) || '';
    const expiryLine = estimate?.expiry_date ? `\nValid until: ${estimate.expiry_date}` : '';
    const msg = encodeURIComponent(`Hi ${firstName},\n\nYour estimate *${ref}* is ready for review.\n*Total: $${total}*${expiryLine}\n\nPlease review and sign here:\n${link ?? ''}\n\nLink expires in 30 days.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    onClose();
  };

  const handleSendEmail = async () => {
    const link = await getMagicLink();
    setGeneratedLink(link || '');
    setEmailModalVisible(true);
  };

  const handleCopyLink = async () => {
    const link = await getMagicLink();
    if (link) {
      navigator.clipboard.writeText(link).then(() => { void message.success('Link copied to clipboard'); });
    } else {
      void message.error('Failed to generate link');
    }
    onClose();
  };

  const handleEmailModalClose = () => {
    setEmailModalVisible(false);
    onClose();
  };

  return (
    <>
      {/* ── Main Send Modal ── */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#1677ff' }} />
            <span>Send Estimate to Customer</span>
          </Space>
        }
        open={!!estimateId && !emailModalVisible}
        onCancel={onClose}
        footer={null}
        width={440}
      >
        <Alert
          message="Internal review approved!"
          description="All approvers have approved this estimate. Choose how you'd like to send it to the customer."
          type="success"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          {/* WhatsApp */}
          <Tooltip title={!contactPhone ? 'No phone number on record for this customer' : ''}>
            <Button
              block
              icon={<WhatsAppOutlined />}
              style={{
                background: contactPhone ? '#25D366' : undefined,
                borderColor: contactPhone ? '#25D366' : undefined,
                color: contactPhone ? '#fff' : undefined,
                height: 44,
                fontWeight: 500,
                fontSize: 14,
              }}
              onClick={() => void handleSendWhatsApp()}
              loading={generateLink.isPending}
              disabled={!contactPhone}
            >
              Send via WhatsApp
            </Button>
          </Tooltip>
          {contactPhone && <div style={{ fontSize: 11, color: '#aaa', marginTop: -6, paddingLeft: 2 }}>{contactPhone}</div>}

          {/* Email */}
          <Tooltip title={!contactEmail ? 'No email on record for this customer' : ''}>
            <Button
              block
              icon={<MailOutlined />}
              style={{ height: 44, fontWeight: 500, fontSize: 14 }}
              onClick={() => void handleSendEmail()}
              loading={generateLink.isPending}
              disabled={!contactEmail}
            >
              Send via Email
            </Button>
          </Tooltip>
          {contactEmail && <div style={{ fontSize: 11, color: '#aaa', marginTop: -6, paddingLeft: 2 }}>{contactEmail}</div>}

          {/* Copy Link */}
          <Button
            block
            icon={<CopyOutlined />}
            style={{ height: 44, fontWeight: 500, fontSize: 14 }}
            onClick={() => void handleCopyLink()}
            loading={generateLink.isPending}
          >
            Copy Sign Link
          </Button>

          {/* Skip */}
          <Button
            block
            type="text"
            style={{ height: 36, color: '#999' }}
            onClick={onClose}
          >
            Skip — I'll send it later
          </Button>
        </Space>
      </Modal>

      {/* ── Email Link Modal ── */}
      <Modal
        title={<Space><MailOutlined /><span>Send Estimate via Email</span></Space>}
        open={emailModalVisible}
        onCancel={handleEmailModalClose}
        footer={[
          <Button key="close" onClick={handleEmailModalClose}>Close</Button>,
          generatedLink && (
            <Button key="mailto" type="primary" icon={<MailOutlined />} onClick={() => {
              const subject = encodeURIComponent(`Estimate ${estimate?.estimate_number || estimateId?.slice(0, 8) || ''} — Review & Sign`);
              const body = encodeURIComponent(`Hello,\n\nPlease review and sign your estimate here:\n${generatedLink}\n\nThank you.`);
              window.open(`mailto:${contactEmail || ''}?subject=${subject}&body=${body}`, '_blank');
            }}>Open in Mail App</Button>
          ),
        ]}
      >
        {generatedLink ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert message="Magic link generated" description="Share this link with the customer. No login required." type="success" showIcon icon={<LinkOutlined />} />
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Sign Link:</Typography.Text>
              <Input.Group compact>
                <Input value={generatedLink} readOnly style={{ width: 'calc(100% - 110px)' }} />
                <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(generatedLink).then(() => { void message.success('Link copied'); }); }} style={{ width: 110 }}>Copy Link</Button>
              </Input.Group>
            </div>
          </Space>
        ) : (
          <Alert message="Could not generate magic link. Please try again." type="error" showIcon />
        )}
      </Modal>
    </>
  );
}
