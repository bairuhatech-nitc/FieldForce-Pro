import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Select, Spin, Space, Alert, Row, Col, Divider } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useUser, useCreateUser, useUpdateUser, useCompanyUsage } from '@/hooks/use-users';
import { useAllRoles } from '@/hooks/use-roles';
import { useSetting } from '@/hooks/use-settings';
import PageHeader from '@/components/common/PageHeader';

const baseSchema = z.object({
  first_name: z.string().min(1, 'userForm.validation.firstNameRequired').max(100),
  last_name: z.string().min(1, 'userForm.validation.lastNameRequired').max(100),
  email: z.string().email('userForm.validation.invalidEmail'),
  employee_id: z.string().max(50).optional().or(z.literal('')),
  role_id: z.string().optional().or(z.literal('')),
  territory_ids: z.array(z.string()).optional(),
  phone: z.string().max(20).optional().or(z.literal('')),
  mobile: z.string().max(20).optional().or(z.literal('')),
  street: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zip_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
});

const createSchema = baseSchema.extend({
  password: z
    .string()
    .min(8, 'userForm.validation.min8Characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'userForm.validation.weakPassword'),
});

const updateSchema = baseSchema.extend({
  password: z.string().optional().or(z.literal('')),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;
type UserFormData = CreateFormData | UpdateFormData;

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Europe/London', label: 'GMT / London' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

export default function UserFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: user, isLoading } = useUser(id || '');
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { data: usage } = useCompanyUsage();
  const { data: allRoles } = useAllRoles();
  const { data: territoriesSettingData } = useSetting('territories_settings');
  const territories: { id: string; name: string }[] =
    (territoriesSettingData?.value?.list as { id: string; name: string }[]) ?? [];

  const usageCurrent = usage?.usage?.total_users?.current;
  const usageLimit = usage?.usage?.total_users?.limit;
  const isLimitReached = !isEdit && usageLimit != null && usageCurrent != null && usageCurrent >= usageLimit;

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
      employee_id: '',
      role_id: '',
      territory_ids: [],
      phone: '',
      mobile: '',
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      timezone: 'UTC',
      language: 'en',
    },
  });

  useEffect(() => {
    if (user) {
      const firstRole = user.roles?.find((r): r is import('@/types/models.types').Role => typeof r !== 'string');
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: '',
        employee_id: user.employee_id || '',
        role_id: firstRole?.id || '',
        territory_ids: user.territory_ids ?? [],
        phone: user.phone || '',
        mobile: user.mobile || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || '',
        zip_code: user.zip_code || '',
        country: user.country || '',
        timezone: user.timezone,
        language: user.language,
      });
    }
  }, [user, reset]);

  const onSubmit = (data: UserFormData) => {
    const { role_id, ...rest } = data as CreateFormData & { role_id?: string };
    if (isEdit) {
      const { password, ...withoutPassword } = rest as CreateFormData;
      updateMutation.mutate(
        { id: id!, ...withoutPassword },
        { onSuccess: () => navigate(-1) },
      );
    } else {
      createMutation.mutate(rest, { onSuccess: () => navigate(-1) });
    }
  };

  if (isEdit && isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const formItemStyle = { marginBottom: 12 };

  return (
    <div>
      <PageHeader title={isEdit ? t('users.editUser') : t('users.createUser')} />

      {isLimitReached && (
        <Alert
          message="User Limit Reached"
          description="Your company has reached the maximum number of users allowed by your subscription plan."
          type="warning"
          showIcon
          style={{ maxWidth: 780, marginBottom: 16 }}
        />
      )}

      <Card style={{ maxWidth: 780 }}>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>

          {/* Basic Info */}
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: '#595959', marginTop: 0 }}>
            Basic Information
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('auth.firstName')}
                validateStatus={errors.first_name ? 'error' : ''}
                help={errors.first_name?.message ? t(errors.first_name.message) : undefined}
                style={formItemStyle}
              >
                <Controller name="first_name" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('auth.lastName')}
                validateStatus={errors.last_name ? 'error' : ''}
                help={errors.last_name?.message ? t(errors.last_name.message) : undefined}
                style={formItemStyle}
              >
                <Controller name="last_name" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={t('auth.email')}
                validateStatus={errors.email ? 'error' : ''}
                help={errors.email?.message ? t(errors.email.message) : undefined}
                style={formItemStyle}
              >
                <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
            {!isEdit && (
              <Col xs={24} sm={12}>
                <Form.Item
                  label={t('auth.password')}
                  validateStatus={errors.password ? 'error' : ''}
                  help={errors.password?.message ? t(errors.password.message) : undefined}
                  style={formItemStyle}
                >
                  <Controller name="password" control={control} render={({ field }) => <Input.Password {...field} />} />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Employee Id" style={formItemStyle}>
                <Controller
                  name="employee_id"
                  control={control}
                  render={({ field }) => <Input {...field} placeholder="e.g. EMP-0042" />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Profile" style={formItemStyle}>
                <Controller
                  name="role_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select a profile / role"
                      allowClear
                      options={(allRoles ?? []).map((r) => ({ value: r.id, label: r.name }))}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Territories" style={formItemStyle}>
                <Controller
                  name="territory_ids"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      mode="multiple"
                      placeholder="Select territories (optional)"
                      allowClear
                      options={territories.map((t) => ({ value: t.id, label: t.name }))}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Contact */}
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: '#595959' }}>
            Contact
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('auth.phone')} style={formItemStyle}>
                <Controller name="phone" control={control} render={({ field }) => <Input {...field} placeholder="+1 555 000 0000" />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Mobile" style={formItemStyle}>
                <Controller name="mobile" control={control} render={({ field }) => <Input {...field} placeholder="+1 555 000 0000" />} />
              </Form.Item>
            </Col>
          </Row>

          {/* Address */}
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: '#595959' }}>
            Address
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Street" style={formItemStyle}>
                <Controller name="street" control={control} render={({ field }) => <Input {...field} placeholder="123 Main St" />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="City" style={formItemStyle}>
                <Controller name="city" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="State" style={formItemStyle}>
                <Controller name="state" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Zip Code" style={formItemStyle}>
                <Controller name="zip_code" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Country" style={formItemStyle}>
                <Controller name="country" control={control} render={({ field }) => <Input {...field} />} />
              </Form.Item>
            </Col>
          </Row>

          {/* Preferences */}
          <Divider orientation="left" orientationMargin={0} style={{ fontSize: 13, color: '#595959' }}>
            Preferences
          </Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('userForm.timezone')} style={formItemStyle}>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => <Select {...field} options={TIMEZONES} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Language" style={formItemStyle}>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => <Select {...field} options={LANGUAGES} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={isLimitReached}
              >
                {isEdit ? t('common.save') : t('common.create')}
              </Button>
              <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
