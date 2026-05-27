import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Button, Space, Alert, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, LockOutlined, SaveOutlined, KeyOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/common/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { useChangePassword } from '@/hooks/use-auth';
import { useUpdateSuperAdminProfile, useChangeSuperAdminEmail } from '@/hooks/use-super-admin';
import { useGenerateMagicLink } from '@/hooks/use-magic-links';
import MagicLinkModal from '@/components/magic-links/MagicLinkModal';

// ── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
});

const emailSchema = z.object({
  new_email: z.string().trim().email('Enter a valid email address'),
  current_password: z.string().min(1, 'Password is required'),
});

const passwordSchema = z
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
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Profile Details Section ───────────────────────────────────────────────────

function ProfileDetailsCard() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateProfile = useUpdateSuperAdminProfile();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' },
  });

  useEffect(() => {
    if (user) reset({ first_name: user.first_name, last_name: user.last_name });
  }, [user, reset]);

  const onSubmit = (data: ProfileForm) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        if (user) setUser({ ...user, first_name: data.first_name, last_name: data.last_name });
      },
    });
  };

  return (
    <Card
      title={<Space><UserOutlined /><span>Profile Details</span></Space>}
      style={{ marginBottom: 24 }}
    >
      <div style={{ maxWidth: 480 }}>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                validateStatus={errors.first_name ? 'error' : ''}
                help={errors.first_name?.message}
              >
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} prefix={<UserOutlined />} placeholder="First name" size="large" />
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                validateStatus={errors.last_name ? 'error' : ''}
                help={errors.last_name?.message}
              >
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} prefix={<UserOutlined />} placeholder="Last name" size="large" />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateProfile.isPending}
              size="large"
              icon={<SaveOutlined />}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
}

// ── Change Email Section ──────────────────────────────────────────────────────

function ChangeEmailCard() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const changeEmail = useChangeSuperAdminEmail();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: '', current_password: '' },
  });

  const onSubmit = (data: EmailForm) => {
    changeEmail.mutate(data, {
      onSuccess: (res) => {
        const newEmail = res.data.data?.email ?? data.new_email;
        if (user) setUser({ ...user, email: newEmail });
        reset();
      },
    });
  };

  return (
    <Card
      title={<Space><MailOutlined /><span>Change Email</span></Space>}
      style={{ marginBottom: 24 }}
    >
      <div style={{ maxWidth: 480 }}>
        <Form.Item label="Current Email">
          <Input
            value={user?.email ?? ''}
            disabled
            prefix={<MailOutlined />}
            size="large"
          />
        </Form.Item>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item
            label="New Email Address"
            validateStatus={errors.new_email ? 'error' : ''}
            help={errors.new_email?.message}
          >
            <Controller
              name="new_email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined />}
                  placeholder="new@example.com"
                  size="large"
                  autoComplete="off"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Confirm with Current Password"
            validateStatus={errors.current_password ? 'error' : ''}
            help={errors.current_password?.message}
          >
            <Controller
              name="current_password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined />}
                  placeholder="Enter your current password"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={changeEmail.isPending}
              size="large"
              icon={<MailOutlined />}
            >
              Update Email
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
}

// ── Change Password Section ───────────────────────────────────────────────────

function ChangePasswordCard() {
  const changePasswordMutation = useChangePassword();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate(
      { old_password: data.old_password, new_password: data.new_password },
      { onSuccess: () => reset() },
    );
  };

  return (
    <Card title={<Space><KeyOutlined /><span>Change Password</span></Space>}>
      <Alert
        message="Changing your password will terminate all active sessions. You will need to log in again."
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
  );
}

// ── Super Admin Magic Link Section ───────────────────────────────────────────

function SuperAdminMagicLinkCard() {
  const user = useAuthStore((s) => s.user);
  const generateLink = useGenerateMagicLink();
  const [modalData, setModalData] = useState<{ link: string; expiresAt: string; purpose: string } | null>(null);

  const handleGenerate = () => {
    if (!user) return;
    generateLink.mutate(
      { target_user_id: user.id, purpose: 'super_admin_access' },
      {
        onSuccess: (res) => {
          const data = res.data.data;
          if (data) setModalData({ link: data.link, expiresAt: data.expires_at, purpose: data.purpose });
        },
      },
    );
  };

  return (
    <>
      <Card
        title={<Space><LinkOutlined /><span>Super Admin Access Link</span></Space>}
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="Generates a one-time magic link valid for 15 minutes that logs in directly as your super admin account."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button
          type="primary"
          icon={<LinkOutlined />}
          loading={generateLink.isPending}
          onClick={handleGenerate}
          size="large"
        >
          Generate Super Admin Access Link
        </Button>
      </Card>

      {modalData && (
        <MagicLinkModal
          open={!!modalData}
          onClose={() => setModalData(null)}
          link={modalData.link}
          expiresAt={modalData.expiresAt}
          purpose={modalData.purpose}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/tenants')}
          style={{ paddingLeft: 0 }}
        >
          Back to Dashboard
        </Button>
      </div>

      <PageHeader
        title="My Profile"
        subtitle={`Signed in as ${user?.email ?? ''}`}
      />

      <ProfileDetailsCard />
      <ChangeEmailCard />
      <ChangePasswordCard />
      <SuperAdminMagicLinkCard />
    </div>
  );
}
