import { useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  Card, Tabs, Button, Space, Tag, Avatar, Typography, Row, Col,
  Descriptions, List, Empty, Modal, Form, Input, Select, DatePicker,
  Spin, Badge, Radio, Timeline, Calendar, theme,
} from 'antd';
import {
  ToolOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UserOutlined,
  EnvironmentOutlined, SwapOutlined, RollbackOutlined, SettingOutlined,
  CheckCircleOutlined, LinkOutlined, PlusOutlined, CalendarOutlined,
  ClockCircleOutlined, FileOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import {
  useEquipment, useDeleteEquipment, useAssignEquipment,
  useReturnEquipment, useSendEquipmentToMaintenance,
  useCompleteEquipmentMaintenance,
} from '@/hooks/use-equipment';
import { useUser, useAgents } from '@/hooks/use-users';
import { useCrews } from '@/hooks/use-crews';
import { useSetting, useUpsertSetting } from '@/hooks/use-settings';
import { useAllAppointments } from '@/hooks/use-appointments';
import { useTimeOffRequests } from '@/hooks/use-time-off';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';

const { Text } = Typography;

interface NoteItem { id: string; content: string; created_at: string; }
interface AttachmentItem { id: string; name: string; url: string; created_at: string; }
interface TerritoryItem { id: string; name: string; color?: string; }

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  available: { color: 'green', label: 'Available' },
  assigned: { color: 'blue', label: 'Assigned' },
  in_maintenance: { color: 'orange', label: 'In Maintenance' },
  retired: { color: 'red', label: 'Retired' },
};

