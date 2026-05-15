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
  Divider,
  Typography,
  Modal,
  Tag,
  Checkbox,
  InputNumber,
  DatePicker,
  Radio,
  Tooltip,
  Empty,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MenuOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  NumberOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EditFilled,
  CameraOutlined,
  UnorderedListOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useJobSheetTemplate, useCreateJobSheetTemplate, useUpdateJobSheetTemplate } from '@/hooks/use-job-sheets';
import PageHeader from '@/components/common/PageHeader';

const { TextArea } = Input;
const { Title, Text } = Typography;

// Item types for job sheet
const ITEM_TYPES = [
  { value: 'checkbox', label: 'Checkbox', icon: <CheckSquareOutlined />, description: 'Yes/No checkbox' },
  { value: 'text', label: 'Text Input', icon: <FileTextOutlined />, description: 'Single line text' },
  { value: 'textarea', label: 'Text Area', icon: <EditFilled />, description: 'Multi-line text' },
  { value: 'number', label: 'Number', icon: <NumberOutlined />, description: 'Numeric input' },
  { value: 'date', label: 'Date', icon: <CalendarOutlined />, description: 'Date picker' },
  { value: 'time', label: 'Time', icon: <ClockCircleOutlined />, description: 'Time picker' },
  { value: 'dropdown', label: 'Dropdown', icon: <UnorderedListOutlined />, description: 'Select from options' },
  { value: 'photo', label: 'Photo', icon: <CameraOutlined />, description: 'Capture photo' },
  { value: 'signature', label: 'Signature', icon: <EditOutlined />, description: 'Digital signature' },
  { value: 'rating', label: 'Rating', icon: <StarOutlined />, description: '1-5 star rating' },
];

interface JobSheetItem {
  id: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
}

