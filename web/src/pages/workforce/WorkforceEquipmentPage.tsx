import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  Drawer,
  Avatar,
  Badge,
  Typography,
  Row,
  Col,
  Card,
  Tabs,
  Timeline,
  DatePicker,
  Divider,
  Radio,
  Empty,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  UserOutlined,
  TeamOutlined,
  SwapOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import {
  useEquipmentList,
  useEquipment,
  useEquipmentCategories,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useAssignEquipment,
  useReturnEquipment,
  useSendEquipmentToMaintenance,
  useCompleteEquipmentMaintenance,
  useCreateEquipmentCategory,
} from '@/hooks/use-equipment';
import { useAgents } from '@/hooks/use-users';
import { useCrews } from '@/hooks/use-crews';
import type { Equipment, EquipmentHistory } from '@/types/models.types';
import type { CreateEquipmentPayload } from '@/api/equipment.api';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';

const { Text } = Typography;
const { TabPane } = Tabs;

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  available: { color: 'green', label: 'Available', icon: <CheckCircleOutlined /> },
  assigned: { color: 'blue', label: 'Assigned', icon: <SwapOutlined /> },
  in_maintenance: { color: 'orange', label: 'In Maintenance', icon: <SettingOutlined /> },
  retired: { color: 'red', label: 'Retired', icon: <DeleteOutlined /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default', label: status, icon: null };
  return (
    <Tag color={cfg.color} icon={cfg.icon}>
      {cfg.label}
    </Tag>
  );
}

const ACTION_LABELS: Record<string, { color: string; label: string }> = {
  created: { color: 'gray', label: 'Added to Registry' },
  assigned: { color: 'blue', label: 'Assigned' },
  returned: { color: 'green', label: 'Returned' },
  sent_for_maintenance: { color: 'orange', label: 'Sent for Maintenance' },
  maintenance_completed: { color: 'cyan', label: 'Maintenance Completed' },
  retired: { color: 'red', label: 'Retired' },
};

// ── Detail drawer ─────────────────────────────────────────────────────────────

