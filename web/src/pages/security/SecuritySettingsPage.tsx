import { useState } from 'react';
import {
  Tabs,
  Space,
  Alert,
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Form,
  Input,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SafetyOutlined,
  GlobalOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  LockOutlined,
  DeleteOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/common/PageHeader';
import MFASetupWizard from '@/components/security/MFASetupWizard';
import IPWhitelistManagement from '@/components/security/IPWhitelistManagement';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/utils/format-date';
// Tokens are now in HTTP-only cookies, not accessible from JavaScript
import {
  useSessions,
  useTerminateSession,
  useLogoutAll,
  useChangePassword,
} from '@/hooks/use-auth';
import type { LoginSession } from '@/types/models.types';

const { Text, Title } = Typography;

// --- Helpers ---

// Note: With HTTP-only cookies, we can't decode JWT from JavaScript
// The backend identifies the current session from the cookie automatically
function getCurrentSessionId(): string | null {
  return null; // Backend handles current session identification
}

const DEVICE_ICONS: Record<string, typeof LaptopOutlined> = {
  web: LaptopOutlined,
  mobile: MobileOutlined,
  tablet: TabletOutlined,
  desktop: DesktopOutlined,
};

// --- Change Password Schema ---

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
        'Must contain uppercase, lowercase, number, and special character',
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// --- Active Sessions Tab ---

function ActiveSessionsTab() {
  const { data: sessions = [], isLoading } = useSessions();
  const terminateMutation = useTerminateSession();
  const logoutAllMutation = useLogoutAll();
  const currentSessionId = getCurrentSessionId();

  const handleTerminate = (session: LoginSession) => {
    showConfirmDialog({
      title: 'Terminate Session',
      content: `Are you sure you want to terminate this session${session.device_name ? ` (${session.device_name})` : ''}?`,
      onOk: async () => {
        await terminateMutation.mutateAsync(session.id).catch(() => { });
      },
      danger: true,
    });
  };

  const handleTerminateAll = () => {
    showConfirmDialog({
      title: 'Terminate All Sessions',
      content:
        'This will log out all devices including the current one. You will be redirected to the login page. Continue?',
      onOk: async () => {
        await logoutAllMutation.mutateAsync().catch(() => { });
      },
      okText: 'Logout All Devices',
      danger: true,
    });
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  };

  const getSessionExpiry = (createdAt: string) => {
    const created = new Date(createdAt);
    const expiryDate = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMs < 0) return 'Expired';
    if (diffDays > 0) return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'Expires soon';
  };

  const cleanIpAddress = (ip: string | null | undefined): string => {
    if (!ip) return '';

    // Remove IPv6-mapped IPv4 prefix (::ffff:)
    if (ip.startsWith('::ffff:')) {
      return ip.replace('::ffff:', '');
    }

    // Convert IPv6 localhost to readable format
    if (ip === '::1') {
      return 'localhost';
    }

    return ip;
  };

  const getDeviceInfo = (session: LoginSession) => {
    const browser = session.browser || '';
    const deviceName = session.device_name || '';
    const os = session.os || '';

    // Determine device name
    let name = browser || deviceName || session.device_type || 'Web';

    // Add OS if available and not already in the name
    if (os && !name.toLowerCase().includes(os.toLowerCase())) {
      name = `${name} on ${os}`;
    }

    return name;
  };

  return (
    <div >
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <Title level={4} style={{ margin: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>
              Active sessions
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Manage devices logged into your account
            </Text>
          </div>
          {sessions.length > 1 && (
            <Button
              danger
              onClick={handleTerminateAll}
              loading={logoutAllMutation.isPending}
              size="small"
            >
              Terminate All
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card style={{ borderRadius: 12 }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">Loading sessions...</Text>
          </div>
        </Card>
      ) : sessions.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            description="No active sessions found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: 40 }}
          />
        </Card>
      ) : (
        <Card style={{ borderRadius: 12, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
          {sessions.map((session, index) => {
            const Icon = DEVICE_ICONS[session.device_type] || LaptopOutlined;
            // Current session is the most recently active (first in list)
            const isCurrent = index === 0;
            const deviceInfo = getDeviceInfo(session);
            const cleanIp = cleanIpAddress(session.ip_address);
            const location = session.location || cleanIp || 'Unknown location';
            const lastSeen = session.last_activity_at || session.created_at;

            return (
              <div key={session.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px 14px',
                    gap: 10,
                  }}
                >
                  {/* Device Icon */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: '#fafafa',
                      // border: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ fontSize: 20, color: '#595959' }} />
                  </div>

                  {/* Session Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div >
                      <Text strong style={{ fontSize: 12, color: '#262626' }}>
                        {deviceInfo}
                      </Text>
                    </div>
                    <div>
                      {isCurrent ? (
                        <div style={{ fontSize: 12 }}>
                          <Space size={4}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: '#52c41a',
                            }}>
                              <span style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: '#52c41a',
                                marginRight: 6,
                              }}></span>
                              Current session
                            </span>
                            {location && (
                              <>
                                <span style={{ color: '#d9d9d9' }}>·</span>
                                <Text type="secondary" style={{ fontSize: 12 }}>{location}</Text>
                              </>
                            )}
                          </Space>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {location} · Last seen {getRelativeTime(lastSeen)}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terminate Button */}
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => handleTerminate(session)}
                    loading={terminateMutation.isPending}
                    style={{ flexShrink: 0 }}
                  >
                    {isCurrent ? 'Sign out' : 'Revoke'}
                  </Button>
                </div>
                {index < sessions.length - 1 && (
                  <div style={{ borderBottom: '1px solid #f5f5f5' }} />
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// --- Change Password Tab ---

function ChangePasswordTab() {
  const changePasswordMutation = useChangePassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(
      { old_password: data.old_password, new_password: data.new_password },
      {
        onSuccess: () => {
          setSubmitted(true);
          reset();
        },
      },
    );
  };

  if (submitted && changePasswordMutation.isSuccess) {
    return null; // User will be redirected to login page by the hook
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>Change Password</span>
          </Space>
        }
      >
        <Alert
          message="Changing your password will terminate all active sessions on all devices. You will need to log in again."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div style={{ maxWidth: 480 }}>
          <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
            <Form.Item
              label="Current Password"
              validateStatus={errors.old_password ? 'error' : ''}
              help={errors.old_password?.message}
            >
              <Controller
                name="old_password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    placeholder="Enter current password"
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              validateStatus={errors.new_password ? 'error' : ''}
              help={errors.new_password?.message}
            >
              <Controller
                name="new_password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    placeholder="Enter new password"
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              validateStatus={errors.confirm_password ? 'error' : ''}
              help={errors.confirm_password?.message}
            >
              <Controller
                name="confirm_password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined />}
                    placeholder="Confirm new password"
                    size="large"
                  />
                )}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordMutation.isPending}
                size="large"
                icon={<KeyOutlined />}
              >
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
}

// --- Main Page ---

export default function SecuritySettingsPage() {
  const tabItems = [
    {
      key: 'sessions',
      label: (
        <Space>
          <LaptopOutlined />
          Active Sessions
        </Space>
      ),
      children: <ActiveSessionsTab />,
    },
    {
      key: 'password',
      label: (
        <Space>
          <KeyOutlined />
          Change Password
        </Space>
      ),
      children: <ChangePasswordTab />,
    },
    {
      key: 'mfa',
      label: (
        <Space>
          <SafetyOutlined />
          Multi-Factor Auth
        </Space>
      ),
      children: (
        <div>
          <Alert
            message="Multi-Factor Authentication"
            description="Add an extra layer of security to user accounts"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <MFASetupWizard />
        </div>
      ),
    },
    {
      key: 'ip-whitelist',
      label: (
        <Space>
          <GlobalOutlined />
          IP Whitelisting
        </Space>
      ),
      children: (
        <div>
          <Alert
            message="IP Whitelisting"
            description="Restrict access to specific IP addresses or ranges"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <IPWhitelistManagement />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Security Settings"
        subtitle="Manage sessions, passwords, and security policies"
      />

      <Tabs items={tabItems} defaultActiveKey="sessions" />
    </div>
  );
}