export default function JobSheetBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const [items, setItems] = useState<JobSheetItem[]>([]);
  const [activeTab, setActiveTab] = useState('builder');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<JobSheetItem | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: template, isLoading } = useJobSheetTemplate(id!);
  const createTemplate = useCreateJobSheetTemplate();
  const updateTemplate = useUpdateJobSheetTemplate();

  useEffect(() => {
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        is_active: template.is_active,
      });
      // Parse items from template metadata if exists
      if (template.metadata && typeof template.metadata === 'object' && 'items' in template.metadata) {
        setItems((template.metadata as { items: JobSheetItem[] }).items || []);
      }
    }
  }, [template, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (items.length === 0) {
      message.warning('Please add at least one item to the job sheet');
      return;
    }

    const payload = {
      ...values,
      metadata: { items },
    };

    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({ id: id!, ...payload });
      } else {
        await createTemplate.mutateAsync(payload as Record<string, unknown> & { name: string });
      }
      navigate('/job-sheets/templates');
    } catch {
      // Error handled by mutation hooks
    }
  };

  const addItem = (type: string) => {
    const newItem: JobSheetItem = {
      id: `item_${Date.now()}`,
      type,
      label: `New ${type} item`,
      required: false,
      description: '',
    };

    if (type === 'dropdown') {
      newItem.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    setItems([...items, newItem]);
    setCurrentItem(newItem);
    setEditModalVisible(true);
  };

  const editItem = (item: JobSheetItem) => {
    setCurrentItem(item);
    setEditModalVisible(true);
  };

  const deleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
    message.success('Item deleted');
  };

  const saveItemEdit = (editedItem: JobSheetItem) => {
    setItems(items.map((item) => (item.id === editedItem.id ? editedItem : item)));
    setEditModalVisible(false);
    setCurrentItem(null);
    message.success('Item updated');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getItemIcon = (type: string) => {
    return ITEM_TYPES.find((t) => t.value === type)?.icon || <CheckSquareOutlined />;
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
        title={isEdit ? 'Edit Job Sheet Template' : 'Create Job Sheet Template'}
        subtitle="Build interactive checklists with drag-and-drop"
        onBack={() => navigate('/job-sheets/templates')}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{ is_active: true }}
      >
        <Row gutter={16}>
          {/* Main Builder Section */}
          <Col xs={24} lg={16}>
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="name"
                      label="Template Name"
                      rules={[{ required: true, message: 'Please enter a template name' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="e.g. HVAC Inspection Checklist" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="category" label="Category" style={{ marginBottom: 0 }}>
                      <Select placeholder="Select category" allowClear>
                        <Select.Option value="Inspection">Inspection</Select.Option>
                        <Select.Option value="Maintenance">Maintenance</Select.Option>
                        <Select.Option value="Repair">Repair</Select.Option>
                        <Select.Option value="Installation">Installation</Select.Option>
                        <Select.Option value="Safety">Safety</Select.Option>
                        <Select.Option value="General">General</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Form.Item name="is_active" label="Status" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
                  <TextArea rows={2} placeholder="Describe this template" />
                </Form.Item>
              </Space>
            </Card>

            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: 'builder',
                    label: (
                      <span>
                        <EditOutlined /> Builder
                      </span>
                    ),
                    children: (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Checklist Items ({items.length})
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Drag items to reorder. Click to edit or delete.
                          </Text>
                        </div>

                        {items.length === 0 ? (
                          <Empty
                            description="No items added yet"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            style={{ padding: '40px 0' }}
                          >
                            <Text type="secondary">
                              Add items from the panel on the right to build your checklist
                            </Text>
                          </Empty>
                        ) : (
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {items.map((item, index) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                style={{
                                  padding: '12px 16px',
                                  border: '1px solid #f0f0f0',
                                  borderRadius: 8,
                                  backgroundColor: draggedIndex === index ? '#e6f7ff' : '#fafafa',
                                  cursor: 'move',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <MenuOutlined style={{ color: '#999', cursor: 'grab' }} />
                                  <div style={{ fontSize: 16, color: '#1890ff' }}>
                                    {getItemIcon(item.type)}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Text strong>{item.label}</Text>
                                      {item.required && <Tag color="red">Required</Tag>}
                                      <Tag color="blue">{item.type}</Tag>
                                    </div>
                                    {item.description && (
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {item.description}
                                      </Text>
                                    )}
                                  </div>
                                  <Space size="small">
                                    <Tooltip title="Edit">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => editItem(item)}
                                      />
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => deleteItem(item.id)}
                                      />
                                    </Tooltip>
                                  </Space>
                                </div>
                              </div>
                            ))}
                          </Space>
                        )}
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
                            backgroundColor: '#fff',
                            minHeight: 400,
                          }}
                        >
                          <Title level={4} style={{ marginTop: 0 }}>
                            {form.getFieldValue('name') || 'Job Sheet Template'}
                          </Title>
                          {form.getFieldValue('description') && (
                            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                              {form.getFieldValue('description')}
                            </Text>
                          )}

                          {items.length === 0 ? (
                            <Empty description="No items to preview" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          ) : (
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                              {items.map((item, index) => (
                                <div key={item.id}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>
                                      {index + 1}. {item.label}
                                      {item.required && <span style={{ color: '#ff4d4f' }}> *</span>}
                                    </Text>
                                    {item.description && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                          {item.description}
                                        </Text>
                                      </div>
                                    )}
                                  </div>

                                  {/* Preview different item types */}
                                  {item.type === 'checkbox' && (
                                    <Checkbox>Completed</Checkbox>
                                  )}
                                  {item.type === 'text' && (
                                    <Input placeholder={item.placeholder || 'Enter text'} disabled />
                                  )}
                                  {item.type === 'textarea' && (
                                    <TextArea rows={3} placeholder={item.placeholder || 'Enter text'} disabled />
                                  )}
                                  {item.type === 'number' && (
                                    <InputNumber
                                      style={{ width: 200 }}
                                      placeholder="Enter number"
                                      min={item.min}
                                      max={item.max}
                                      disabled
                                    />
                                  )}
                                  {item.type === 'date' && (
                                    <DatePicker style={{ width: 200 }} disabled />
                                  )}
                                  {item.type === 'time' && (
                                    <DatePicker.TimePicker style={{ width: 200 }} disabled />
                                  )}
                                  {item.type === 'dropdown' && (
                                    <Select style={{ width: '100%' }} placeholder="Select an option" disabled>
                                      {item.options?.map((opt, i) => (
                                        <Select.Option key={i} value={opt}>
                                          {opt}
                                        </Select.Option>
                                      ))}
                                    </Select>
                                  )}
                                  {item.type === 'photo' && (
                                    <div
                                      style={{
                                        width: 200,
                                        height: 150,
                                        border: '2px dashed #d9d9d9',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        gap: 8,
                                        color: '#999',
                                      }}
                                    >
                                      <CameraOutlined style={{ fontSize: 32 }} />
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        Capture Photo
                                      </Text>
                                    </div>
                                  )}
                                  {item.type === 'signature' && (
                                    <div
                                      style={{
                                        width: '100%',
                                        height: 120,
                                        border: '2px dashed #d9d9d9',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#999',
                                      }}
                                    >
                                      <Text type="secondary">Signature Area</Text>
                                    </div>
                                  )}
                                  {item.type === 'rating' && (
                                    <Radio.Group disabled>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Radio key={star} value={star}>
                                          {star} <StarOutlined />
                                        </Radio>
                                      ))}
                                    </Radio.Group>
                                  )}
                                </div>
                              ))}
                            </Space>
                          )}
                        </div>
                        <Divider />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          This is how the job sheet will appear to field technicians.
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
                  <Button onClick={() => navigate('/job-sheets/templates')} size="large">
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Card>
          </Col>

          {/* Item Types Sidebar */}
          <Col xs={24} lg={8}>
            <Card
              title="Add Items"
              size="small"
              style={{ position: 'sticky', top: 16 }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                Click an item type to add it to your checklist
              </Text>

              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {ITEM_TYPES.map((itemType) => (
                  <Button
                    key={itemType.value}
                    block
                    style={{
                      height: 'auto',
                      padding: '12px 16px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    onClick={() => addItem(itemType.value)}
                  >
                    <div style={{ fontSize: 18, color: '#1890ff' }}>
                      {itemType.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{itemType.label}</div>
                      <div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>
                        {itemType.description}
                      </div>
                    </div>
                    <PlusOutlined style={{ color: '#1890ff' }} />
                  </Button>
                ))}
              </Space>

              <Divider />

              <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                <Title level={5} style={{ marginTop: 0, fontSize: 13 }}>
                  💡 Builder Tips
                </Title>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>Drag items to reorder</li>
                  <li>Click edit to configure</li>
                  <li>Mark items as required</li>
                  <li>Use preview to test flow</li>
                  <li>Photo/signature for proof</li>
                </ul>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* Edit Item Modal */}
      <ItemEditModal
        visible={editModalVisible}
        item={currentItem}
        onSave={saveItemEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentItem(null);
        }}
      />
    </div>
  );
}

