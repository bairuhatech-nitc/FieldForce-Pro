import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  InputNumber,
  Switch,
  Skeleton,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import {
  useWorkflowTemplate,
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplate,
} from '@/hooks/use-workflow';
import { useUsers } from '@/hooks/use-users';
import type { User } from '@/types/models.types';
import type { CreateWorkflowTemplatePayload, UpdateWorkflowTemplatePayload } from '@/types/workflow.types';

const documentTypes = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'DRAFT_INVOICE', label: 'Draft Invoice' },
  { value: 'PRQ', label: 'PRQ' },
  { value: 'PO', label: 'PO' },
  { value: 'PROFORMA', label: 'Proforma' },
  { value: 'PAYMENT_REQUEST', label: 'Payment Request' },
  { value: 'SERVICE_CONTRACT', label: 'Service Contract' },
  { value: 'PETTY_CASH', label: 'Petty Cash' },
  { value: 'PURCHASE_REQUEST', label: 'Purchase Request' },
  { value: 'SERVICE_REQUEST', label: 'Service Request' },
  { value: 'PETTY_CASH_REPORT', label: 'Petty Cash Report' },
  { value: 'RESOURCE_BOOKING', label: 'Resource Booking' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'WORK_ORDER', label: 'Work Order' },
  { value: 'ESTIMATE', label: 'Estimates' },
  { value: 'ESTIMATE_APPROVAL', label: 'Estimate Approve' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'SCHEDULE', label: 'Schedule (Service Appointment)' },
  { value: 'FIELD_WORKFLOW', label: 'Field Workflow (Technician Session)' },
  { value: 'JOB_SHEET', label: 'Job Sheets' },
  { value: 'JOB_SHEET_APPROVAL', label: 'Job Sheet Approval' },
];

const documentCategories = [
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'PROGRAM', label: 'Program' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'OTHER', label: 'Other' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'APPROVEL', label: 'Approve' },
];

export default function WorkflowTemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: template, isLoading: templateLoading } = useWorkflowTemplate(id || '');
  const { data: usersData } = useUsers({ take: 100 });
  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowTemplate();

  const users = usersData?.data || [];

  useEffect(() => {
    if (isEdit && template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        document_type: template.document_type,
        document_category: template.document_category,
        approvers: template.approvers?.map((a) => ({
          approver_id: a.approver_id,
          order_no: a.order_no,
          approval_authority: a.approval_authority,
          amount_threshold_min: a.amount_threshold_min,
          amount_threshold_max: a.amount_threshold_max,
          budget_threshold: a.budget_threshold,
          is_required: a.is_required,
          notes: a.notes,
        })),
      });
    }
  }, [isEdit, template, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      name: values.name as string,
      description: values.description as string,
      document_type: values.document_type,
      document_category: values.document_category,
      approvers: values.approvers,
    };

    if (isEdit) {
      await updateMutation.mutateAsync({ id, ...payload } as UpdateWorkflowTemplatePayload & { id: string });
    } else {
      await createMutation.mutateAsync(payload as CreateWorkflowTemplatePayload);
    }
    navigate('/workflow/templates');
  };

  if (isEdit && templateLoading) {
    return <div style={{ padding: 24 }}><Skeleton active /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>{isEdit ? 'Edit Workflow Template' : 'Create Workflow Template'}</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ approvers: [{ order_no: 1, is_required: true }] }}
      >
        <Card title="Template Details" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter a template name' }]}
          >
            <Input placeholder="e.g. Invoice Approval Workflow" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Describe the purpose of this workflow" />
          </Form.Item>

          <Form.Item
            name="document_type"
            label="Document Type"
            rules={[{ required: true, message: 'Select document type' }]}
          >
            <Select options={documentTypes} placeholder="Select document type" style={{ width: 300 }} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item
            name="document_category"
            label="Category"
            rules={[{ required: true, message: 'Select category' }]}
          >
            <Select options={documentCategories} placeholder="Select category" style={{ width: 300 }} showSearch optionFilterProp="label" />
          </Form.Item>
        </Card>

        <Card title="Approval Steps" style={{ marginBottom: 16 }}>
          <Form.List name="approvers">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500 }}>Step {name + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'order_no']}
                        label="Step #"
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ width: 80 }}
                      >
                        <InputNumber min={1} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'approver_id']}
                        label="Approver"
                        rules={[{ required: true, message: 'Select approver' }]}
                        style={{ flex: 1, minWidth: 200 }}
                      >
                        <Select
                          placeholder="Select approver"
                          showSearch
                          optionFilterProp="label"
                          options={users.map((u: User) => ({
                            value: u.id,
                            label: `${u.first_name} ${u.last_name} (${u.email})`,
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'approval_authority']}
                        label="Authority Level"
                        style={{ width: 120 }}
                      >
                        <InputNumber min={1} max={10} placeholder="1-10" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'is_required']}
                        label="Required"
                        valuePropName="checked"
                        style={{ width: 80 }}
                      >
                        <Switch defaultChecked />
                      </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'amount_threshold_min']}
                        label="Min Amount"
                        style={{ width: 150 }}
                      >
                        <InputNumber min={0} placeholder="0.00" style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'amount_threshold_max']}
                        label="Max Amount"
                        style={{ width: 150 }}
                      >
                        <InputNumber min={0} placeholder="No limit" style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'budget_threshold']}
                        label="Budget Threshold"
                        style={{ width: 150 }}
                      >
                        <InputNumber min={0} placeholder="0.00" style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'notes']}
                        label="Notes"
                        style={{ flex: 1, minWidth: 200 }}
                      >
                        <Input placeholder="Optional notes" />
                      </Form.Item>
                    </div>
                  </div>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add({ order_no: fields.length + 1, is_required: true })}
                  icon={<PlusOutlined />}
                  block
                >
                  Add Approval Step
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Update Template' : 'Create Template'}
          </Button>
          <Button onClick={() => navigate('/workflow/templates')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
}