function EquipmentDetailDrawer({
  equipmentId,
  open,
  onClose,
  onEdit,
}: {
  equipmentId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (equip: Equipment) => void;
}) {
  const { data: equipment, isLoading } = useEquipment(equipmentId ?? '');

  if (!open || !equipmentId) return null;

  return (
    <Drawer
      title={
        <Space>
          <Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#fa8c16' }} />
          <span>{equipment?.name ?? 'Equipment Detail'}</span>
          {equipment && <StatusBadge status={equipment.status} />}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={560}
      loading={isLoading}
      extra={
        equipment && (
          <Button icon={<EditOutlined />} onClick={() => onEdit(equipment)}>
            Edit
          </Button>
        )
      }
    >
      {equipment && (
        <Tabs defaultActiveKey="overview">
          <TabPane tab="Overview" key="overview">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">{equipment.name}</Descriptions.Item>
              <Descriptions.Item label="Category">
                {equipment.category?.name ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Serial Number">
                {equipment.serial_number ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Barcode">{equipment.barcode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Manufacturer">
                {equipment.manufacturer ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Model">{equipment.model_number ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Purchase Date">
                {equipment.purchase_date ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Maintenance">
                {equipment.last_maintenance_date ?? '—'}
              </Descriptions.Item>
              {equipment.notes && (
                <Descriptions.Item label="Notes">{equipment.notes}</Descriptions.Item>
              )}
            </Descriptions>

            {equipment.status === 'assigned' && (
              <>
                <Divider>Current Assignment</Divider>
                <Card size="small" style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff' }}>
                  {equipment.assigned_technician && (
                    <Space>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <Text strong>
                          {equipment.assigned_technician.first_name}{' '}
                          {equipment.assigned_technician.last_name}
                        </Text>
                        <br />
                        <Text type="secondary">{equipment.assigned_technician.email}</Text>
                      </div>
                    </Space>
                  )}
                  {equipment.assigned_crew && (
                    <Space>
                      <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1677ff' }} />
                      <Text strong>{equipment.assigned_crew.name}</Text>
                    </Space>
                  )}
                  {equipment.expected_return_date && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        Expected return:{' '}
                        {dayjs(equipment.expected_return_date).format('MMM D, YYYY')}
                      </Text>
                    </div>
                  )}
                </Card>
              </>
            )}
          </TabPane>

          <TabPane
            tab={
              <Space>
                History
                <Badge count={equipment.history?.length ?? 0} style={{ backgroundColor: '#722ed1' }} />
              </Space>
            }
            key="history"
          >
            {equipment.history && equipment.history.length > 0 ? (
              <Timeline
                mode="left"
                items={equipment.history.map((h: EquipmentHistory) => {
                  const cfg = ACTION_LABELS[h.action] ?? { color: 'gray', label: h.action };
                  const who = h.assigned_to_user
                    ? `${h.assigned_to_user.first_name} ${h.assigned_to_user.last_name}`
                    : h.assigned_to_crew
                    ? h.assigned_to_crew.name
                    : null;

                  return {
                    key: h.id,
                    color: cfg.color,
                    label: dayjs(h.action_date).format('MMM D, YYYY HH:mm'),
                    children: (
                      <div>
                        <Text strong>{cfg.label}</Text>
                        {who && (
                          <Text type="secondary"> → {who}</Text>
                        )}
                        {h.performed_by && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              by {h.performed_by.first_name} {h.performed_by.last_name}
                            </Text>
                          </div>
                        )}
                        {h.notes && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {h.notes}
                            </Text>
                          </div>
                        )}
                        {h.expected_return_date && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Expected return: {dayjs(h.expected_return_date).format('MMM D, YYYY')}
                            </Text>
                          </div>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description="No history yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </TabPane>
        </Tabs>
      )}
    </Drawer>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WorkforceEquipmentPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterCategory, setFilterCategory] = useState<string | undefined>();

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Equipment | null>(null);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState<Equipment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const assigneeType: 'technician' | 'crew' = Form.useWatch('assignee_type', assignForm) ?? 'technician';

  // Queries
  const { data: equipmentData, isLoading } = useEquipmentList({
    page,
    take: pageSize,
    search: search || undefined,
    status: filterStatus,
    equipment_category_id: filterCategory,
  });
  const { data: categories } = useEquipmentCategories();
  const { data: agents } = useAgents();
  const { data: crewsData } = useCrews({ take: 100 });
  const crews = crewsData?.data ?? [];

  // Mutations
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();
  const assignMutation = useAssignEquipment();
  const returnMutation = useReturnEquipment();
  const maintenanceMutation = useSendEquipmentToMaintenance();
  const completeMaintenanceMutation = useCompleteEquipmentMaintenance();
  const createCategoryMutation = useCreateEquipmentCategory();

  const equipmentList = equipmentData?.data ?? [];
  const meta = equipmentData?.meta;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingEquipment(null);
    form.resetFields();
    setFormModalOpen(true);
  };

  const openEdit = (equip: Equipment) => {
    setDetailOpen(false);
    setEditingEquipment(equip);
    form.setFieldsValue({
      name: equip.name,
      description: equip.description,
      equipment_category_id: equip.equipment_category_id,
      serial_number: equip.serial_number,
      barcode: equip.barcode,
      manufacturer: equip.manufacturer,
      model_number: equip.model_number,
      purchase_date: equip.purchase_date ? dayjs(equip.purchase_date) : undefined,
      notes: equip.notes,
    });
    setFormModalOpen(true);
  };

  const openDetail = (equip: Equipment) => {
    setDetailId(equip.id);
    setDetailOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateEquipmentPayload = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
      };

      if (editingEquipment) {
        await updateMutation.mutateAsync({ id: editingEquipment.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setFormModalOpen(false);
      form.resetFields();
    } catch {
      // form validation errors handled by antd
    }
  };

  const openAssign = (equip: Equipment) => {
    setAssignTarget(equip);
    assignForm.resetFields();
    assignForm.setFieldValue('assignee_type', 'technician');
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      const payload = {
        id: assignTarget!.id,
        technician_id: values.assignee_type === 'technician' ? values.assignee_id : undefined,
        crew_id: values.assignee_type === 'crew' ? values.assignee_id : undefined,
        expected_return_date: values.expected_return_date
          ? values.expected_return_date.format('YYYY-MM-DD')
          : undefined,
        notes: values.notes,
      };
      await assignMutation.mutateAsync(payload);
      setAssignModalOpen(false);
    } catch {
      // handled by hook
    }
  };

  const handleReturn = (equip: Equipment) => {
    showConfirmDialog({
      title: `Return "${equip.name}"?`,
      content: 'This will mark the equipment as Available and update the assignment history.',
      onOk: () => returnMutation.mutateAsync({ id: equip.id }),
    });
  };

  const openMaintenance = (equip: Equipment) => {
    setMaintenanceTarget(equip);
    maintenanceForm.resetFields();
    setMaintenanceModalOpen(true);
  };

  const handleSendMaintenance = async () => {
    try {
      const values = await maintenanceForm.validateFields();
      await maintenanceMutation.mutateAsync({
        id: maintenanceTarget!.id,
        notes: values.notes,
        expected_return_date: values.expected_return_date
          ? values.expected_return_date.format('YYYY-MM-DD')
          : undefined,
      });
      setMaintenanceModalOpen(false);
    } catch {
      // handled by hook
    }
  };

  const handleCompleteMaintenance = (equip: Equipment) => {
    showConfirmDialog({
      title: `Mark maintenance complete for "${equip.name}"?`,
      content: 'This will set the equipment back to Available and log the maintenance date.',
      onOk: () => completeMaintenanceMutation.mutateAsync({ id: equip.id }),
    });
  };

  const handleDelete = (equip: Equipment) => {
    showConfirmDialog({
      title: `Retire "${equip.name}"?`,
      content: 'The equipment will be marked as Retired and removed from the active registry.',
      onOk: () => deleteMutation.mutateAsync(equip.id),
    });
  };

  const handleCreateCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      await createCategoryMutation.mutateAsync(values);
      setCategoryModalOpen(false);
      categoryForm.resetFields();
    } catch {
      // validation
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns: ColumnsType<Equipment> = [
    {
      title: 'Equipment Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#fa8c16' }} />
          <span
            style={{ fontWeight: 500, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => openDetail(record)}
          >
            {record.name}
          </span>
        </Space>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) =>
        record.category ? (
          <Tag icon={<TagOutlined />}>{record.category.name}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Serial / Barcode',
      key: 'serial',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.serial_number && <Text code style={{ fontSize: 12 }}>{record.serial_number}</Text>}
          {record.barcode && <Text type="secondary" style={{ fontSize: 11 }}>Barcode: {record.barcode}</Text>}
          {!record.serial_number && !record.barcode && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <StatusBadge status={record.status} />,
      filters: [
        { text: 'Available', value: 'available' },
        { text: 'Assigned', value: 'assigned' },
        { text: 'In Maintenance', value: 'in_maintenance' },
        { text: 'Retired', value: 'retired' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Assigned To',
      key: 'assigned_to',
      render: (_, record) => {
        if (record.assigned_technician) {
          return (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>
                {record.assigned_technician.first_name} {record.assigned_technician.last_name}
              </Text>
            </Space>
          );
        }
        if (record.assigned_crew) {
          return (
            <Space>
              <Avatar size="small" icon={<TeamOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <Text>{record.assigned_crew.name}</Text>
            </Space>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space wrap>
          <Tooltip title="View details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              disabled={record.status === 'retired'}
            />
          </Tooltip>
          {record.status === 'available' && (
            <Tooltip title="Assign">
              <Button
                size="small"
                type="primary"
                icon={<SwapOutlined />}
                onClick={() => openAssign(record)}
              />
            </Tooltip>
          )}
          {record.status === 'assigned' && (
            <Tooltip title="Return">
              <Button
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => handleReturn(record)}
                loading={returnMutation.isPending}
              />
            </Tooltip>
          )}
          {(record.status === 'available' || record.status === 'assigned') && (
            <Tooltip title="Send for maintenance">
              <Button
                size="small"
                icon={<SettingOutlined />}
                onClick={() => openMaintenance(record)}
              />
            </Tooltip>
          )}
          {record.status === 'in_maintenance' && (
            <Tooltip title="Mark maintenance complete">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteMaintenance(record)}
              />
            </Tooltip>
          )}
          {record.status !== 'retired' && (
            <Tooltip title="Retire equipment">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Equipment Registry"
        subtitle="Track tools, vehicles, and equipment assigned to your workforce."
        extra={
          <Space>
            <Button icon={<TagOutlined />} onClick={() => setCategoryModalOpen(true)}>
              Manage Categories
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Equipment
            </Button>
          </Space>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={16} align="middle">
          <Col flex={1}>
            <Input.Search
              placeholder="Search by name, serial, barcode, manufacturer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ maxWidth: 380 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by Status"
              style={{ width: 180 }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'Available', value: 'available' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'In Maintenance', value: 'in_maintenance' },
                { label: 'Retired', value: 'retired' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by Category"
              style={{ width: 200 }}
              allowClear
              value={filterCategory}
              onChange={setFilterCategory}
              options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = equipmentList.filter((e) => e.status === status).length;
          return (
            <Col span={6} key={status}>
              <Card size="small" style={{ borderRadius: 8, cursor: 'pointer' }}
                onClick={() => setFilterStatus(filterStatus === status ? undefined : status)}>
                <Space>
                  <Tag color={cfg.color}>{cfg.icon}</Tag>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>{count}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{cfg.label}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={equipmentList}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: meta?.itemCount ?? 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `${total} items`,
          }}
          locale={{
            emptyText: <Empty description="No equipment found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          }}
        />
      </Card>

      {/* ── Add / Edit Equipment Modal ──────────────────────────────────────── */}
      <Modal
        title={editingEquipment ? `Edit: ${editingEquipment.name}` : 'Add Equipment'}
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onOk={handleFormSubmit}
        okText={editingEquipment ? 'Save Changes' : 'Add Equipment'}
        confirmLoading={isMutating}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="Equipment Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g. Ford Transit Van #3" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="equipment_category_id" label="Category">
                <Select
                  placeholder="Select category"
                  allowClear
                  options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
                  notFoundContent={
                    <Text type="secondary" style={{ padding: 8, display: 'block' }}>
                      No categories yet. Click "Manage Categories".
                    </Text>
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Manufacturer">
                <Input placeholder="e.g. Ford" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model_number" label="Model / Model Number">
                <Input placeholder="e.g. Transit 250" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchase_date" label="Purchase Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serial_number" label="Serial Number">
                <Input placeholder="Unique serial number" prefix={<TagOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barcode" label="Barcode">
                <Input placeholder="Barcode / QR value" prefix={<TagOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Internal notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Assign Equipment Modal ──────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#1677ff' }} />
            Assign: {assignTarget?.name}
          </Space>
        }
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssign}
        okText="Assign Equipment"
        confirmLoading={assignMutation.isPending}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="assignee_type" label="Assign To" initialValue="technician">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="technician">
                <UserOutlined /> Technician
              </Radio.Button>
              <Radio.Button value="crew">
                <TeamOutlined /> Crew
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="assignee_id"
            label={assigneeType === 'technician' ? 'Select Technician' : 'Select Crew'}
            rules={[{ required: true, message: 'Please select an assignee' }]}
          >
            {assigneeType === 'technician' ? (
              <Select
                showSearch
                placeholder="Search and select technician"
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={(agents ?? []).map((a) => ({
                  label: `${a.first_name} ${a.last_name} (${a.email})`,
                  value: a.id,
                }))}
              />
            ) : (
              <Select
                showSearch
                placeholder="Search and select crew"
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={crews.map((c) => ({ label: c.name, value: c.id }))}
              />
            )}
          </Form.Item>

          <Form.Item name="expected_return_date" label="Expected Return Date (optional)">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={2} placeholder="e.g. Needed for job #1234" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Maintenance Modal ───────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <SettingOutlined style={{ color: '#fa8c16' }} />
            Send for Maintenance: {maintenanceTarget?.name}
          </Space>
        }
        open={maintenanceModalOpen}
        onCancel={() => setMaintenanceModalOpen(false)}
        onOk={handleSendMaintenance}
        okText="Send for Maintenance"
        okButtonProps={{ style: { backgroundColor: '#fa8c16', borderColor: '#fa8c16' } }}
        confirmLoading={maintenanceMutation.isPending}
        destroyOnClose
      >
        <Form form={maintenanceForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="notes" label="Maintenance Notes">
            <Input.TextArea rows={3} placeholder="Describe the maintenance needed…" />
          </Form.Item>
          <Form.Item name="expected_return_date" label="Expected Completion Date (optional)">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Category Management Modal ───────────────────────────────────────── */}
      <Modal
        title="Manage Equipment Categories"
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          {(categories ?? []).length === 0 ? (
            <Empty description="No categories yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space wrap>
              {(categories ?? []).map((c) => (
                <Tag key={c.id} icon={<TagOutlined />} closable onClose={() => {}}>
                  {c.name}
                </Tag>
              ))}
            </Space>
          )}
        </div>
        <Divider>Add New Category</Divider>
        <Form form={categoryForm} layout="inline" onFinish={handleCreateCategory}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Category name is required' }]}
          >
            <Input placeholder="e.g. Vehicles, Hand Tools, Diagnostic" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createCategoryMutation.isPending}
              icon={<PlusOutlined />}
            >
              Add
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Equipment Detail Drawer ─────────────────────────────────────────── */}
      <EquipmentDetailDrawer
        equipmentId={detailId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
      />
    </div>
  );
}
