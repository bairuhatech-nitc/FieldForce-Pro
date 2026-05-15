import { useState } from 'react';
import {
  Card,
  Steps,
  Button,
  Space,
  Input,
  Alert,
  Typography,
  Tag,
  Modal,
  Spin,
  QRCode,
  Radio,
  message,
} from 'antd';
import {
  MailOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  MobileOutlined,
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';

const { Title, Text, Paragraph } = Typography;

type MFAMethod = 'email' | 'totp';

export default function MFASetupWizard() {
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>('email');
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailSetupToken, setEmailSetupToken] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUrl, setTotpUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const { data: mfaStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: async () => {
      const res = await authApi.getMFAStatus();
      return res.data.data!;
    },
  });

  // ─── Email MFA mutations ──────────────────────────────────

  const setupEmailMutation = useMutation({
    mutationFn: () => authApi.setupMFA(),
    onSuccess: (res) => {
      const data = res.data.data!;
      setEmailSetupToken(data.token);
      setCurrentStep(2);
    },
  });

  const enableEmailMutation = useMutation({
    mutationFn: (code: string) => authApi.enableMFA(emailSetupToken, code),
    onSuccess: (res) => {
      const codes = res.data.data?.recovery_codes ?? [];
      setRecoveryCodes(codes);
      setCurrentStep(3);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
    },
  });

  // ─── TOTP MFA mutations ──────────────────────────────────

  const setupTOTPMutation = useMutation({
    mutationFn: () => authApi.setupTOTP(),
    onSuccess: (res) => {
      const data = res.data.data!;
      setTotpSecret(data.secret);
      setTotpUrl(data.otpauth_url);
      setCurrentStep(2);
    },
  });

  const enableTOTPMutation = useMutation({
    mutationFn: (code: string) => authApi.enableTOTP(code),
    onSuccess: (res) => {
      const codes = res.data.data?.recovery_codes ?? [];
      setRecoveryCodes(codes);
      setCurrentStep(3);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
    },
  });

  // ─── Disable MFA ──────────────────────────────────────────

  const disableMutation = useMutation({
    mutationFn: () => authApi.disableMFA(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => authApi.regenerateRecoveryCodes(),
    onSuccess: (res) => {
      const codes = res.data.data?.recovery_codes ?? [];
      setRecoveryCodes(codes);
      queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
    },
  });

  const mfaEnabled = mfaStatus?.mfa_enabled ?? false;
  const activeMethod = mfaStatus?.mfa_method ?? null;

  const handleChooseMethod = () => {
    setCurrentStep(1);
    setVerificationCode('');
    if (selectedMethod === 'email') {
      setupEmailMutation.mutate();
    } else {
      setupTOTPMutation.mutate();
    }
  };

  const handleVerifyAndEnable = () => {
    if (selectedMethod === 'email') {
      enableEmailMutation.mutate(verificationCode);
    } else {
      enableTOTPMutation.mutate(verificationCode);
    }
  };

  const handleFinish = () => {
    setCurrentStep(0);
    setVerificationCode('');
    setEmailSetupToken('');
    setTotpSecret('');
    setTotpUrl('');
    setRecoveryCodes([]);
  };

  const handleCopyRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    message.success('Recovery codes copied to clipboard');
  };

  const handleDownloadRecoveryCodes = () => {
    const text = `FieldForce Pro Recovery Codes\n${'='.repeat(30)}\n\nSave these codes in a safe place.\nEach code can only be used once.\n\n${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fieldforce-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateRecoveryCodes = () => {
    Modal.confirm({
      title: 'Regenerate Recovery Codes',
      content: 'This will invalidate all existing recovery codes and generate new ones. Are you sure?',
      onOk: () => regenerateMutation.mutate(),
    });
  };

  const handleDisable = () => {
    Modal.confirm({
      title: 'Disable MFA',
      content: 'Are you sure you want to disable multi-factor authentication? This will make your account less secure.',
      okButtonProps: { danger: true },
      onOk: () => disableMutation.mutate(),
    });
  };

  const isSetupLoading = setupEmailMutation.isPending || setupTOTPMutation.isPending;
  const isEnableLoading = enableEmailMutation.isPending || enableTOTPMutation.isPending;
  const enableError = selectedMethod === 'email' ? enableEmailMutation : enableTOTPMutation;

  if (statusLoading) {
    return <Spin />;
  }

  return (
    <div>
      {/* Current MFA Status */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Multi-Factor Authentication Status
              </Title>
              <Text type="secondary">
                {mfaEnabled ? 'MFA is currently enabled' : 'MFA is currently disabled'}
              </Text>
            </div>
            <Tag color={mfaEnabled ? 'success' : 'default'} icon={<SafetyOutlined />}>
              {mfaEnabled ? 'ENABLED' : 'DISABLED'}
            </Tag>
          </div>

          {mfaEnabled && (
            <div>
              <Alert
                message={
                  activeMethod === 'totp'
                    ? 'Your account is protected with authenticator app (TOTP) multi-factor authentication'
                    : 'Your account is protected with email-based multi-factor authentication'
                }
                type="success"
                showIcon
                icon={activeMethod === 'totp' ? <MobileOutlined /> : <MailOutlined />}
              />
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Active method: </Text>
                <Tag color="blue">
                  {activeMethod === 'totp' ? 'Authenticator App' : 'Email OTP'}
                </Tag>
              </div>
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Recovery codes remaining: </Text>
                <Tag color={
                  (mfaStatus?.recovery_codes_remaining ?? 0) <= 2 ? 'error' :
                  (mfaStatus?.recovery_codes_remaining ?? 0) <= 4 ? 'warning' : 'success'
                }>
                  {mfaStatus?.recovery_codes_remaining ?? 0}
                </Tag>
              </div>
              <Space style={{ marginTop: 16 }}>
                <Button
                  icon={<ReloadOutlined />}
                  loading={regenerateMutation.isPending}
                  onClick={handleRegenerateRecoveryCodes}
                >
                  Regenerate Recovery Codes
                </Button>
                <Button
                  danger
                  loading={disableMutation.isPending}
                  onClick={handleDisable}
                >
                  Disable MFA
                </Button>
              </Space>
              {recoveryCodes.length > 0 && (
                <Card size="small" style={{ marginTop: 16, background: '#fffbe6', borderColor: '#ffe58f' }}>
                  <Alert
                    message="Save your recovery codes"
                    description="These codes can be used to access your account if you lose your MFA device. Each code can only be used once. You won't see these again."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      padding: 16,
                      background: '#fff',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 16,
                      marginBottom: 16,
                    }}
                  >
                    {recoveryCodes.map((code) => (
                      <div key={code} style={{ padding: '4px 0' }}>{code}</div>
                    ))}
                  </div>
                  <Space>
                    <Button icon={<CopyOutlined />} onClick={handleCopyRecoveryCodes}>
                      Copy All
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadRecoveryCodes}>
                      Download .txt
                    </Button>
                  </Space>
                </Card>
              )}
            </div>
          )}
        </Space>
      </Card>

      {!mfaEnabled && (
        <Card title="Setup Multi-Factor Authentication">
          <Steps
            current={currentStep}
            style={{ marginBottom: 32 }}
            items={[
              { title: 'Choose Method' },
              { title: 'Setup' },
              { title: 'Verify' },
              { title: 'Done' },
            ]}
          />

          {/* Step 0: Choose Method */}
          {currentStep === 0 && (
            <div>
              <Title level={5}>Choose Your MFA Method</Title>
              <Paragraph>
                Select how you want to receive verification codes when you sign in.
              </Paragraph>

              <Radio.Group
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                style={{ width: '100%', marginBottom: 24 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Card
                    hoverable
                    size="small"
                    style={{
                      border: selectedMethod === 'email' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedMethod('email')}
                  >
                    <Radio value="email">
                      <Space>
                        <MailOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                        <div>
                          <Text strong>Email OTP</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Receive a 6-digit code via email each time you log in
                          </Text>
                        </div>
                      </Space>
                    </Radio>
                  </Card>

                  <Card
                    hoverable
                    size="small"
                    style={{
                      border: selectedMethod === 'totp' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedMethod('totp')}
                  >
                    <Radio value="totp">
                      <Space>
                        <MobileOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                        <div>
                          <Text strong>Authenticator App</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Use Google Authenticator, Authy, or similar app for codes
                          </Text>
                        </div>
                      </Space>
                    </Radio>
                  </Card>
                </Space>
              </Radio.Group>

              <Button
                type="primary"
                loading={isSetupLoading}
                onClick={handleChooseMethod}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 1: Setup (loading / transition) */}
          {currentStep === 1 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                Setting up {selectedMethod === 'totp' ? 'authenticator app' : 'email'} MFA...
              </Paragraph>
            </div>
          )}

          {/* Step 2: Verify */}
          {currentStep === 2 && selectedMethod === 'email' && (
            <div>
              <Title level={5}>Enter Verification Code</Title>
              <Paragraph>
                A 6-digit verification code has been sent to your email. Enter it below to enable MFA.
              </Paragraph>

              <Input
                size="large"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ width: 200, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 24 }}
              />

              {enableError.isError && (
                <Alert
                  message={
                    (enableError.error as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message?.includes('expired')
                      ? 'Code expired. A new code has been sent to your email. Please enter the new code.'
                      : 'Invalid code. Please check and try again.'
                  }
                  type={
                    (enableError.error as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message?.includes('expired')
                      ? 'warning'
                      : 'error'
                  }
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <div>
                <Space>
                  <Button onClick={() => { setCurrentStep(0); setVerificationCode(''); setEmailSetupToken(''); }}>
                    Back
                  </Button>
                  <Button
                    type="primary"
                    loading={isEnableLoading}
                    disabled={verificationCode.length !== 6}
                    onClick={handleVerifyAndEnable}
                  >
                    Verify & Enable MFA
                  </Button>
                  <Button
                    type="link"
                    loading={setupEmailMutation.isPending}
                    onClick={() => setupEmailMutation.mutate()}
                  >
                    Resend Code
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {currentStep === 2 && selectedMethod === 'totp' && (
            <div>
              <Title level={5}>Scan QR Code</Title>
              <Paragraph>
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.
                Then enter the 6-digit code shown in the app.
              </Paragraph>

              <div style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                  <QRCode value={totpUrl} size={200} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Alert
                    message="Can't scan the QR code?"
                    description={
                      <div>
                        <Text type="secondary">Manually enter this key in your app:</Text>
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            wordBreak: 'break-all',
                            userSelect: 'all',
                          }}
                        >
                          {totpSecret}
                        </div>
                      </div>
                    }
                    type="info"
                    style={{ marginBottom: 16 }}
                  />
                </div>
              </div>

              <Title level={5}>Enter Verification Code</Title>
              <Paragraph>
                Enter the 6-digit code from your authenticator app to confirm setup.
              </Paragraph>

              <Input
                size="large"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ width: 200, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 24 }}
              />

              {enableError.isError && (
                <Alert
                  message="Invalid code. Please check your authenticator app and try again."
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <div>
                <Space>
                  <Button onClick={() => { setCurrentStep(0); setVerificationCode(''); setTotpSecret(''); setTotpUrl(''); }}>
                    Back
                  </Button>
                  <Button
                    type="primary"
                    loading={isEnableLoading}
                    disabled={verificationCode.length !== 6}
                    onClick={handleVerifyAndEnable}
                  >
                    Verify & Enable MFA
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* Step 3: Done — show recovery codes */}
          {currentStep === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>MFA Enabled</Title>
                <Paragraph>
                  {selectedMethod === 'totp'
                    ? 'Authenticator app MFA has been enabled.'
                    : 'Email-based MFA has been enabled.'}
                </Paragraph>
              </div>

              {recoveryCodes.length > 0 && (
                <Card size="small" style={{ marginBottom: 24, background: '#fffbe6', borderColor: '#ffe58f' }}>
                  <Alert
                    message="Save your recovery codes"
                    description="These codes can be used to access your account if you lose your MFA device. Each code can only be used once. You won't see these again."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      padding: 16,
                      background: '#fff',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 16,
                      marginBottom: 16,
                    }}
                  >
                    {recoveryCodes.map((code) => (
                      <div key={code} style={{ padding: '4px 0' }}>{code}</div>
                    ))}
                  </div>
                  <Space>
                    <Button icon={<CopyOutlined />} onClick={handleCopyRecoveryCodes}>
                      Copy All
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadRecoveryCodes}>
                      Download .txt
                    </Button>
                  </Space>
                </Card>
              )}

              <div style={{ textAlign: 'center' }}>
                <Button type="primary" size="large" onClick={handleFinish}>
                  I've saved my codes — Done
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
