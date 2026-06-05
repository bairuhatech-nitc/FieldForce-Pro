import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Spin,
  Alert,
  Form,
  Row,
  Col,
  Divider,
  message,
  Typography,
} from 'antd';
import {
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  DisconnectOutlined,
  TeamOutlined,
  EditOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import {
  emailChannelApi,
  type EmailChannelConfig,
  type UpsertEmailChannelPayload,
} from '@/api/email-channel.api';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    receiving: {
      color: '#52c41a',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      label: '🟢 Receiving',
    },
    error: {
      color: '#faad14',
      icon: <SyncOutlined spin style={{ color: '#faad14' }} />,
      label: '⚠️ Error',
    },
    not_receiving: {
      color: '#ff4d4f',
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      label: '🔴 Not Receiving',
    },
  };

  const c = config[status] || config.not_receiving;
  return (
    <Space>
      {c.icon}
      <Text strong style={{ color: c.color }}>{c.label}</Text>
    </Space>
  );
}

// ── Connection Method Cards ──────────────────────────────────────────────────

function ConnectionMethodSelector({
  selected,
  onSelect,
}: {
  selected: 'forwarding' | 'mailbox' | 'platform_provided';
  onSelect: (method: 'forwarding' | 'mailbox' | 'platform_provided') => void;
}) {
  const methods = [
    {
      key: 'forwarding' as const,
      icon: <MailOutlined style={{ fontSize: 36, color: '#1677ff' }} />,
      title: 'Email Forwarding',
      description:
        'Keep your existing inbox and set a rule to auto-forward a copy to our secure platform address. Easiest to set up.',
      badge: 'Recommended',
      badgeColor: 'blue',
    },
    {
      key: 'mailbox' as const,
      icon: <LinkOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
      title: 'Direct Mailbox (IMAP)',
      description:
        'Connect directly to your mailbox via secure OAuth (Google/Microsoft) or IMAP. Allows two-way threading from the real address.',
      badge: 'Coming Soon',
      badgeColor: 'purple',
    },
    {
      key: 'platform_provided' as const,
      icon: <ThunderboltOutlined style={{ fontSize: 36, color: '#13c2c2' }} />,
      title: 'Platform-Provided Address',
      description:
        'We issue an address like company@tickets.yourfsm.com that you publish or forward to. Zero email setup on your side.',
      badge: 'Easy',
      badgeColor: 'cyan',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {methods.map((m) => (
        <Col xs={24} md={8} key={m.key}>
          <Card
            hoverable
            onClick={() => m.key !== 'mailbox' && onSelect(m.key)}
            style={{
              borderColor: selected === m.key ? '#1677ff' : undefined,
              borderWidth: selected === m.key ? 2 : 1,
              background:
                selected === m.key
                  ? 'linear-gradient(135deg, rgba(22, 119, 255, 0.05), rgba(22, 119, 255, 0.02))'
                  : m.key === 'mailbox' ? 'rgba(0,0,0,0.02)' : undefined,
              cursor: m.key === 'mailbox' ? 'not-allowed' : 'pointer',
              opacity: m.key === 'mailbox' ? 0.6 : 1,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              {m.icon}
              <Title level={5} style={{ margin: '12px 0 4px' }}>{m.title}</Title>
              <Tag color={m.badgeColor}>{m.badge}</Tag>
              <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
                {m.description}
              </Paragraph>
              {selected === m.key && (
                <CheckCircleOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 8 }} />
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function EmailChannelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [channel, setChannel] = useState<EmailChannelConfig | null>(null);

  // Form state
  const [connectionMethod, setConnectionMethod] = useState<'forwarding' | 'mailbox' | 'platform_provided'>('forwarding');
  const [supportEmail, setSupportEmail] = useState('');
  const [platformEmail, setPlatformEmail] = useState('');
  const [replyFromName, setReplyFromName] = useState('Support Team');
  const [replyFromEmail, setReplyFromEmail] = useState('');
  const [ackTemplate, setAckTemplate] = useState(
    "Thanks for contacting us. We've logged your request as {ticket_number}.\n\n• Issue: {summary}\n• Category: {category}\n\nWe'll be in touch shortly. Just reply to this email if you have more details.",
  );
  const [clarificationTemplate, setClarificationTemplate] = useState(
    "Thanks for reaching out. So we can help quickly, could you tell us more about what exactly isn't working and where?\n\nWe've logged this as {ticket_number} in the meantime.",
  );
  const [categoryMapping, setCategoryMapping] = useState<string[]>([
    'General', 'Electrical', 'Plumbing', 'HVAC', 'IT', 'Cleaning', 'Other',
  ]);
  const [priorityRules, setPriorityRules] = useState<Record<string, unknown>>({
    keywords: { urgent: 'HIGH', emergency: 'CRITICAL', asap: 'HIGH', down: 'HIGH' },
  });
  const [defaultCategory, setDefaultCategory] = useState('General');
  const [defaultPriority, setDefaultPriority] = useState('MEDIUM');
  const [allowedSenders, setAllowedSenders] = useState<string[]>([]);
  const [blockedSenders, setBlockedSenders] = useState<string[]>(['no-reply@', 'noreply@', 'mailer-daemon@']);
  const [spamFilterEnabled, setSpamFilterEnabled] = useState(true);
  const [humanHandoffKeywords, setHumanHandoffKeywords] = useState<string[]>([
    'lawyer', 'legal', 'refund', 'sue', 'complaint',
  ]);
  const [handoffTeam, setHandoffTeam] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  // Category input
  const [newCategory, setNewCategory] = useState('');
  const [newBlockedSender, setNewBlockedSender] = useState('');
  const [newAllowedSender, setNewAllowedSender] = useState('');
  const [newHandoffKeyword, setNewHandoffKeyword] = useState('');
  const [newPriorityKeyword, setNewPriorityKeyword] = useState('');
  const [newPriorityLevel, setNewPriorityLevel] = useState('HIGH');

  // ── Load channel ────────────────────────────────────────────────────────────

  const loadChannel = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await emailChannelApi.getChannel();
      const ch = data?.data;
      if (ch) {
        setChannel(ch);
        setConnectionMethod(ch.connection_method as 'forwarding' | 'mailbox' | 'platform_provided');
        setSupportEmail(ch.support_email || '');
        setPlatformEmail(ch.platform_email || '');
        setReplyFromName(ch.reply_from_name || 'Support Team');
        setReplyFromEmail(ch.reply_from_email || '');
        setAckTemplate(ch.acknowledgement_template || '');
        setClarificationTemplate(ch.clarification_template || '');
        setCategoryMapping(ch.category_mapping || []);
        setPriorityRules(ch.priority_rules || { keywords: {} });
        setDefaultCategory(ch.default_category || 'General');
        setDefaultPriority(ch.default_priority || 'MEDIUM');
        setAllowedSenders(ch.allowed_senders || []);
        setBlockedSenders(ch.blocked_senders || []);
        setSpamFilterEnabled(ch.spam_filter_enabled ?? true);
        setHumanHandoffKeywords(ch.human_handoff_keywords || []);
        setHandoffTeam(ch.handoff_team || '');
        setIsActive(ch.is_active);
        setWebhookSecret(ch.webhook_secret || '');
      }
    } catch {
      // Not configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UpsertEmailChannelPayload = {
        connection_method: connectionMethod,
        support_email: supportEmail || undefined,
        platform_email: platformEmail || undefined,
        reply_from_name: replyFromName || undefined,
        reply_from_email: replyFromEmail || undefined,
        acknowledgement_template: ackTemplate,
        clarification_template: clarificationTemplate,
        category_mapping: categoryMapping,
        priority_rules: priorityRules,
        default_category: defaultCategory,
        default_priority: defaultPriority,
        allowed_senders: allowedSenders,
        blocked_senders: blockedSenders,
        spam_filter_enabled: spamFilterEnabled,
        human_handoff_keywords: humanHandoffKeywords,
        handoff_team: handoffTeam || undefined,
        is_active: isActive,
        webhook_secret: webhookSecret || undefined,
      };

      const { data } = await emailChannelApi.upsertChannel(payload);
      setChannel(data?.data || null);
      message.success('Email channel settings saved!');
    } catch (err: unknown) {
      message.error((err as Error)?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Test ────────────────────────────────────────────────────────────────────

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await emailChannelApi.testConnection();
      const result = data?.data;
      if (result?.success) {
        message.success(result.message);
        void loadChannel();
      } else {
        message.warning(result?.message || 'Connection test failed');
      }
    } catch (err: unknown) {
      message.error((err as Error)?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    try {
      await emailChannelApi.disconnect();
      message.info('Email channel disconnected');
      void loadChannel();
    } catch (err: unknown) {
      message.error((err as Error)?.message || 'Failed to disconnect');
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Email Channel"
        subtitle="Connect a support email to receive and auto-create service requests via AI"
      />

      {/* Status Banner */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
          border: '1px solid #bfdbfe',
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <MailOutlined style={{ fontSize: 40, color: '#1677ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {supportEmail || 'Email AI Support'}
                </Title>
                <StatusBadge status={channel?.status || 'not_receiving'} />
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Switch
                checked={isActive}
                onChange={setIsActive}
                checkedChildren="Active"
                unCheckedChildren="Inactive"
              />
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => void handleTest()}
                loading={testing}
                disabled={!channel}
              >
                Test
              </Button>
              {channel?.status === 'receiving' && (
                <Button
                  icon={<DisconnectOutlined />}
                  danger
                  onClick={() => void handleDisconnect()}
                >
                  Disconnect
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Config Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="connection"
          items={[
            {
              key: 'connection',
              label: (
                <span>
                  <LinkOutlined /> Connection
                </span>
              ),
              children: (
                <div>
                  <Title level={5}>Connection Method</Title>
                  <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                    Choose how emails reach the platform.
                  </Paragraph>

                  <ConnectionMethodSelector
                    selected={connectionMethod}
                    onSelect={setConnectionMethod}
                  />

                  <Divider />

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Support Email Address">
                        <Input
                          placeholder="e.g. support@fieldforce.com"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          prefix={<MailOutlined style={{ color: '#1677ff' }} />}
                        />
                      </Form.Item>
                    </Col>
                    {connectionMethod === 'platform_provided' && (
                      <Col xs={24} md={12}>
                        <Form.Item label="Platform-Provided Address">
                          <Input
                            placeholder="company@tickets.yourfsm.com"
                            value={platformEmail}
                            onChange={(e) => setPlatformEmail(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={24} md={12}>
                      <Form.Item label="Webhook Secret (for validating inbound requests)">
                        <Input.Password
                          placeholder="A secret token for webhook validation"
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {connectionMethod === 'forwarding' && (
                    <Alert
                      type="info"
                      showIcon
                      message="Forwarding Setup"
                      description={
                        <span>
                          Set your email inbox to auto-forward a copy of incoming emails to your
                          platform webhook URL:{' '}
                          <Text code copyable>
                            {`${window.location.origin}/api/email-channel/webhook/inbound`}
                          </Text>
                          <br />
                          Or use SendGrid Inbound Parse:{' '}
                          <Text code copyable>
                            {`${window.location.origin}/api/email-channel/webhook/sendgrid`}
                          </Text>
                        </span>
                      }
                      style={{ marginTop: 16 }}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'replies',
              label: (
                <span>
                  <EditOutlined /> Reply Templates
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Reply &quot;From&quot; Name">
                        <Input
                          placeholder="e.g. FieldForce Support"
                          value={replyFromName}
                          onChange={(e) => setReplyFromName(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Reply &quot;From&quot; Email">
                        <Input
                          placeholder="e.g. support@fieldforce.com"
                          value={replyFromEmail}
                          onChange={(e) => setReplyFromEmail(e.target.value)}
                          prefix={<MailOutlined />}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Acknowledgement Template (sent when ticket is created)">
                    <TextArea
                      rows={5}
                      value={ackTemplate}
                      onChange={(e) => setAckTemplate(e.target.value)}
                    />
                  </Form.Item>

                  <Form.Item label="Clarification Template (sent when info is missing)">
                    <TextArea
                      rows={4}
                      value={clarificationTemplate}
                      onChange={(e) => setClarificationTemplate(e.target.value)}
                    />
                  </Form.Item>

                  <Alert
                    type="info"
                    showIcon
                    message="Available placeholders: {ticket_number}, {summary}, {category}"
                    style={{ marginTop: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'classification',
              label: (
                <span>
                  <SettingOutlined /> AI Classification
                </span>
              ),
              children: (
                <div>
                  <Title level={5}>Categories</Title>
                  <Paragraph type="secondary">
                    Categories the AI can assign to incoming emails.
                  </Paragraph>

                  <div style={{ marginBottom: 16 }}>
                    {categoryMapping.map((cat) => (
                      <Tag
                        key={cat}
                        closable
                        onClose={() => setCategoryMapping((prev) => prev.filter((c) => c !== cat))}
                        style={{ marginBottom: 4 }}
                      >
                        {cat}
                      </Tag>
                    ))}
                  </div>
                  <Space>
                    <Input
                      placeholder="New category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onPressEnter={() => {
                        if (newCategory.trim() && !categoryMapping.includes(newCategory.trim())) {
                          setCategoryMapping((prev) => [...prev, newCategory.trim()]);
                          setNewCategory('');
                        }
                      }}
                      style={{ width: 200 }}
                    />
                    <Button
                      type="dashed"
                      onClick={() => {
                        if (newCategory.trim() && !categoryMapping.includes(newCategory.trim())) {
                          setCategoryMapping((prev) => [...prev, newCategory.trim()]);
                          setNewCategory('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Space>

                  <Divider />

                  <Title level={5}>Priority Rules</Title>
                  <Paragraph type="secondary">
                    Keywords that trigger higher priority (e.g. &quot;urgent&quot; → HIGH).
                  </Paragraph>

                  <div style={{ marginBottom: 16 }}>
                    {Object.entries(
                      (priorityRules.keywords as Record<string, string>) || {},
                    ).map(([keyword, level]) => (
                      <Tag
                        key={keyword}
                        closable
                        color={level === 'CRITICAL' ? 'red' : level === 'HIGH' ? 'orange' : 'blue'}
                        onClose={() => {
                          const keywords = { ...((priorityRules.keywords as Record<string, string>) || {}) };
                          delete keywords[keyword];
                          setPriorityRules({ ...priorityRules, keywords });
                        }}
                        style={{ marginBottom: 4 }}
                      >
                        &quot;{keyword}&quot; → {level}
                      </Tag>
                    ))}
                  </div>
                  <Space>
                    <Input
                      placeholder="Keyword"
                      value={newPriorityKeyword}
                      onChange={(e) => setNewPriorityKeyword(e.target.value)}
                      style={{ width: 150 }}
                    />
                    <Select
                      value={newPriorityLevel}
                      onChange={setNewPriorityLevel}
                      style={{ width: 120 }}
                      options={[
                        { value: 'HIGH', label: 'HIGH' },
                        { value: 'CRITICAL', label: 'CRITICAL' },
                      ]}
                    />
                    <Button
                      type="dashed"
                      onClick={() => {
                        if (newPriorityKeyword.trim()) {
                          setPriorityRules({
                            ...priorityRules,
                            keywords: {
                              ...((priorityRules.keywords as Record<string, string>) || {}),
                              [newPriorityKeyword.trim().toLowerCase()]: newPriorityLevel,
                            },
                          });
                          setNewPriorityKeyword('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Space>

                  <Divider />

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Default Category (when AI is unsure)">
                        <Select
                          value={defaultCategory}
                          onChange={setDefaultCategory}
                          options={categoryMapping.map((c) => ({ value: c, label: c }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Default Priority">
                        <Select
                          value={defaultPriority}
                          onChange={setDefaultPriority}
                          options={[
                            { value: 'LOW', label: 'Low' },
                            { value: 'MEDIUM', label: 'Medium' },
                            { value: 'HIGH', label: 'High' },
                            { value: 'CRITICAL', label: 'Urgent / Critical' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'filtering',
              label: (
                <span>
                  <FilterOutlined /> Sender Rules
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24}>
                      <Card size="small" style={{ borderRadius: 8 }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <div>
                            <Text strong>Spam & Auto-Reply Filtering</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Ignore out-of-office replies, bounce messages, and marketing emails
                            </Text>
                          </div>
                          <Switch
                            checked={spamFilterEnabled}
                            onChange={setSpamFilterEnabled}
                          />
                        </Space>
                      </Card>
                    </Col>
                  </Row>

                  <Title level={5}>Blocked Senders</Title>
                  <Paragraph type="secondary">
                    Emails matching these patterns will be ignored (e.g. no-reply@, noreply@).
                  </Paragraph>
                  <div style={{ marginBottom: 12 }}>
                    {blockedSenders.map((sender) => (
                      <Tag
                        key={sender}
                        closable
                        color="red"
                        onClose={() => setBlockedSenders((prev) => prev.filter((s) => s !== sender))}
                        style={{ marginBottom: 4 }}
                      >
                        {sender}
                      </Tag>
                    ))}
                  </div>
                  <Space>
                    <Input
                      placeholder="e.g. no-reply@"
                      value={newBlockedSender}
                      onChange={(e) => setNewBlockedSender(e.target.value)}
                      onPressEnter={() => {
                        if (newBlockedSender.trim()) {
                          setBlockedSenders((prev) => [...prev, newBlockedSender.trim()]);
                          setNewBlockedSender('');
                        }
                      }}
                      style={{ width: 250 }}
                    />
                    <Button
                      type="dashed"
                      onClick={() => {
                        if (newBlockedSender.trim()) {
                          setBlockedSenders((prev) => [...prev, newBlockedSender.trim()]);
                          setNewBlockedSender('');
                        }
                      }}
                    >
                      Block
                    </Button>
                  </Space>

                  <Divider />

                  <Title level={5}>Allowed Senders (Optional)</Title>
                  <Paragraph type="secondary">
                    If set, only emails from these domains/addresses will be processed. Leave empty to accept all.
                  </Paragraph>
                  <div style={{ marginBottom: 12 }}>
                    {allowedSenders.map((sender) => (
                      <Tag
                        key={sender}
                        closable
                        color="green"
                        onClose={() => setAllowedSenders((prev) => prev.filter((s) => s !== sender))}
                        style={{ marginBottom: 4 }}
                      >
                        {sender}
                      </Tag>
                    ))}
                    {allowedSenders.length === 0 && (
                      <Text type="secondary" italic>No allowlist — all senders accepted</Text>
                    )}
                  </div>
                  <Space>
                    <Input
                      placeholder="e.g. @acme.com"
                      value={newAllowedSender}
                      onChange={(e) => setNewAllowedSender(e.target.value)}
                      onPressEnter={() => {
                        if (newAllowedSender.trim()) {
                          setAllowedSenders((prev) => [...prev, newAllowedSender.trim()]);
                          setNewAllowedSender('');
                        }
                      }}
                      style={{ width: 250 }}
                    />
                    <Button
                      type="dashed"
                      onClick={() => {
                        if (newAllowedSender.trim()) {
                          setAllowedSenders((prev) => [...prev, newAllowedSender.trim()]);
                          setNewAllowedSender('');
                        }
                      }}
                    >
                      Allow
                    </Button>
                  </Space>
                </div>
              ),
            },
            {
              key: 'handoff',
              label: (
                <span>
                  <SafetyOutlined /> Human Handoff
                </span>
              ),
              children: (
                <div>
                  <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                    Emails containing these keywords will be flagged for human review instead of
                    auto-processing (e.g. legal threats, refund demands).
                  </Paragraph>

                  <div style={{ marginBottom: 16 }}>
                    {humanHandoffKeywords.map((kw) => (
                      <Tag
                        key={kw}
                        closable
                        color="orange"
                        onClose={() => setHumanHandoffKeywords((prev) => prev.filter((k) => k !== kw))}
                        style={{ marginBottom: 4 }}
                      >
                        {kw}
                      </Tag>
                    ))}
                  </div>
                  <Space>
                    <Input
                      placeholder="e.g. lawyer"
                      value={newHandoffKeyword}
                      onChange={(e) => setNewHandoffKeyword(e.target.value)}
                      onPressEnter={() => {
                        if (newHandoffKeyword.trim() && !humanHandoffKeywords.includes(newHandoffKeyword.trim())) {
                          setHumanHandoffKeywords((prev) => [...prev, newHandoffKeyword.trim()]);
                          setNewHandoffKeyword('');
                        }
                      }}
                      style={{ width: 200 }}
                    />
                    <Button
                      type="dashed"
                      onClick={() => {
                        if (newHandoffKeyword.trim() && !humanHandoffKeywords.includes(newHandoffKeyword.trim())) {
                          setHumanHandoffKeywords((prev) => [...prev, newHandoffKeyword.trim()]);
                          setNewHandoffKeyword('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </Space>

                  <Divider />

                  <Form.Item label="Handoff Team / Queue">
                    <Input
                      placeholder="e.g. Manager Queue"
                      value={handoffTeam}
                      onChange={(e) => setHandoffTeam(e.target.value)}
                      prefix={<TeamOutlined />}
                      style={{ maxWidth: 400 }}
                    />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <Divider />

        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            size="large"
            icon={<MailOutlined />}
            onClick={() => void handleSave()}
            loading={saving}
          >
            Save Email Channel Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
