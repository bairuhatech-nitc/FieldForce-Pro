import { useState } from 'react';
import { Card, Form, Switch, Button, Space, Divider, Typography, Select, TimePicker, Alert } from 'antd';
import { SaveOutlined, BellOutlined, MailOutlined, MessageOutlined, MobileOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useNotificationStore } from '@/store/notification.store';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Text } = Typography;

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;

  // Event-specific preferences
  work_order_assigned: { email: boolean; sms: boolean; push: boolean };
  work_order_completed: { email: boolean; sms: boolean; push: boolean };
  appointment_scheduled: { email: boolean; sms: boolean; push: boolean };
  appointment_reminder: { email: boolean; sms: boolean; push: boolean };
  estimate_approved: { email: boolean; sms: boolean; push: boolean };
  invoice_generated: { email: boolean; sms: boolean; push: boolean };
  payment_received: { email: boolean; sms: boolean; push: boolean };

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: Dayjs | string;
  quiet_hours_end: Dayjs | string;

  // Digest settings
  daily_digest_enabled: boolean;
  daily_digest_time: Dayjs | string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: number;
}

export default function NotificationPreferencesPage() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const addNotification = useNotificationStore((s) => s.add);

  // Mock data - replace with actual API call
  const initialValues: NotificationPreferences = {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,

    work_order_assigned: { email: true, sms: false, push: true },
    work_order_completed: { email: true, sms: false, push: true },
    appointment_scheduled: { email: true, sms: true, push: true },
    appointment_reminder: { email: true, sms: true, push: true },
    estimate_approved: { email: true, sms: false, push: true },
    invoice_generated: { email: true, sms: false, push: false },
    payment_received: { email: true, sms: false, push: true },

    quiet_hours_enabled: false,
    quiet_hours_start: dayjs('22:00', 'HH:mm'),
    quiet_hours_end: dayjs('08:00', 'HH:mm'),

    daily_digest_enabled: true,
    daily_digest_time: dayjs('18:00', 'HH:mm'),
    weekly_digest_enabled: false,
    weekly_digest_day: 1,
  };

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addNotification({ type: 'success', message: 'Notification preferences saved successfully' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const NotificationChannelRow = ({
    label,
    fieldPrefix,
  }: {
    label: string;
    fieldPrefix: string;
  }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Text>{label}</Text>
      <Space size="large">
        <Form.Item
          name={[fieldPrefix, 'email']}
          valuePropName="checked"
          noStyle
        >
          <Switch checkedChildren={<MailOutlined />} unCheckedChildren={<MailOutlined />} />
        </Form.Item>
        <Form.Item
          name={[fieldPrefix, 'sms']}
          valuePropName="checked"
          noStyle
        >
          <Switch checkedChildren={<MessageOutlined />} unCheckedChildren={<MessageOutlined />} />
        </Form.Item>
        <Form.Item
          name={[fieldPrefix, 'push']}
          valuePropName="checked"
          noStyle
        >
          <Switch checkedChildren={<MobileOutlined />} unCheckedChildren={<MobileOutlined />} />
        </Form.Item>
      </Space>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Notification Preferences"
        subtitle="Configure how and when you receive notifications"
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={initialValues}>
        <Card title="Global Settings" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Email Notifications</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Receive notifications via email
                  </Text>
                </div>
              </div>
              <Form.Item name="email_enabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>SMS Notifications</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Receive notifications via text message
                  </Text>
                </div>
              </div>
              <Form.Item name="sms_enabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Push Notifications</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Receive push notifications on mobile devices
                  </Text>
                </div>
              </div>
              <Form.Item name="push_enabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>In-App Notifications</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Show notification bell in the app
                  </Text>
                </div>
              </div>
              <Form.Item name="in_app_enabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </Space>
        </Card>

        <Card title="Event Notifications" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Space size="large">
              <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>SMS</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>Push</Text>
            </Space>
          </div>

          <NotificationChannelRow label="Work Order Assigned" fieldPrefix="work_order_assigned" />
          <NotificationChannelRow label="Work Order Completed" fieldPrefix="work_order_completed" />
          <NotificationChannelRow label="Appointment Scheduled" fieldPrefix="appointment_scheduled" />
          <NotificationChannelRow label="Appointment Reminder" fieldPrefix="appointment_reminder" />
          <NotificationChannelRow label="Estimate Approved" fieldPrefix="estimate_approved" />
          <NotificationChannelRow label="Invoice Generated" fieldPrefix="invoice_generated" />
          <NotificationChannelRow label="Payment Received" fieldPrefix="payment_received" />
        </Card>

        <Card title="Quiet Hours" style={{ marginBottom: 24 }}>
          <Form.Item
            name="quiet_hours_enabled"
            label="Enable Quiet Hours"
            valuePropName="checked"
          >
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>

          <Alert
            message="Notifications will not be sent during quiet hours"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space size="large">
            <Form.Item name="quiet_hours_start" label="Start Time">
              <TimePicker
                format="HH:mm"
                style={{ width: 120 }}
              />
            </Form.Item>
            <Form.Item name="quiet_hours_end" label="End Time">
              <TimePicker
                format="HH:mm"
                style={{ width: 120 }}
              />
            </Form.Item>
          </Space>
        </Card>

        <Card title="Digest Notifications" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Daily Digest</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Receive a daily summary of all notifications
                  </Text>
                </div>
              </div>
              <Space>
                <Form.Item name="daily_digest_time" noStyle>
                  <TimePicker format="HH:mm" style={{ width: 120 }} />
                </Form.Item>
                <Form.Item name="daily_digest_enabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Space>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Weekly Digest</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Receive a weekly summary
                  </Text>
                </div>
              </div>
              <Space>
                <Form.Item name="weekly_digest_day" noStyle>
                  <Select style={{ width: 140 }}>
                    <Select.Option value={1}>Monday</Select.Option>
                    <Select.Option value={2}>Tuesday</Select.Option>
                    <Select.Option value={3}>Wednesday</Select.Option>
                    <Select.Option value={4}>Thursday</Select.Option>
                    <Select.Option value={5}>Friday</Select.Option>
                    <Select.Option value={6}>Saturday</Select.Option>
                    <Select.Option value={0}>Sunday</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="weekly_digest_enabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Space>
            </div>
          </Space>
        </Card>

        <Card>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save Preferences
          </Button>
        </Card>
      </Form>
    </div>
  );
}