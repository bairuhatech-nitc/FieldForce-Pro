import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Skeleton,
  Select,
  Switch,
  Row,
  Col,
  Tabs,
  Tag,
  Divider,
  Collapse,
  Typography,
  Tooltip,
  message,
} from 'antd';
import {
  CopyOutlined,
  EyeOutlined,
  CodeOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useTemplate, useCreateTemplate, useUpdateTemplate } from '@/hooks/use-templates';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const TEMPLATE_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'email', label: 'Email' },
  { value: 'report', label: 'Report' },
  { value: 'job_sheet', label: 'Job Sheet' },
  { value: 'work_order', label: 'Work Order' },
  { value: 'contract', label: 'Contract' },
];

// Template variables organized by category
const TEMPLATE_VARIABLES = {
  'Work Order': [
    { key: '{{work_order.wo_number}}', description: 'Work order number' },
    { key: '{{work_order.summary}}', description: 'Work order summary' },
    { key: '{{work_order.description}}', description: 'Work order description' },
    { key: '{{work_order.status}}', description: 'Current status' },
    { key: '{{work_order.priority}}', description: 'Priority level' },
    { key: '{{work_order.scheduled_start}}', description: 'Scheduled date' },
  ],
  'Customer': [
    { key: '{{contact.name}}', description: 'Customer full name' },
    { key: '{{contact.email}}', description: 'Customer email' },
    { key: '{{contact.phone}}', description: 'Customer phone' },
    { key: '{{company.name}}', description: 'Company name' },
    { key: '{{company.email}}', description: 'Company email' },
    { key: '{{company.phone}}', description: 'Company phone' },
  ],
  'Service Location': [
    { key: '{{location.address}}', description: 'Service address' },
    { key: '{{location.city}}', description: 'City' },
    { key: '{{location.state}}', description: 'State' },
    { key: '{{location.zip}}', description: 'ZIP code' },
    { key: '{{location.country}}', description: 'Country' },
  ],
  'Agent/Technician': [
    { key: '{{agent.name}}', description: 'Assigned technician name' },
    { key: '{{agent.email}}', description: 'Technician email' },
    { key: '{{agent.phone}}', description: 'Technician phone' },
  ],
  'Invoice/Estimate': [
    { key: '{{invoice.number}}', description: 'Invoice number' },
    { key: '{{invoice.date}}', description: 'Invoice date' },
    { key: '{{invoice.due_date}}', description: 'Due date' },
    { key: '{{invoice.subtotal}}', description: 'Subtotal amount' },
    { key: '{{invoice.tax}}', description: 'Tax amount' },
    { key: '{{invoice.total}}', description: 'Total amount' },
    { key: '{{estimate.number}}', description: 'Estimate number' },
    { key: '{{estimate.date}}', description: 'Estimate date' },
    { key: '{{estimate.total}}', description: 'Estimate total' },
  ],
  'Company/Settings': [
    { key: '{{company_settings.name}}', description: 'Your company name' },
    { key: '{{company_settings.email}}', description: 'Your company email' },
    { key: '{{company_settings.phone}}', description: 'Your company phone' },
    { key: '{{company_settings.address}}', description: 'Your company address' },
    { key: '{{company_settings.logo_url}}', description: 'Company logo URL' },
  ],
  'Date/Time': [
    { key: '{{today}}', description: 'Today\'s date' },
    { key: '{{current_time}}', description: 'Current time' },
    { key: '{{current_year}}', description: 'Current year' },
  ],
};

