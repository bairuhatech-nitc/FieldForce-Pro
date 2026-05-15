import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Select, Spin, Space } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/use-users';
import PageHeader from '@/components/common/PageHeader';

const createSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Weak password'),
  phone: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
});

const updateSchema = createSchema.omit({ password: true }).extend({
  password: z.string().optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof createSchema>;

export default function UserFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: user, isLoading } = useUser(id || '');
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      timezone: 'UTC',
      language: 'en',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        timezone: user.timezone,
        language: user.language,
      });
    }
  }, [user, reset]);

  const onSubmit = (data: UserFormData) => {
    if (isEdit) {
      const { password, ...rest } = data;
      updateMutation.mutate(
        { id: id!, ...rest },
        { onSuccess: () => navigate('/users') },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => navigate('/users') });
    }
  };

  if (isEdit && isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <PageHeader title={isEdit ? t('users.editUser') : t('users.createUser')} />

      <Card style={{ maxWidth: 600 }}>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item
            label={t('auth.firstName')}
            validateStatus={errors.first_name ? 'error' : ''}
            help={errors.first_name?.message}
          >
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.lastName')}
            validateStatus={errors.last_name ? 'error' : ''}
            help={errors.last_name?.message}
          >
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.email')}
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          {!isEdit && (
            <Form.Item
              label={t('auth.password')}
              validateStatus={errors.password ? 'error' : ''}
              help={errors.password?.message}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input.Password {...field} />
                )}
              />
            </Form.Item>
          )}

          <Form.Item label={t('auth.phone')}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item label="Timezone">
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' },
                    { value: 'Asia/Kolkata', label: 'India Standard Time' },
                    { value: 'Europe/London', label: 'GMT' },
                  ]}
                />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? t('common.save') : t('common.create')}
              </Button>
              <Button onClick={() => navigate('/users')}>{t('common.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
