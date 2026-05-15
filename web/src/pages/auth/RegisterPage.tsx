import { Form, Input, Button, Card, Typography, Space } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must contain uppercase, lowercase, number, and special character',
    ),
  company_name: z.string().min(1, 'Company name is required').max(255),
  phone: z.string().max(20).optional().or(z.literal('')),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      company_name: '',
      phone: '',
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(
      { ...data, phone: data.phone || undefined },
      { onSuccess: () => navigate('/dashboard') },
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card style={{ width: 480, padding: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            FieldForce Pro
          </Title>
          <Text type="secondary">{t('auth.register')}</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item
              label={t('auth.firstName')}
              validateStatus={errors.first_name ? 'error' : ''}
              help={errors.first_name?.message}
              style={{ flex: 1 }}
            >
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} prefix={<UserOutlined />} placeholder="John" size="large" />
                )}
              />
            </Form.Item>

            <Form.Item
              label={t('auth.lastName')}
              validateStatus={errors.last_name ? 'error' : ''}
              help={errors.last_name?.message}
              style={{ flex: 1 }}
            >
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Doe" size="large" />
                )}
              />
            </Form.Item>
          </Space>

          <Form.Item
            label={t('auth.email')}
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<MailOutlined />}
                  placeholder="you@example.com"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.password')}
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined />}
                  placeholder="Min 8 chars, uppercase, lowercase, number, special"
                  size="large"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.companyName')}
            validateStatus={errors.company_name ? 'error' : ''}
            help={errors.company_name?.message}
          >
            <Controller
              name="company_name"
              control={control}
              render={({ field }) => (
                <Input {...field} prefix={<BankOutlined />} placeholder="Acme Corp" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.phone')}
            validateStatus={errors.phone ? 'error' : ''}
            help={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="+1234567890 (optional)" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerMutation.isPending}
              block
              size="large"
            >
              {t('auth.register')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Space>
            <Text>{t('auth.hasAccount')}</Text>
            <Link to="/login">{t('auth.login')}</Link>
          </Space>
        </div>
      </Card>
    </div>
  );
}
