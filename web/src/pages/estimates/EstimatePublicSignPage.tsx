import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Skeleton,
  Alert,
  Table,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Divider,
  Result,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClearOutlined,
  EditOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { estimatesPublicApi } from '@/api/estimates.api';
import type { Estimate, EstimateLineItem } from '@/types/models.types';
import { formatCurrency } from '@/utils/format-currency';
import { formatDateTime } from '@/utils/format-date';

const { Text, Title } = Typography;
const { TextArea } = Input;

type PageState = 'loading' | 'loadError' | 'idle' | 'signed' | 'declined';

export default function EstimatePublicSignPage() {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Decline flow
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (!token) return;
    estimatesPublicApi
      .getByToken(token)
      .then((res) => {
        setEstimate(res.data.data);
        setPageState('idle');
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 410) {
          setLoadErrorMsg('This link has expired. Please contact the service provider for a new link.');
        } else if (status === 404) {
          setLoadErrorMsg('This link is invalid or could not be found.');
        } else {
          setLoadErrorMsg('Unable to load the estimate. Please try again later.');
        }
        setPageState('loadError');
      });
  }, [token]);

  // Non-passive touch listeners for canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pageState !== 'idle') return;

    const getPos = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e.touches[0]);
      isDrawingRef.current = true;
      const ctx = canvas.getContext('2d')!;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const { x, y } = getPos(e.touches[0]);
      const ctx = canvas.getContext('2d')!;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [pageState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!canvasRef.current || !token) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSubmitError('');
    setSubmitting(true);
    try {
      await estimatesPublicApi.sign(token, dataUrl);
      setPageState('signed');
    } catch (err) {
      setSubmitError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to submit signature. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitError('');
    setDeclining(true);
    try {
      await estimatesPublicApi.reject(token, declineReason || undefined);
      setPageState('declined');
    } catch (err) {
      setSubmitError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to decline. Please try again.',
      );
    } finally {
      setDeclining(false);
    }
  };

  const lineItemColumns: ColumnsType<EstimateLineItem> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag>{t.charAt(0).toUpperCase() + t.slice(1)}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (p: number) => formatCurrency(p),
    },
    {
      title: 'Tax',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      render: (r: number) => `${r || 0}%`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      render: (d: number) => formatCurrency(d || 0),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (t: number) => <span style={{ fontWeight: 500 }}>{formatCurrency(t)}</span>,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Branding header */}
      <div
        style={{
          background: '#1a1a2e',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>FieldForce Pro</div>
        <Tag color="blue" style={{ marginLeft: 'auto' }}>
          Estimate Review &amp; Sign
        </Tag>
      </div>

      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px 64px' }}>
        {/* ── Loading ── */}
        {pageState === 'loading' && (
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        )}

        {/* ── Load error ── */}
        {pageState === 'loadError' && (
          <Result status="error" title="Unable to Load Estimate" subTitle={loadErrorMsg} />
        )}

        {/* ── Signed success ── */}
        {pageState === 'signed' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Thank you! Your signature has been recorded."
            subTitle="The estimate has been approved. The service provider will be in touch shortly."
          />
        )}

        {/* ── Declined success ── */}
        {pageState === 'declined' && (
          <Result
            status="info"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title="Estimate Declined"
            subTitle="You have declined this estimate. The service provider has been notified and will contact you to discuss further."
          />
        )}

        {/* ── Main content ── */}
        {pageState === 'idle' && estimate && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Estimate info card */}
            <Card
              title={
                <Space>
                  <span style={{ fontWeight: 600 }}>Estimate</span>
                  <Tag color="blue">{estimate.estimate_number || estimate.id.slice(0, 8)}</Tag>
                  <Tag color={estimate.status === 'approved' ? 'green' : estimate.status === 'rejected' ? 'red' : 'processing'}>
                    {estimate.status.replace(/_/g, ' ').toUpperCase()}
                  </Tag>
                </Space>
              }
            >
              <Row gutter={[16, 12]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Customer</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {estimate.contact
                      ? `${estimate.contact.first_name} ${estimate.contact.last_name}`
                      : '—'}
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total Amount</Text>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a2e', marginTop: 2 }}>
                    {formatCurrency(estimate.total || 0)}
                  </div>
                </Col>
                {estimate.expiry_date && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Valid Until</Text>
                    <div style={{ marginTop: 2 }}>{formatDateTime(estimate.expiry_date)}</div>
                  </Col>
                )}
                {estimate.public_token_expires_at && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Sign Link Expires</Text>
                    <div style={{ marginTop: 2 }}>{formatDateTime(estimate.public_token_expires_at)}</div>
                  </Col>
                )}
                {estimate.notes && (
                  <Col xs={24}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Notes</Text>
                    <div style={{ marginTop: 2 }}>{estimate.notes}</div>
                  </Col>
                )}
              </Row>
            </Card>

            {/* Line items */}
            <Card title="Items &amp; Pricing">
              <Table
                columns={lineItemColumns}
                dataSource={estimate.line_items || []}
                rowKey="id"
                pagination={false}
                scroll={{ x: 600 }}
                locale={{ emptyText: 'No items' }}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Subtotal</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong>{formatCurrency(estimate.subtotal || 0)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">Tax</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>{formatCurrency(estimate.tax || 0)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">Discount</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>-{formatCurrency(estimate.discount || 0)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong style={{ fontSize: 15 }}>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{ fontSize: 15, color: '#1a1a2e' }}>{formatCurrency(estimate.total || 0)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>

            {/* Action section */}
            {estimate.status === 'approved' && estimate.signature_url ? (
              <Alert
                message="This estimate has already been signed and approved."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            ) : estimate.status === 'rejected' ? (
              <Alert
                message="This estimate has been declined."
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
              />
            ) : (
              <>
                {/* Submit error (shown inline, doesn't hide the form) */}
                {submitError && (
                  <Alert message={submitError} type="error" showIcon closable onClose={() => setSubmitError('')} />
                )}

                {/* Digital signature card */}
                <Card
                  title={
                    <Space>
                      <EditOutlined />
                      <span>Digital Signature</span>
                    </Space>
                  }
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Draw your signature below using your mouse or finger. By clicking{' '}
                    <strong>Accept &amp; Sign</strong> you confirm your acceptance of this estimate.
                  </Text>

                  <div
                    style={{
                      border: '2px dashed #d9d9d9',
                      borderRadius: 8,
                      background: '#fafafa',
                      marginBottom: 8,
                      overflow: 'hidden',
                      cursor: 'crosshair',
                      userSelect: 'none',
                      position: 'relative',
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={200}
                      style={{ display: 'block', width: '100%', height: 200, touchAction: 'none' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                    {!hasDrawn && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                          color: '#bfbfbf',
                          fontSize: 14,
                        }}
                      >
                        Sign here
                      </div>
                    )}
                  </div>

                  <Space style={{ marginBottom: 16 }}>
                    <Button size="small" icon={<ClearOutlined />} onClick={handleClear} disabled={!hasDrawn}>
                      Clear
                    </Button>
                  </Space>

                  <Divider style={{ margin: '12px 0' }} />

                  <Space size="middle">
                    <Button
                      type="primary"
                      size="large"
                      icon={<CheckCircleOutlined />}
                      disabled={!hasDrawn}
                      loading={submitting}
                      onClick={() => void handleSign()}
                    >
                      Accept &amp; Sign
                    </Button>
                  </Space>
                </Card>

                {/* Decline section */}
                <Card
                  size="small"
                  style={{ borderColor: showDeclineForm ? '#ff4d4f' : '#f0f0f0' }}
                  title={
                    <Space>
                      <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                      <Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>
                        Decline this Estimate
                      </Title>
                    </Space>
                  }
                >
                  {!showDeclineForm ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Not happy with this estimate? You can decline it and the service provider will be
                        notified.
                      </Text>
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => setShowDeclineForm(true)}
                      >
                        Decline Estimate
                      </Button>
                    </Space>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <Alert
                        message="You are about to decline this estimate"
                        description="The service provider will be notified and may reach out to revise the offer."
                        type="warning"
                        showIcon
                      />
                      <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Reason for declining (optional):
                        </Text>
                        <TextArea
                          rows={3}
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="e.g. Price is too high, timeline doesn't work..."
                          style={{ marginTop: 6 }}
                        />
                      </div>
                      <Space>
                        <Button
                          danger
                          loading={declining}
                          icon={<CloseCircleOutlined />}
                          onClick={() => void handleDecline()}
                        >
                          Confirm Decline
                        </Button>
                        <Button onClick={() => { setShowDeclineForm(false); setDeclineReason(''); }}>
                          Cancel
                        </Button>
                      </Space>
                    </Space>
                  )}
                </Card>
              </>
            )}
          </Space>
        )}
      </div>
    </div>
  );
}
