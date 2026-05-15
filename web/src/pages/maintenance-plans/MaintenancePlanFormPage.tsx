import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, Space, Row, Col, Spin, Select, Switch, DatePicker, Divider } from 'antd';
import { SaveOutlined, CloseOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import { useMaintenancePlan, useCreateMaintenancePlan, useUpdateMaintenancePlan } from '@/hooks/use-maintenance-plans';
import { useAssets } from '@/hooks/use-assets';
import type { CreateMaintenancePlanPayload, UpdateMaintenancePlanPayload } from '@/api/maintenance-plans.api';

const { TextArea } = Input;

export default function MaintenancePlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const isEdit = !!id;
  const preselectedAssetId = searchParams.get('asset_id');

  const { data: plan, isLoading } = useMaintenancePlan(id || '');
  const createMaintenancePlan = useCreateMaintenancePlan();
  const updateMaintenancePlan = useUpdateMaintenancePlan();
  const { data: assetsData } = useAssets({ take: 100 });

  const assets = assetsData?.data || [];

  useEffect(() => {
    if (plan && isEdit) {
      form.setFieldsValue({
        asset_id: plan.asset_id,
        name: plan.name,
        description: plan.description,
        frequency: plan.frequency,
        next_due_date: plan.next_due_date ? dayjs(plan.next_due_date) : null,
        last_completed_date: plan.last_completed_date ? dayjs(plan.last_completed_date) : null,
        auto_create_wo: plan.auto_create_wo,
        is_active: plan.is_active,
      });
    }
  }, [plan, isEdit, form]);

  const handleSubmit = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        next_due_date: values.next_due_date ? values.next_due_date.format('YYYY-MM-DD') : undefined,
      };

      if (isEdit) {
        // Update allows last_completed_date and is_active
        formattedValues.last_completed_date = values.last_completed_date
          ? values.last_completed_date.format('YYYY-MM-DD')
          : undefined;
        const payload: UpdateMaintenancePlanPayload = formattedValues;
        await updateMaintenancePlan.mutateAsync({ id: id!, ...payload });
      } else {
        // Create DTO doesn't accept last_completed_date or is_active
        delete formattedValues.last_completed_date;
        delete formattedValues.is_active;
        const payload: CreateMaintenancePlanPayload = formattedValues;
        await createMaintenancePlan.mutateAsync(payload);
      }
      navigate('/maintenance-plans');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const calculateNextDue = (frequency: string) => {
    const today = dayjs();
    switch (frequency) {
      case 'daily':
        return today.add(1, 'day');
      case 'weekly':
        return today.add(1, 'week');
      case 'monthly':
        return today.add(1, 'month');
      case 'quarterly':
        return today.add(3, 'months');
      case 'yearly':
        return today.add(1, 'year');
      default:
        return null;
    }
  };

  const handleFrequencyChange = (frequency: string) => {
    const nextDue = calculateNextDue(frequency);
    if (nextDue && !form.getFieldValue('next_due_date')) {
      form.setFieldsValue({ next_due_date: nextDue });
    }
  };

  if (isLoading && isEdit) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Maintenance Plan' : 'Add Maintenance Plan'}
        subtitle={isEdit ? `Editing "${plan?.name}"` : 'Create a new maintenance plan'}
        onBack={() => navigate('/maintenance-plans')}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          auto_create_wo: true,
          is_active: true,
          frequency: 'monthly',
          asset_id: preselectedAssetId || undefined,
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title="Plan Details" style={{ marginBottom: 24 }}>
              <Form.Item
                name="asset_id"
                label="Asset"
                rules={[{ required: true, message: 'Asset is required' }]}
              >
                <Select
                  placeholder="Select an asset"
                  showSearch
                  optionFilterProp="children"
                >
                  {assets.map((asset) => (
                    <Select.Option key={asset.id} value={asset.id}>
                      {asset.name} {asset.serial_number && `(${asset.serial_number})`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="name"
                label="Plan Name"
                rules={[{ required: true, message: 'Plan name is required' }]}
              >
                <Input placeholder="e.g., Monthly HVAC Inspection" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea
                  rows={4}
                  placeholder="Describe what maintenance activities should be performed..."
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="frequency"
                    label="Frequency"
                    rules={[{ required: true, message: 'Frequency is required' }]}
                  >
                    <Select
                      placeholder="Select frequency"
                      onChange={handleFrequencyChange}
                    >
                      <Select.Option value="daily">Daily</Select.Option>
                      <Select.Option value="weekly">Weekly</Select.Option>
                      <Select.Option value="monthly">Monthly</Select.Option>
                      <Select.Option value="quarterly">Quarterly</Select.Option>
                      <Select.Option value="yearly">Yearly</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Schedule Settings" style={{ marginBottom: 24 }}>
              <Form.Item
                name="next_due_date"
                label="Next Due Date"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Select next due date"
                />
              </Form.Item>

              <Form.Item
                name="last_completed_date"
                label="Last Completed Date"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Select last completed date"
                  disabledDate={(current) => current && current > dayjs()}
                />
              </Form.Item>

              <Divider />

              <Form.Item
                name="auto_create_wo"
                label="Auto Create Work Order"
                valuePropName="checked"
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>

              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  <CalendarOutlined /> Schedule Preview
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {form.getFieldValue('frequency') && (
                    <>
                      This plan will run <strong>{form.getFieldValue('frequency')}</strong>
                      {form.getFieldValue('next_due_date') && (
                        <>, next due on <strong>{form.getFieldValue('next_due_date')?.format('YYYY-MM-DD')}</strong></>
                      )}
                      {form.getFieldValue('auto_create_wo') && (
                        <div style={{ marginTop: 4 }}>
                          Work orders will be created automatically
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={createMaintenancePlan.isPending || updateMaintenancePlan.isPending}
            >
              {isEdit ? 'Update Plan' : 'Create Plan'}
            </Button>
            <Button
              onClick={() => navigate('/maintenance-plans')}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
}