import { Form, Input, Button, Card, Typography, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '@/hooks/use-auth';

const { Title, Text } = Typography;

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
        'Password must contain uppercase, lowercase, number, and special character',
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mutation = useResetPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    if (!token) return;
    mutation.mutate({ token, new_password: data.new_password });
  };

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-color)',
        }}
      >
        <Card style={{ width: 420 }}>
          <Result
            status="error"
            title="Invalid Reset Link"
            subTitle="The password reset link is invalid or missing a token. Please request a new one."
            extra={<Link to="/forgot-password">Request New Link</Link>}
          />
        </Card>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-color)',
        }}
      >
        <Card style={{ width: 420 }}>
          <Result
            status="success"
            title="Password Reset Successful"
            subTitle="Your password has been reset and all active sessions have been logged out. Please login with your new password."
            extra={
              <Link to="/login">
                <Button type="primary" size="large">
                  Go to Login
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
      }}
    >
      <Card style={{ width: 420, padding: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            Reset Password
          </Title>
          <Text type="secondary">Enter your new password below</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
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
              loading={mutation.isPending}
              block
              size="large"
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Link to="/login">Back to Login</Link>
        </div>
      </Card>
    </div>
  );
}
