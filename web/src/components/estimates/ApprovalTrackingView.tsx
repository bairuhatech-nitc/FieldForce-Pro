import { useState } from 'react';
import {
  Collapse,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Alert,
  Typography,
  Tooltip,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EyeOutlined,
  FileTextOutlined,
  SignatureOutlined,
  WhatsAppOutlined,
  MailOutlined,
  CopyOutlined,
  LinkOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/utils/format-date';
import type { Estimate } from '@/types/models.types';
import {
  useSendEstimate,
  useApproveEstimate,
  useRejectEstimate,
  useConvertEstimateToWorkOrder,
  useGenerateEstimateLink,
  useRevertEstimateToDraft,
} from '@/hooks/use-estimates';
import { useApprovalsByDocument } from '@/hooks/use-workflow';

const { TextArea } = Input;
const { Text } = Typography;

interface ApprovalTrackingViewProps {
  estimate: Estimate;
}

export default function ApprovalTrackingView({ estimate }: ApprovalTrackingViewProps) {
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [emailLinkModalVisible, setEmailLinkModalVisible] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [revertModalVisible, setRevertModalVisible] = useState(false);

  const sendEstimate = useSendEstimate();
  const generateLink = useGenerateEstimateLink();
  const revertToDraft = useRevertEstimateToDraft();
  const approveEstimate = useApproveEstimate();
  const rejectEstimate = useRejectEstimate();
  const convertToWorkOrder = useConvertEstimateToWorkOrder();

  const { data: internalApprovals } = useApprovalsByDocument(estimate.id);

  const contactPhone = (estimate.contact as Record<string, unknown> | undefined)?.phone as string | undefined;
  const contactEmail = (estimate.contact as Record<string, unknown> | undefined)?.email as string | undefined;

  const hasInternalApprovals = (internalApprovals?.length ?? 0) > 0;
  const allInternalApproved = hasInternalApprovals && internalApprovals!.every((a) => ['APPROVED', 'SKIPPED'].includes(a.status));
  const anyInternalRejected = internalApprovals?.some((a) => a.status === 'REJECTED');
  const currentPendingApprover = internalApprovals?.find((a) => a.status === 'PENDING');
  const internalStage2Unlocked = !hasInternalApprovals || allInternalApproved;

  const isExpired = estimate.expiry_date && new Date(estimate.expiry_date) < new Date();
  const cf = estimate.custom_fields as Record<string, unknown> | undefined;
  const isCustomerSigned = !!(cf?.signed_at);
  const signedAt = cf?.signed_at as string | undefined;
  const canRevertToDraft = ['sent', 'viewed', 'approved', 'rejected'].includes(estimate.status);

  // ── Status helpers ──
  const getStatusLabel = (status: string) => {
    if (status === 'approved' && isCustomerSigned) return 'Customer Approved';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (status: string): string => ({
    draft: 'default', sent: 'processing', viewed: 'blue',
    approved: 'success', rejected: 'error', expired: 'warning', converted_to_wo: 'purple',
  } as Record<string, string>)[status] || 'default';

  const getStatusDotColor = (status: string): string => ({
    draft: '#d9d9d9', sent: '#1677ff', viewed: '#13c2c2',
    approved: '#52c41a', rejected: '#ff4d4f', expired: '#fa8c16', converted_to_wo: '#722ed1',
  } as Record<string, string>)[status] || '#d9d9d9';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <SendOutlined />;
      case 'viewed': return <EyeOutlined />;
      case 'approved': return isCustomerSigned ? <SafetyCertificateOutlined /> : <CheckCircleOutlined />;
      case 'rejected': return <CloseCircleOutlined />;
      case 'expired': return <ClockCircleOutlined />;
      default: return <FileTextOutlined />;
    }
  };


  const getMagicLink = async (): Promise<string | null> => {
    try {
      const resp = await generateLink.mutateAsync(estimate.id);
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
    const firstName = (estimate.contact as Record<string, unknown> | undefined)?.first_name as string || 'there';
    const total = Number(estimate.total || 0).toFixed(2);
    const ref = estimate.estimate_number || estimate.id.slice(0, 8);
    const expiryLine = estimate.expiry_date ? `\nValid until: ${estimate.expiry_date}` : '';
    const msg = encodeURIComponent(`Hi ${firstName},\n\nYour estimate *${ref}* is ready for review.*Total: $${total}*${expiryLine}\n\nPlease review and sign here:\n${link ?? ''}\n\nLink expires in 30 days.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleSendEmail = async () => {
    const link = await getMagicLink();
    setGeneratedLink(link || '');
    setEmailLinkModalVisible(true);
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => { void message.success('Link copied to clipboard'); });
  };

  const handleApprove = () => {
    Modal.confirm({
      title: 'Approve Estimate',
      content: 'Mark this estimate as approved by the customer?',
      icon: <CheckCircleOutlined />,
      okText: 'Approve',
      onOk: async () => { await approveEstimate.mutateAsync({ id: estimate.id }); },
    });
  };

  const handleRejectConfirm = async () => {
    await rejectEstimate.mutateAsync({ id: estimate.id, reason: rejectionReason });
    setRejectModalVisible(false);
    setRejectionReason('');
  };

  const handleConvertConfirm = async () => {
    await convertToWorkOrder.mutateAsync({ id: estimate.id });
    setConvertModalVisible(false);
  };

  const openSignatureModal = () => {
    Modal.info({
      title: 'Customer Signature', width: 480, icon: <SignatureOutlined />, okText: 'Close',
      content: (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-color)', padding: 12, display: 'inline-block' }}>
            <img src={estimate.signature_url!} alt="Customer Signature" style={{ maxWidth: 380, maxHeight: 160, display: 'block' }} />
          </div>
          {isCustomerSigned && signedAt && <div style={{ marginTop: 12, opacity: 0.5, fontSize: 13 }}>Signed on {formatDateTime(signedAt)}</div>}
          {estimate.contact && <div style={{ marginTop: 4, fontWeight: 600, fontSize: 13 }}>{estimate.contact.first_name} {estimate.contact.last_name}</div>}
        </div>
      ),
    });
  };

  // ── Panel style shared ──
  const panelStyle: React.CSSProperties = {
    marginBottom: 8,
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    overflow: 'hidden',
  };

  // ── Default open panels ──
  const defaultOpen = ['status', 'send'];

  return (
    <>
      <Collapse
        bordered={false}
        defaultActiveKey={defaultOpen}
        expandIconPosition="end"
        style={{ background: 'transparent' }}
        items={[

          /* ══════════════════════════════════════════
             Panel 1 — Current Status
             ══════════════════════════════════════════ */
          {
            key: 'status',
            style: panelStyle,
            label: (
              <Space size={8} style={{ flexWrap: 'wrap' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusDotColor(estimate.status), flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Current Status</span>
                <Tag color={getStatusColor(estimate.status)} icon={getStatusIcon(estimate.status)} style={{ margin: 0, borderRadius: 20 }}>
                  {getStatusLabel(estimate.status)}
                </Tag>
                {isCustomerSigned && (
                  <Tag color="success" icon={<SafetyCertificateOutlined />} style={{ margin: 0, borderRadius: 20 }}>Signed</Tag>
                )}
              </Space>
            ),
            children: (
              <div style={{ padding: '4px 0 8px' }}>
                {/* Expiry row */}
                {estimate.expiry_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 10px', background: 'var(--bg-color)', borderRadius: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>Expiry Date</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: isExpired ? '#ff4d4f' : 'inherit' }}>
                      {isExpired && '⚠ '}{formatDateTime(estimate.expiry_date)}
                    </span>
                  </div>
                )}
                {/* Signed row */}
                {isCustomerSigned && signedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 10px', background: 'rgba(82, 196, 26, 0.1)', borderRadius: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>Signed On</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#52c41a' }}>{formatDateTime(signedAt)}</span>
                  </div>
                )}
                {/* Expired alert */}
                {isExpired && !['approved', 'converted_to_wo'].includes(estimate.status) && (
                  <Alert message="Estimate Expired" description={`Expired on ${formatDateTime(estimate.expiry_date!)}`} type="warning" showIcon style={{ marginBottom: 8 }} />
                )}
                {/* Signature thumbnail */}
                {estimate.signature_url && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={openSignatureModal}>
                    <div style={{ padding: '7px 12px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'inherit' }}>
                      <SignatureOutlined /><span>Customer Signature</span>
                      <span style={{ marginLeft: 'auto', color: '#1677ff', fontSize: 11 }}>View →</span>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--card-bg)', display: 'flex', justifyContent: 'center' }}>
                      <img src={estimate.signature_url} alt="Signature" style={{ maxWidth: '100%', maxHeight: 48, display: 'block' }} />
                    </div>
                  </div>
                )}
              </div>
            ),
          },

          /* ══════════════════════════════════════════
             Panel 2 — Send to Customer
             ══════════════════════════════════════════ */
          {
            key: 'send',
            style: { ...panelStyle, marginBottom: 0 },
            label: (
              <Space size={8} style={{ flexWrap: 'wrap' }}>
                <SendOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Send to Customer</span>
                {['sent', 'viewed', 'approved'].includes(estimate.status) && (
                  <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Sent</Tag>
                )}
                {!internalStage2Unlocked && hasInternalApprovals && (
                  <Tag color="default" style={{ margin: 0, fontSize: 11 }}>Locked</Tag>
                )}
                {estimate.status === 'approved' && (
                  <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>Ready to Convert</Tag>
                )}
              </Space>
            ),
            children: (
              <div style={{ padding: '4px 0 8px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>

                  {/* Context banners */}
                  {estimate.status === 'draft' && internalStage2Unlocked && (
                    <div style={{ background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#003eb3' }}>
                      <strong>Ready to send</strong> — share with the customer for review & digital signature.
                    </div>
                  )}
                  {['sent', 'viewed'].includes(estimate.status) && (
                    <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#873800' }}>
                      <strong>Waiting for customer</strong> — they can sign via the link, or record decision below.
                    </div>
                  )}

                  {/* Locked */}
                  {!internalStage2Unlocked && hasInternalApprovals && (
                    <Alert
                      message={anyInternalRejected ? 'Internal review rejected' : 'Awaiting internal approval'}
                      description={anyInternalRejected ? 'Revise the estimate before proceeding.' : `Waiting for ${currentPendingApprover ? `${(currentPendingApprover.approver as Record<string, unknown>)?.first_name} ${(currentPendingApprover.approver as Record<string, unknown>)?.last_name}` : 'approvers'}.`}
                      type={anyInternalRejected ? 'error' : 'warning'}
                      showIcon
                    />
                  )}

                  {/* Send buttons */}
                  {internalStage2Unlocked && ['draft', 'sent', 'viewed', 'approved'].includes(estimate.status) && (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      <div>
                        <Tooltip title={!contactPhone ? 'No phone number on record' : ''}>
                          <Button block icon={<WhatsAppOutlined />} style={{ background: contactPhone ? '#25D366' : undefined, borderColor: contactPhone ? '#25D366' : undefined, color: contactPhone ? '#fff' : undefined, height: 38, fontWeight: 500 }} onClick={() => void handleSendWhatsApp()} loading={generateLink.isPending} disabled={!contactPhone}>
                            Send via WhatsApp
                          </Button>
                        </Tooltip>
                        {contactPhone && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, paddingLeft: 2 }}>{contactPhone}</div>}
                      </div>
                      <div>
                        <Tooltip title={!contactEmail ? 'No email on record' : ''}>
                          <Button block icon={<MailOutlined />} style={{ height: 38, fontWeight: 500 }} onClick={() => void handleSendEmail()} loading={generateLink.isPending} disabled={!contactEmail}>
                            Send via Email
                          </Button>
                        </Tooltip>
                        {contactEmail && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, paddingLeft: 2 }}>{contactEmail}</div>}
                      </div>
                      {estimate.public_token && (
                        <Button block icon={<CopyOutlined />} style={{ height: 38 }} onClick={() => handleCopyLink(`${window.location.origin}/estimate/sign/${estimate.public_token}`)}>
                          Copy Sign Link
                        </Button>
                      )}
                    </Space>
                  )}

                  {/* Record decision */}
                  {['sent', 'viewed'].includes(estimate.status) && (
                    <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '12px 14px' }}>
                      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Record Customer Decision</Text>
                      <Space wrap size={8}>
                        {!isCustomerSigned && (
                          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={handleApprove} loading={approveEstimate.isPending} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                            Approved
                          </Button>
                        )}
                        <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => setRejectModalVisible(true)} loading={rejectEstimate.isPending}>
                          Rejected
                        </Button>
                      </Space>
                    </div>
                  )}

                  {/* Approved state */}
                  {estimate.status === 'approved' && (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      <div style={{ background: 'rgba(82, 196, 26, 0.1)', border: '1px solid rgba(82, 196, 26, 0.25)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#52c41a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isCustomerSigned ? <SafetyCertificateOutlined style={{ color: '#fff', fontSize: 16 }} /> : <CheckCircleOutlined style={{ color: '#fff', fontSize: 16 }} />}
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#52c41a', display: 'block' }}>{isCustomerSigned ? 'Digitally Signed & Approved' : 'Customer Approved'}</Text>
                          <Text style={{ fontSize: 11, color: '#52c41a', opacity: 0.8 }}>{isCustomerSigned && signedAt ? `Signed on ${formatDateTime(signedAt)}` : 'Ready to convert into a Work Order.'}</Text>
                        </div>
                      </div>
                      <Button type="primary" icon={<FileTextOutlined />} onClick={() => setConvertModalVisible(true)} loading={convertToWorkOrder.isPending} block style={{ height: 40, fontWeight: 600 }}>
                        Convert to Work Order
                      </Button>
                    </Space>
                  )}

                  {/* Rejected state */}
                  {estimate.status === 'rejected' && (
                    <div style={{ background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.25)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <Text strong style={{ color: '#ff4d4f', display: 'block', marginBottom: 2, fontSize: 13 }}>Customer Rejected</Text>
                        <Text style={{ fontSize: 12, opacity: 0.5 }}>{cf?.rejection_reason ? `Reason: ${String(cf.rejection_reason)}` : 'Revert to draft to revise and re-send.'}</Text>
                      </div>
                    </div>
                  )}

                  {/* Converted state */}
                  {estimate.status === 'converted_to_wo' && (
                    <div style={{ background: 'rgba(114, 46, 209, 0.1)', border: '1px solid rgba(114, 46, 209, 0.25)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <FileTextOutlined style={{ color: '#9254de', fontSize: 16, flexShrink: 0 }} />
                      <div>
                        <Text strong style={{ color: '#9254de', display: 'block', marginBottom: 2, fontSize: 13 }}>Converted to Work Order</Text>
                        <Text style={{ fontSize: 12, opacity: 0.5 }}>Successfully converted.</Text>
                      </div>
                    </div>
                  )}

                  {/* Revert to Draft */}
                  {canRevertToDraft && estimate.status !== 'converted_to_wo' && (
                    <div style={{ background: 'rgba(250, 173, 20, 0.1)', border: '1px solid rgba(250, 173, 20, 0.25)', borderRadius: 8, padding: '10px 14px' }}>
                      <Text strong style={{ fontSize: 12, color: '#faad14', display: 'block', marginBottom: 6 }}>Need to revise this estimate?</Text>
                      <Button icon={<RollbackOutlined />} size="small" onClick={() => setRevertModalVisible(true)} loading={revertToDraft.isPending}>
                        Revert to Draft
                      </Button>
                    </div>
                  )}
                </Space>
              </div>
            ),
          },

        ]}
      />

      {/* ── Reject Modal ── */}
      <Modal title="Reject Estimate" open={rejectModalVisible} onOk={handleRejectConfirm} onCancel={() => { setRejectModalVisible(false); setRejectionReason(''); }} okText="Confirm Rejection" okButtonProps={{ danger: true }} confirmLoading={rejectEstimate.isPending}>
        <Alert message="This will mark the estimate as rejected" type="warning" showIcon style={{ marginBottom: 16 }} />
        <Text type="secondary">Reason for rejection:</Text>
        <TextArea rows={4} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., Price too high, timeline not acceptable..." style={{ marginTop: 8 }} />
      </Modal>

      {/* ── Convert Modal ── */}
      <Modal title="Convert to Work Order" open={convertModalVisible} onOk={handleConvertConfirm} onCancel={() => setConvertModalVisible(false)} okText="Convert" confirmLoading={convertToWorkOrder.isPending}>
        <Alert message={`Convert estimate #${estimate.estimate_number || estimate.id.slice(0, 8)} to a Work Order?`} description="A new Work Order will be created. This action cannot be undone." type="info" showIcon />
      </Modal>

      {/* ── Email Link Modal ── */}
      <Modal
        title={<Space><MailOutlined /><span>Send Estimate via Email</span></Space>}
        open={emailLinkModalVisible}
        onCancel={() => setEmailLinkModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setEmailLinkModalVisible(false)}>Close</Button>,
          generatedLink && (
            <Button key="mailto" type="primary" icon={<MailOutlined />} onClick={() => {
              const subject = encodeURIComponent(`Estimate ${estimate.estimate_number || estimate.id.slice(0, 8)} — Review & Sign`);
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
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Sign Link:</Text>
              <Input.Group compact>
                <Input value={generatedLink} readOnly style={{ width: 'calc(100% - 110px)' }} />
                <Button icon={<CopyOutlined />} onClick={() => handleCopyLink(generatedLink)} style={{ width: 110 }}>Copy Link</Button>
              </Input.Group>
            </div>
          </Space>
        ) : (
          <Alert message="Could not generate magic link. Please try again." type="error" showIcon />
        )}
      </Modal>

      {/* ── Revert to Draft Modal ── */}
      <Modal
        title={<Space><RollbackOutlined style={{ color: '#faad14' }} /><span>Revert Estimate to Draft</span></Space>}
        open={revertModalVisible}
        onOk={async () => { await revertToDraft.mutateAsync(estimate.id); setRevertModalVisible(false); }}
        onCancel={() => setRevertModalVisible(false)}
        okText="Yes, Revert to Draft"
        okButtonProps={{ danger: true }}
        confirmLoading={revertToDraft.isPending}
      >
        <Alert
          message="This will undo the current status and reset the estimate to Draft"
          description={isCustomerSigned ? 'The customer\'s digital signature and sign link will be cleared.' : 'The sign link will be cleared. You can edit, re-price, and re-send.'}
          type="warning" showIcon style={{ marginBottom: 0 }}
        />
      </Modal>

    </>
  );
}