const ACTION_LABELS: Record<string, { color: string; label: string }> = {
  created: { color: 'gray', label: 'Added to Registry' },
  assigned: { color: 'blue', label: 'Assigned' },
  returned: { color: 'green', label: 'Returned' },
  sent_for_maintenance: { color: 'orange', label: 'Sent for Maintenance' },
  maintenance_completed: { color: 'cyan', label: 'Maintenance Completed' },
  retired: { color: 'red', label: 'Retired' },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacation', sick: 'Sick Leave', personal: 'Personal',
  unpaid: 'Unpaid', other: 'Other',
};

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red', cancelled: 'default',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignOpen, setAssignOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [assignForm] = Form.useForm();
  const [maintenanceForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [attachForm] = Form.useForm();
  const assigneeType: 'technician' | 'crew' = Form.useWatch('assignee_type', assignForm) ?? 'technician';

  const { token } = theme.useToken();
  const { data: equipment, isLoading } = useEquipment(id!);
  const { data: assignedUser } = useUser(equipment?.assigned_technician_id ?? '');
  const { data: crewsData } = useCrews({ take: 100 });
  const { data: allAgents } = useAgents();
  const { data: allAppointments } = useAllAppointments();
  const { data: territoriesData } = useSetting('territories_settings');

  const notesKey = `equipment_notes_${id}`;
  const attachKey = `equipment_attachments_${id}`;
  const { data: notesData } = useSetting(notesKey);
  const { data: attachData } = useSetting(attachKey);
  const upsertSetting = useUpsertSetting();

  const { data: timeOffData } = useTimeOffRequests(
    equipment?.assigned_technician_id
      ? { user_id: equipment.assigned_technician_id, take: 50 }
      : { take: 0 },
  );

  const deleteMutation = useDeleteEquipment();
  const assignMutation = useAssignEquipment();
  const returnMutation = useReturnEquipment();
  const maintenanceMutation = useSendEquipmentToMaintenance();
  const completeMutation = useCompleteEquipmentMaintenance();

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!equipment) return <Empty description="Equipment not found" style={{ padding: 64 }} />;

  const crews = crewsData?.data ?? [];
  const territories: TerritoryItem[] = (territoriesData?.value?.list as TerritoryItem[]) ?? [];
  const notes: NoteItem[] = (notesData?.value?.list as NoteItem[]) ?? [];
  const attachments: AttachmentItem[] = (attachData?.value?.list as AttachmentItem[]) ?? [];
  const statusCfg = STATUS_CONFIG[equipment.status] ?? { color: 'default', label: equipment.status };

  const appointments = (allAppointments ?? []).filter((a) => {
    if (equipment.assigned_technician_id && a.agent_id === equipment.assigned_technician_id) return true;
    if (equipment.assigned_crew_id && a.crew_id === equipment.assigned_crew_id) return true;
    return false;
  });

  const equipmentTerritoryIds: string[] = (() => {
    if (equipment.assigned_crew_id) {
      const crew = crews.find((c) => c.id === equipment.assigned_crew_id);
      return crew?.territory_ids ?? [];
    }
    if (equipment.assigned_technician_id) {
      return (assignedUser as Record<string, unknown>)?.territory_ids as string[] ?? [];
    }
    return [];
  })();
  const equipmentTerritories = territories.filter((t) => equipmentTerritoryIds.includes(t.id));

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    showConfirmDialog({
      title: `Retire "${equipment.name}"?`,
      content: 'This will mark the equipment as Retired.',
      danger: true,
      onOk: async () => {
        await deleteMutation.mutateAsync(equipment.id);
        navigate('/workforce/equipment');
      },
    });
  };

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await assignMutation.mutateAsync({
        id: equipment.id,
        technician_id: values.assignee_type === 'technician' ? values.assignee_id : undefined,
        crew_id: values.assignee_type === 'crew' ? values.assignee_id : undefined,
        expected_return_date: values.expected_return_date?.format('YYYY-MM-DD'),
        notes: values.notes,
      });
      setAssignOpen(false);
      assignForm.resetFields();
    } catch { /* validation */ }
  };

  const handleReturn = () => {
    showConfirmDialog({
      title: 'Return equipment?',
      content: 'This will mark the equipment as Available.',
      onOk: () => returnMutation.mutateAsync({ id: equipment.id }),
    });
  };

  const handleMaintenance = async () => {
    try {
      const values = await maintenanceForm.validateFields();
      await maintenanceMutation.mutateAsync({
        id: equipment.id,
        notes: values.notes,
        expected_return_date: values.expected_return_date?.format('YYYY-MM-DD'),
      });
      setMaintenanceOpen(false);
      maintenanceForm.resetFields();
    } catch { /* validation */ }
  };

  const handleCompleteMaintenance = () => {
    showConfirmDialog({
      title: 'Mark maintenance complete?',
      content: 'This will set the equipment back to Available.',
      onOk: () => completeMutation.mutateAsync({ id: equipment.id }),
    });
  };

  const handleAddNote = async () => {
    try {
      const values = await noteForm.validateFields();
      const newNote: NoteItem = {
        id: crypto.randomUUID(),
        content: values.content,
        created_at: new Date().toISOString(),
      };
      await upsertSetting.mutateAsync({ key: notesKey, value: { list: [newNote, ...notes] } });
      setNoteOpen(false);
      noteForm.resetFields();
    } catch { /* validation */ }
  };

  const handleDeleteNote = (noteId: string) => {
    showConfirmDialog({
      title: 'Delete this note?',
      content: '',
      danger: true,
      onOk: () => upsertSetting.mutateAsync({ key: notesKey, value: { list: notes.filter((n) => n.id !== noteId) } }),
    });
  };

  const handleAddAttachment = async () => {
    try {
      const values = await attachForm.validateFields();
      const newAttach: AttachmentItem = {
        id: crypto.randomUUID(),
        name: values.name,
        url: values.url,
        created_at: new Date().toISOString(),
      };
      await upsertSetting.mutateAsync({ key: attachKey, value: { list: [newAttach, ...attachments] } });
      setAttachOpen(false);
      attachForm.resetFields();
    } catch { /* validation */ }
  };

  const handleDeleteAttachment = (attachId: string) => {
    showConfirmDialog({
      title: 'Delete this attachment?',
      content: '',
      danger: true,
      onOk: () => upsertSetting.mutateAsync({ key: attachKey, value: { list: attachments.filter((a) => a.id !== attachId) } }),
    });
  };

  // ── Calendar ─────────────────────────────────────────────────────────────────

  const dateCellRender = (value: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;
    const dayAppts = appointments.filter((a) => dayjs(a.scheduled_start).isSame(value, 'day'));
    if (dayAppts.length === 0) return null;
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {dayAppts.slice(0, 2).map((a) => (
          <li key={a.id}>
            <Badge color="blue" text={<Text style={{ fontSize: 11 }}>{(a.work_order as Record<string, unknown>)?.title as string ?? 'Appointment'}</Text>} />
          </li>
        ))}
        {dayAppts.length > 2 && (
          <li><Text type="secondary" style={{ fontSize: 11 }}>+{dayAppts.length - 2} more</Text></li>
        )}
      </ul>
    );
  };

  // ── Timeline items from history + notes ──────────────────────────────────────

  interface TimelineEntry { date: string; content: ReactNode; color: string; }
  const timelineItems: TimelineEntry[] = [
    ...(equipment.history ?? []).map((h) => {
      const cfg = ACTION_LABELS[h.action] ?? { color: 'gray', label: h.action };
      const who = h.assigned_to_user
        ? `${h.assigned_to_user.first_name} ${h.assigned_to_user.last_name}`
        : h.assigned_to_crew?.name ?? null;
      return {
        date: h.action_date,
        color: cfg.color,
        content: (
          <Space direction="vertical" size={0}>
            <Text strong>{cfg.label}</Text>
            {who && <Text type="secondary">→ {who}</Text>}
            {h.performed_by && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                by {h.performed_by.first_name} {h.performed_by.last_name}
              </Text>
            )}
            {h.notes && <Text type="secondary" style={{ fontSize: 12 }}>{h.notes}</Text>}
          </Space>
        ) as ReactNode,
      };
    }),
    ...notes.map((n) => ({
      date: n.created_at,
      color: 'purple',
      content: (
        <Space direction="vertical" size={0}>
          <Text strong>Note added</Text>
          <Text>{n.content}</Text>
        </Space>
      ) as ReactNode,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

  // ── Header actions ────────────────────────────────────────────────────────────

  const headerActions = (
    <Space wrap>
      {equipment.status === 'available' && (
        <Button icon={<SwapOutlined />} type="primary" onClick={() => setAssignOpen(true)}>
          Assign
        </Button>
      )}
      {equipment.status === 'assigned' && (
        <Button icon={<RollbackOutlined />} onClick={handleReturn} loading={returnMutation.isPending}>
          Return
        </Button>
      )}
      {(equipment.status === 'available' || equipment.status === 'assigned') && (
        <Button icon={<SettingOutlined />} onClick={() => setMaintenanceOpen(true)}>
          Maintenance
        </Button>
      )}
      {equipment.status === 'in_maintenance' && (
        <Button
          icon={<CheckCircleOutlined />}
          type="primary"
          onClick={handleCompleteMaintenance}
          loading={completeMutation.isPending}
        >
          Complete Maintenance
        </Button>
      )}
      {equipment.status !== 'retired' && (
        <Button icon={<EditOutlined />} onClick={() => navigate(`/workforce/equipment/${id}/edit`)}>
          Edit
        </Button>
      )}
      {equipment.status !== 'retired' && (
        <Button danger icon={<DeleteOutlined />} onClick={handleDelete} loading={deleteMutation.isPending}>
          Retire
        </Button>
      )}
    </Space>
  );

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="Equipment Details">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">{equipment.name}</Descriptions.Item>
                <Descriptions.Item label="Category">
                  {equipment.category?.name ?? <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Serial Number">
                  {equipment.serial_number
                    ? <Text code>{equipment.serial_number}</Text>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Barcode">
                  {equipment.barcode ?? <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Manufacturer">
                  {equipment.manufacturer ?? <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Model">
                  {equipment.model_number ?? <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Purchase Date">
                  {equipment.purchase_date
                    ? dayjs(equipment.purchase_date).format('MMM D, YYYY')
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Last Maintenance">
                  {equipment.last_maintenance_date
                    ? dayjs(equipment.last_maintenance_date).format('MMM D, YYYY')
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="Current Assignment">
              {equipment.status === 'assigned' ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {equipment.assigned_technician && (
                    <Space>
                      <Avatar icon={<UserOutlined />} />
                      <div>
                        <Text strong>
                          {equipment.assigned_technician.first_name} {equipment.assigned_technician.last_name}
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
                    <Text type="secondary">
                      Expected return: {dayjs(equipment.expected_return_date).format('MMM D, YYYY')}
                    </Text>
                  )}
                </Space>
              ) : (
                <Empty
                  description={
                    equipment.status === 'available'
                      ? 'Not currently assigned'
                      : equipment.status === 'in_maintenance'
                      ? 'In maintenance'
                      : 'Retired'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
            {(equipment.description || equipment.notes) && (
              <Card size="small" title="Notes" style={{ marginTop: 16 }}>
                {equipment.description && <Text style={{ display: 'block' }}>{equipment.description}</Text>}
                {equipment.notes && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>{equipment.notes}</Text>
                )}
              </Card>
            )}
          </Col>
        </Row>
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: timelineItems.length > 0 ? (
        <Card>
          <Timeline
            items={timelineItems.map((item) => ({
              color: item.color,
              children: (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {dayjs(item.date).format('MMM D, YYYY HH:mm')}
                  </Text>
                  {item.content}
                </div>
              ),
            }))}
          />
        </Card>
      ) : (
        <Empty description="No history yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ),
    },
    {
      key: 'calendar',
      label: 'Calendar',
      children: (
        <Card>
          <Calendar cellRender={(current, info) => dateCellRender(current as Dayjs, info as { type: string })} />
        </Card>
      ),
    },
    {
      key: 'appointments',
      label: (
        <Space>
          Service Appointments
          <Badge count={appointments.length} showZero style={{ backgroundColor: '#1677ff' }} />
        </Space>
      ),
      children: appointments.length > 0 ? (
        <Card>
          <List
            dataSource={appointments}
            renderItem={(a) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<CalendarOutlined />} style={{ backgroundColor: '#1677ff' }} />}
                  title={(a.work_order as Record<string, unknown>)?.title as string ?? `Appointment ${a.id.slice(0, 8)}`}
                  description={
                    <Space size={8} wrap>
                      <Tag color="blue">{a.status}</Tag>
                      <Text type="secondary">
                        {dayjs(a.scheduled_start).format('MMM D, YYYY HH:mm')} → {dayjs(a.scheduled_end).format('HH:mm')}
                      </Text>
                      {a.agent && (
                        <Text type="secondary">
                          {(a.agent as Record<string, unknown>).first_name as string} {(a.agent as Record<string, unknown>).last_name as string}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Empty
          description={
            equipment.assigned_technician_id || equipment.assigned_crew_id
              ? 'No upcoming appointments for assigned technician / crew'
              : 'Assign this equipment to a technician or crew to see their appointments'
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ),
    },
    {
      key: 'territories',
      label: 'Territories',
      children: equipmentTerritories.length > 0 ? (
        <Card>
          <Space wrap size={8}>
            {equipmentTerritories.map((t) => (
              <Tag key={t.id} icon={<EnvironmentOutlined />} color="gold" style={{ fontSize: 14, padding: '4px 12px' }}>
                {t.name}
              </Tag>
            ))}
          </Space>
        </Card>
      ) : (
        <Empty
          description={
            equipment.assigned_technician_id || equipment.assigned_crew_id
              ? 'No territories assigned to the assigned technician / crew'
              : 'Assign this equipment to see related territories'
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ),
    },
    {
      key: 'crew',
      label: 'Crew',
      children: equipment.assigned_crew ? (
        <Card>
          <Space align="center">
            <Avatar size={48} icon={<TeamOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <div>
              <Text strong style={{ fontSize: 16 }}>{equipment.assigned_crew.name}</Text>
              <br />
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => navigate(`/workforce/crew/${equipment.assigned_crew!.id}`)}
              >
                View Crew Details →
              </Button>
            </div>
          </Space>
        </Card>
      ) : (
        <Empty description="Not currently assigned to a crew" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ),
    },
    {
      key: 'time-off',
      label: 'Time Off',
      children: equipment.assigned_technician_id ? (
        (timeOffData?.data ?? []).length > 0 ? (
          <Card>
            <List
              dataSource={timeOffData?.data ?? []}
              renderItem={(r) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<ClockCircleOutlined />} />}
                    title={
                      <Space>
                        <Tag color={LEAVE_STATUS_COLORS[r.status]}>{r.status}</Tag>
                        <Text>{LEAVE_TYPE_LABELS[r.leave_type] ?? r.leave_type}</Text>
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        {dayjs(r.start_date).format('MMM D')} → {dayjs(r.end_date).format('MMM D, YYYY')} · {r.total_days_deducted} day(s)
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        ) : (
          <Empty description="No time off requests for assigned technician" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )
      ) : (
        <Empty description="Not assigned to a technician" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ),
    },
    {
      key: 'notes',
      label: (
        <Space>
          Notes
          <Badge count={notes.length} showZero style={{ backgroundColor: '#52c41a' }} />
        </Space>
      ),
      children: (
        <Card
          extra={
            <Button icon={<PlusOutlined />} size="small" onClick={() => setNoteOpen(true)}>
              Add Note
            </Button>
          }
          title="Notes"
        >
          {notes.length > 0 ? (
            <List
              dataSource={notes}
              renderItem={(note) => (
                <List.Item
                  actions={[
                    <Button key="del" type="link" danger size="small" onClick={() => handleDeleteNote(note.id)}>
                      Delete
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text>{note.content}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{dayjs(note.created_at).format('MMM D, YYYY HH:mm')}</Text>}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No notes yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      ),
    },
    {
      key: 'attachments',
      label: (
        <Space>
          Attachments
          <Badge count={attachments.length} showZero style={{ backgroundColor: '#722ed1' }} />
        </Space>
      ),
      children: (
        <Card
          extra={
            <Button icon={<LinkOutlined />} size="small" onClick={() => setAttachOpen(true)}>
              Add Link
            </Button>
          }
          title="Attachments"
        >
          {attachments.length > 0 ? (
            <List
              dataSource={attachments}
              renderItem={(attach) => (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type="link"
                      icon={<LinkOutlined />}
                      href={attach.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </Button>,
                    <Button key="del" type="link" danger size="small" onClick={() => handleDeleteAttachment(attach.id)}>
                      Delete
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<FileOutlined />} style={{ backgroundColor: '#722ed1' }} />}
                    title={attach.name}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{dayjs(attach.created_at).format('MMM D, YYYY HH:mm')}</Text>}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No attachments yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#fa8c16' }} />
            {equipment.name}
            <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
          </Space>
        }
        subtitle={equipment.category?.name ?? 'Equipment'}
        extra={headerActions}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ background: token.colorBgContainer, padding: '0 16px 16px', borderRadius: 8 }}
      />

      {/* Assign Modal */}
      <Modal
        title={<Space><SwapOutlined style={{ color: '#1677ff' }} />Assign Equipment</Space>}
        open={assignOpen}
        onCancel={() => { setAssignOpen(false); assignForm.resetFields(); }}
        onOk={handleAssign}
        okText="Assign"
        confirmLoading={assignMutation.isPending}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="assignee_type" label="Assign To" initialValue="technician">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="technician"><UserOutlined /> Technician</Radio.Button>
              <Radio.Button value="crew"><TeamOutlined /> Crew</Radio.Button>
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
                placeholder="Search technician"
                filterOption={(v, o) => String(o?.label ?? '').toLowerCase().includes(v.toLowerCase())}
                options={(allAgents ?? []).map((a) => ({
                  label: `${a.first_name} ${a.last_name} (${a.email})`,
                  value: a.id,
                }))}
              />
            ) : (
              <Select
                showSearch
                placeholder="Search crew"
                filterOption={(v, o) => String(o?.label ?? '').toLowerCase().includes(v.toLowerCase())}
                options={crews.map((c) => ({ label: c.name, value: c.id }))}
              />
            )}
          </Form.Item>
          <Form.Item name="expected_return_date" label="Expected Return Date (optional)">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        title={<Space><SettingOutlined style={{ color: '#fa8c16' }} />Send for Maintenance</Space>}
        open={maintenanceOpen}
        onCancel={() => { setMaintenanceOpen(false); maintenanceForm.resetFields(); }}
        onOk={handleMaintenance}
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

      {/* Add Note Modal */}
      <Modal
        title="Add Note"
        open={noteOpen}
        onCancel={() => { setNoteOpen(false); noteForm.resetFields(); }}
        onOk={handleAddNote}
        okText="Add Note"
        confirmLoading={upsertSetting.isPending}
        destroyOnClose
      >
        <Form form={noteForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="content" label="Note" rules={[{ required: true, message: 'Note content is required' }]}>
            <Input.TextArea rows={4} placeholder="Write a note about this equipment…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Attachment Modal */}
      <Modal
        title="Add Link"
        open={attachOpen}
        onCancel={() => { setAttachOpen(false); attachForm.resetFields(); }}
        onOk={handleAddAttachment}
        okText="Add Link"
        confirmLoading={upsertSetting.isPending}
        destroyOnClose
      >
        <Form form={attachForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Maintenance Manual" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[{ required: true, message: 'URL is required' }, { type: 'url', message: 'Enter a valid URL' }]}
          >
            <Input placeholder="https://…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