// Sample data for preview
const PREVIEW_DATA: Record<string, string> = {
  '{{work_order.wo_number}}': 'WO-001234',
  '{{work_order.summary}}': 'HVAC System Maintenance',
  '{{work_order.description}}': 'Perform routine maintenance on commercial HVAC system',
  '{{work_order.status}}': 'Scheduled',
  '{{work_order.priority}}': 'High',
  '{{work_order.scheduled_start}}': 'January 20, 2026',
  '{{contact.name}}': 'John Smith',
  '{{contact.email}}': 'john.smith@example.com',
  '{{contact.phone}}': '+1 (555) 123-4567',
  '{{company.name}}': 'Acme Corporation',
  '{{company.email}}': 'info@acme.com',
  '{{company.phone}}': '+1 (555) 987-6543',
  '{{location.address}}': '123 Main Street',
  '{{location.city}}': 'San Francisco',
  '{{location.state}}': 'CA',
  '{{location.zip}}': '94102',
  '{{location.country}}': 'USA',
  '{{agent.name}}': 'Mike Johnson',
  '{{agent.email}}': 'mike.j@fieldforce.com',
  '{{agent.phone}}': '+1 (555) 234-5678',
  '{{invoice.number}}': 'INV-001234',
  '{{invoice.date}}': 'January 20, 2026',
  '{{invoice.due_date}}': 'February 20, 2026',
  '{{invoice.subtotal}}': '$1,200.00',
  '{{invoice.tax}}': '$120.00',
  '{{invoice.total}}': '$1,320.00',
  '{{estimate.number}}': 'EST-001234',
  '{{estimate.date}}': 'January 15, 2026',
  '{{estimate.total}}': '$1,500.00',
  '{{company_settings.name}}': 'FieldForce Pro Services',
  '{{company_settings.email}}': 'contact@fieldforce.com',
  '{{company_settings.phone}}': '+1 (555) 100-2000',
  '{{company_settings.address}}': '456 Business Ave, Suite 100, San Francisco, CA 94103',
  '{{company_settings.logo_url}}': 'https://via.placeholder.com/150x50?text=FieldForce+Pro',
  '{{today}}': 'February 16, 2026',
  '{{current_time}}': '2:30 PM',
  '{{current_year}}': '2026',
};

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const [content, setContent] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [activeTab, setActiveTab] = useState('editor');

  const { data: template, isLoading } = useTemplate(id!);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        type: template.type,
        name: template.name,
        subject: template.subject,
        content: template.content,
        is_default: template.is_default,
      });
      setContent(template.content || '');
    }
  }, [template, form]);

  // Update preview when content changes
  useEffect(() => {
    let preview = content;
    // Replace all variables with preview data
    Object.entries(PREVIEW_DATA).forEach(([variable, value]) => {
      preview = preview.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    setPreviewContent(preview);
  }, [content]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const payload = { ...values, content };
      if (isEdit) {
        await updateTemplate.mutateAsync({ id: id!, ...payload });
      } else {
        await createTemplate.mutateAsync(payload as never);
      }
      navigate('/customization/templates');
    } catch {
      // Error handled by mutation hooks
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = before + variable + after;
      setContent(newContent);
      form.setFieldValue('content', newContent);

      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 10);
    }
  };

  const insertFormatting = (before: string, after: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const selectedText = text.substring(start, end);
      const beforeText = text.substring(0, start);
      const afterText = text.substring(end);
      const newContent = beforeText + before + selectedText + after + afterText;
      setContent(newContent);
      form.setFieldValue('content', newContent);

      setTimeout(() => {
        textarea.focus();
        const newPosition = start + before.length + selectedText.length + after.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 10);
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    message.success('Variable copied to clipboard!');
  };

  if (isEdit && isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Template' : 'Create Template'}
        subtitle="Build templates with dynamic variables and formatting"
        onBack={() => navigate('/customization/templates')}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{ is_default: false }}
      >
        <Row gutter={16}>
          {/* Main Editor Section */}
          <Col xs={24} lg={16}>
            <Card style={{ marginBottom: 16 }}>
              <Space size="large" style={{ display: 'flex', marginBottom: 16 }}>
                <Form.Item
                  name="type"
                  label="Template Type"
                  style={{ flex: 1, marginBottom: 0 }}
                  rules={[{ required: true, message: 'Please select a type' }]}
                >
                  <Select placeholder="Select type" options={TEMPLATE_TYPES} />
                </Form.Item>
                <Form.Item
                  name="name"
                  label="Template Name"
                  style={{ flex: 1, marginBottom: 0 }}
                  rules={[{ required: true, message: 'Please enter a name' }]}
                >
                  <Input placeholder="e.g. Standard Invoice Template" />
                </Form.Item>
              </Space>

              <Form.Item
                name="subject"
                label="Subject (for emails)"
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. Work Order {{work_order.wo_number}} - Status Update" />
              </Form.Item>

              <Form.Item name="is_default" label="Set as Default Template" valuePropName="checked">
                <Switch checkedChildren="Default" unCheckedChildren="Not Default" />
              </Form.Item>
            </Card>

            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'editor',
                    label: (
                      <span>
                        <CodeOutlined /> Editor
                      </span>
                    ),
                    children: (
                      <div>
                        {/* Formatting Toolbar */}
                        <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Tooltip title="Bold">
                            <Button
                              size="small"
                              icon={<BoldOutlined />}
                              onClick={() => insertFormatting('**', '**')}
                            />
                          </Tooltip>
                          <Tooltip title="Italic">
                            <Button
                              size="small"
                              icon={<ItalicOutlined />}
                              onClick={() => insertFormatting('_', '_')}
                            />
                          </Tooltip>
                          <Divider type="vertical" />
                          <Tooltip title="Heading">
                            <Button
                              size="small"
                              onClick={() => insertFormatting('## ', '')}
                            >
                              H
                            </Button>
                          </Tooltip>
                          <Divider type="vertical" />
                          <Tooltip title="Unordered List">
                            <Button
                              size="small"
                              icon={<UnorderedListOutlined />}
                              onClick={() => insertFormatting('- ', '')}
                            />
                          </Tooltip>
                          <Tooltip title="Ordered List">
                            <Button
                              size="small"
                              icon={<OrderedListOutlined />}
                              onClick={() => insertFormatting('1. ', '')}
                            />
                          </Tooltip>
                          <Divider type="vertical" />
                          <Tooltip title="Link">
                            <Button
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={() => insertFormatting('[', '](url)')}
                            />
                          </Tooltip>
                        </div>

                        <Form.Item
                          name="content"
                          rules={[{ required: true, message: 'Please enter template content' }]}
                        >
                          <TextArea
                            id="template-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={20}
                            placeholder="Enter your template content here...&#10;&#10;Use the variable panel on the right to insert dynamic content.&#10;&#10;Example:&#10;Dear {{contact.name}},&#10;&#10;Your work order {{work_order.wo_number}} has been scheduled for {{work_order.scheduled_start}}.&#10;&#10;Best regards,&#10;{{company_settings.name}}"
                            style={{ fontFamily: 'monospace', fontSize: 14 }}
                          />
                        </Form.Item>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Tip: Use Markdown syntax for formatting. ** for bold, _ for italic, ## for headings.
                        </Text>
                      </div>
                    ),
                  },
                  {
                    key: 'preview',
                    label: (
                      <span>
                        <EyeOutlined /> Preview
                      </span>
                    ),
                    children: (
                      <div>
                        <div
                          style={{
                            padding: 24,
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            backgroundColor: '#fafafa',
                            minHeight: 400,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            lineHeight: 1.6,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: previewContent
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/_(.*?)_/g, '<em>$1</em>')
                              .replace(/^## (.*?)$/gm, '<h2 style="margin: 16px 0 8px 0; font-size: 20px;">$1</h2>')
                              .replace(/^# (.*?)$/gm, '<h1 style="margin: 20px 0 12px 0; font-size: 24px;">$1</h1>')
                              .replace(/^- (.*?)$/gm, '<li style="margin-left: 20px;">$1</li>')
                              .replace(/\n/g, '<br />'),
                          }}
                        />
                        <Divider />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Preview uses sample data. Actual output will use real data from your system.
                        </Text>
                      </div>
                    ),
                  },
                ]}
              />

              <Divider />

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={createTemplate.isPending || updateTemplate.isPending}
                    size="large"
                  >
                    {isEdit ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button onClick={() => navigate('/customization/templates')} size="large">
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Card>
          </Col>

          {/* Variables Sidebar */}
          <Col xs={24} lg={8}>
            <Card
              title="Template Variables"
              size="small"
              style={{ position: 'sticky', top: 16 }}
            >
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                Click any variable to insert it at your cursor position, or click the copy icon.
              </Paragraph>

              <Collapse
                defaultActiveKey={['Work Order', 'Customer']}
                ghost
                size="small"
              >
                {Object.entries(TEMPLATE_VARIABLES).map(([category, variables]) => (
                  <Panel header={<Text strong>{category}</Text>} key={category}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {variables.map((variable) => (
                        <div
                          key={variable.key}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#fafafa',
                            borderRadius: 6,
                            border: '1px solid #f0f0f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e6f7ff';
                            e.currentTarget.style.borderColor = '#91d5ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fafafa';
                            e.currentTarget.style.borderColor = '#f0f0f0';
                          }}
                          onClick={() => insertVariable(variable.key)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <Tag color="blue" style={{ fontSize: 11, fontFamily: 'monospace', marginBottom: 4 }}>
                                {variable.key}
                              </Tag>
                              <div style={{ fontSize: 11, color: '#666' }}>{variable.description}</div>
                            </div>
                            <Tooltip title="Copy to clipboard">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyVariable(variable.key);
                                }}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </Space>
                  </Panel>
                ))}
              </Collapse>

              <Divider />

              <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                <Title level={5} style={{ marginTop: 0, fontSize: 13 }}>
                  💡 Template Tips
                </Title>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>Use <code>**text**</code> for bold</li>
                  <li>Use <code>_text_</code> for italic</li>
                  <li>Use <code>## Text</code> for headings</li>
                  <li>Variables are case-sensitive</li>
                  <li>Preview shows sample data</li>
                </ul>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