// Item Edit Modal Component
interface ItemEditModalProps {
  visible: boolean;
  item: JobSheetItem | null;
  onSave: (item: JobSheetItem) => void;
  onCancel: () => void;
}

function ItemEditModal({ visible, item, onSave, onCancel }: ItemEditModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (item && visible) {
      form.setFieldsValue({
        label: item.label,
        description: item.description,
        required: item.required,
        placeholder: item.placeholder,
        min: item.min,
        max: item.max,
        options: item.options?.join('\n') || '',
      });
    }
  }, [item, visible, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (!item) return;

      const updatedItem: JobSheetItem = {
        ...item,
        label: values.label,
        description: values.description,
        required: values.required,
        placeholder: values.placeholder,
        min: values.min,
        max: values.max,
      };

      if (item.type === 'dropdown') {
        updatedItem.options = values.options
          .split('\n')
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt.length > 0);
      }

      onSave(updatedItem);
      form.resetFields();
    });
  };

  if (!item) return null;

  return (
    <Modal
      title={`Edit ${item.type} Item`}
      open={visible}
      onOk={handleSave}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      width={600}
      okText="Save"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="label"
          label="Label"
          rules={[{ required: true, message: 'Please enter a label' }]}
        >
          <Input placeholder="e.g. Check filter condition" />
        </Form.Item>

        <Form.Item name="description" label="Description (optional)">
          <TextArea rows={2} placeholder="Add instructions or notes" />
        </Form.Item>

        <Form.Item name="required" valuePropName="checked">
          <Checkbox>Required field</Checkbox>
        </Form.Item>

        {(item.type === 'text' || item.type === 'textarea') && (
          <Form.Item name="placeholder" label="Placeholder">
            <Input placeholder="Placeholder text" />
          </Form.Item>
        )}

        {item.type === 'number' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="min" label="Minimum Value">
                <InputNumber style={{ width: '100%' }} placeholder="Min" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="max" label="Maximum Value">
                <InputNumber style={{ width: '100%' }} placeholder="Max" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {item.type === 'dropdown' && (
          <Form.Item
            name="options"
            label="Options (one per line)"
            rules={[{ required: true, message: 'Please enter options' }]}
          >
            <TextArea
              rows={5}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
