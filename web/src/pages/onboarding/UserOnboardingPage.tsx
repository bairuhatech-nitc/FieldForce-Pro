import { useEffect } from 'react';
import { Card, Form, Input, Button, Space, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, CheckOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCompleteOnboarding } from '@/hooks/use-magic-links';
import { useAuthStore } from '@/store/auth.store';

const { Title, Text } = Typography;

const schema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    phone: z.string().trim().max(30).optional(),
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

type FormValues = z.infer<typeof schema>;

export default function UserOnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  // If onboarding is already done, go to dashboard
  useEffect(() => {
    if (user?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    completeOnboarding.mutate(
      {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
        new_password: data.new_password,
      },
      {
        onSuccess: () => {
          if (user) {
            setUser({ ...user, first_name: data.first_name, last_name: data.last_name });
          }
          navigate('/dashboard', { replace: true });
        },
      },
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }} size={4}>
          <Title level={3} style={{ margin: 0 }}>
            Welcome to FieldForce Pro
          </Title>
          <Text type="secondary">Complete your profile to activate your account.</Text>
        </Space>

        <Alert
          message="You've been invited to join the team"
          description="Set your name, phone, and create a password to get started."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
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

          <Form.Item
            label="Phone (optional)"
            validateStatus={errors.phone ? 'error' : ''}
            help={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input {...field} prefix={<PhoneOutlined />} placeholder="+1 555 000 0000" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Password"
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
                  placeholder="Create a strong password"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
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
                  placeholder="Confirm your password"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={completeOnboarding.isPending}
              size="large"
              icon={<CheckOutlined />}
              block
            >
              Activate Account
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
