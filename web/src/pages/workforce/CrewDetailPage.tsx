import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Table, Spin, Tabs, Timeline,
  Typography, Row, Col, Empty, Modal, Input, Avatar, List, Badge,
  Popconfirm, Form, Calendar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined, EditOutlined, TeamOutlined, UserOutlined,
  EnvironmentOutlined, ClockCircleOutlined, CalendarOutlined,
  SafetyOutlined, ToolOutlined, ScheduleOutlined, HistoryOutlined,
  PlusOutlined, DeleteOutlined, PaperClipOutlined, MinusCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useCrew, useDeleteCrew, useRemoveCrewMember } from '@/hooks/use-crews';
import { useSetting, useUpsertSetting } from '@/hooks/use-settings';
import { useAllAppointments } from '@/hooks/use-appointments';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateTime } from '@/utils/format-date';
import type { ServiceAppointment, CrewMember } from '@/types/models.types';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TerritoryItem { id: string; name: string; description?: string; color?: string; }
interface ShiftItem { id: string; name: string; start_time: string; end_time: string; timezone: string; }
interface NoteItem { id: string; content: string; created_at: string; }
interface AttachmentItem { id: string; name: string; url: string; created_at: string; }

const APPT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'blue', in_progress: 'processing', completed: 'success', cancelled: 'error',
};

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [noteInput, setNoteInput] = useState('');
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  const { data: crew, isLoading } = useCrew(id!);
  const deleteCrew = useDeleteCrew();
  const removeMember = useRemoveCrewMember();

  const { data: allAppointments } = useAllAppointments();

  // Settings-based lookups
  const { data: territoriesSetting } = useSetting('territories_settings');
  const { data: shiftsSetting } = useSetting('shifts_settings');
  const { data: notesSetting } = useSetting(`crew_notes_${id}`);
  const { data: attachSetting } = useSetting(`crew_attachments_${id}`);
  const upsertSetting = useUpsertSetting();

  const territories: TerritoryItem[] = useMemo(
    () => (territoriesSetting?.value?.list as TerritoryItem[] | undefined) ?? [],
    [territoriesSetting],
  );
  const shifts: ShiftItem[] = useMemo(
    () => (shiftsSetting?.value?.list as ShiftItem[] | undefined) ?? [],
    [shiftsSetting],
  );
  const notes: NoteItem[] = useMemo(
    () => (notesSetting?.value?.list as NoteItem[] | undefined) ?? [],
    [notesSetting],
  );
  const attachments: AttachmentItem[] = useMemo(
    () => (attachSetting?.value?.list as AttachmentItem[] | undefined) ?? [],
    [attachSetting],
  );

  const crewTerritories = useMemo(
    () => territories.filter((t) => crew?.territory_ids?.includes(t.id)),
    [territories, crew],
  );
  const crewShift = useMemo(
    () => shifts.find((s) => s.id === crew?.shift_id),
    [shifts, crew],
  );

  // Appointments for this crew
  const crewAppointments = useMemo(
    () => (allAppointments || []).filter((a) => a.crew_id === id),
    [allAppointments, id],
  );

  // Calendar map
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, ServiceAppointment[]> = {};
    crewAppointments.forEach((a) => {
      const key = dayjs(a.scheduled_start).format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [crewAppointments]);

  const dateCellRender = (value: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;
    const items = appointmentsByDate[value.format('YYYY-MM-DD')] || [];
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.slice(0, 2).map((item) => (
          <li key={item.id}>
            <Badge
              status={item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'error' : 'processing'}
              text={<Text style={{ fontSize: 11 }}>{dayjs(item.scheduled_start).format('HH:mm')}</Text>}
            />
          </li>
        ))}
        {items.length > 2 && (
          <li><Text type="secondary" style={{ fontSize: 11 }}>+{items.length - 2}</Text></li>
        )}
      </ul>
    );
  };

  // Timeline items
  const timelineItems = useMemo(() => {
    const items: { time: string; color: string; icon: ReactNode; label: string; detail: string }[] = [];
    if (crew) {
      items.push({
        time: crew.created_at,
        color: 'green',
        icon: <TeamOutlined />,
        label: 'Crew created',
        detail: dayjs(crew.created_at).format('MMM D, YYYY'),
      });
    }
    crewAppointments.forEach((a) => {
      items.push({
        time: a.scheduled_start,
        color: a.status === 'completed' ? 'green' : a.status === 'cancelled' ? 'red' : 'blue',
        icon: <CalendarOutlined />,
        label: `Appointment — ${a.status.replace('_', ' ')}`,
        detail: `${dayjs(a.scheduled_start).format('MMM D, HH:mm')} – ${dayjs(a.scheduled_end).format('HH:mm')}`,
      });
    });
    notes.forEach((n) => {
      items.push({
        time: n.created_at,
        color: 'gray',
        icon: <EditOutlined />,
        label: 'Note added',
        detail: n.content.length > 60 ? n.content.slice(0, 60) + '…' : n.content,
      });
    });
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items.slice(0, 50);
  }, [crew, crewAppointments, notes]);

  // Note actions
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      content: noteInput.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    await upsertSetting.mutateAsync({ key: `crew_notes_${id}`, value: { list: updated } });
    setNoteInput('');
  };

  const handleDeleteNote = async (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    await upsertSetting.mutateAsync({ key: `crew_notes_${id}`, value: { list: updated } });
  };

  // Attachment actions
  const handleAddAttachment = async () => {
    if (!attachName.trim() || !attachUrl.trim()) return;
    const newAttach: AttachmentItem = {
      id: `attach-${Date.now()}`,
      name: attachName.trim(),
      url: attachUrl.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [...attachments, newAttach];
    await upsertSetting.mutateAsync({ key: `crew_attachments_${id}`, value: { list: updated } });
    setAttachName('');
    setAttachUrl('');
    setAttachModalOpen(false);
  };

  const handleDeleteAttachment = async (attachId: string) => {
    const updated = attachments.filter((a) => a.id !== attachId);
    await upsertSetting.mutateAsync({ key: `crew_attachments_${id}`, value: { list: updated } });
  };

  const handleRemoveMember = (member: CrewMember) => {
    if (!crew) return;
    if (crew.crew_leader_id === member.technician_id) {
      Modal.warning({
        title: 'Cannot remove crew leader',
        content: 'Please assign a different leader before removing this member.',
      });
      return;
    }
    showConfirmDialog({
      title: 'Remove member?',
      content: `Remove ${member.technician?.first_name} ${member.technician?.last_name} from ${crew.name}?`,
      onOk: () => removeMember.mutateAsync({ crewId: crew.id, technicianId: member.technician_id }),
      danger: true,
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!crew) return null;

  const activeMembers = crew.members?.filter((m) => !m.is_deleted) ?? [];

  // ── Column definitions ────────────────────────────────────────────────────

  const appointmentColumns: ColumnsType<ServiceAppointment> = [
    {
      title: 'Work Order',
      key: 'wo',
      render: (_, r) => r.work_order?.wo_number || (r.work_order_id?.slice(0, 8) + '…'),
    },
    {
      title: 'Scheduled Start',
      dataIndex: 'scheduled_start',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Scheduled End',
      dataIndex: 'scheduled_end',
      render: (v: string) => formatDateTime(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={APPT_STATUS_COLOR[v] || 'default'}>{v.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Technician',
      key: 'agent',
      render: (_, r) =>
        r.agent ? `${r.agent.first_name} ${r.agent.last_name}` : '—',
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: <span><TeamOutlined /> Overview</span>,
      children: (
        <Card>
          <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered>
            <Descriptions.Item label="Crew Name">{crew.name}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={crew.is_active ? 'success' : 'error'}>
                {crew.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Members">{activeMembers.length}</Descriptions.Item>
            <Descriptions.Item label="Crew Leader">
              {crew.crew_leader
                ? `${crew.crew_leader.first_name} ${crew.crew_leader.last_name}`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Shift">
              {crewShift
                ? `${crewShift.name} (${crewShift.start_time}–${crewShift.end_time})`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(crew.created_at)}</Descriptions.Item>
            {crew.description && (
              <Descriptions.Item label="Description" span={3}>
                {crew.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'timeline',
      label: <span><HistoryOutlined /> Timeline</span>,
      children: (
        <Card title="Activity Timeline">
          {timelineItems.length === 0 ? (
            <Empty description="No activity recorded" />
          ) : (
            <Timeline
              items={timelineItems.map((item) => ({
                color: item.color,
                dot: item.icon,
                children: (
                  <div>
                    <Text strong>{item.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.time).format('MMM D, YYYY')} — {item.detail}
                    </Text>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'calendar',
      label: <span><CalendarOutlined /> Calendar</span>,
      children: (
        <Card title="Appointment Calendar">
          <Calendar cellRender={(current, info) => dateCellRender(current, info)} />
          {crewAppointments.length === 0 && (
            <Empty description="No appointments scheduled" style={{ marginTop: 24 }} />
          )}
        </Card>
      ),
    },
    {
      key: 'members',
      label: (
        <span>
          <TeamOutlined /> Members
          <Badge count={activeMembers.length} style={{ marginLeft: 6, backgroundColor: '#52c41a' }} />
        </span>
      ),
      children: (
        <Card
          title="Crew Members"
          extra={
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/workforce/crew/${id}/edit`)}>
              Edit Members
            </Button>
          }
        >
          <List
            dataSource={activeMembers}
            locale={{ emptyDescription: 'No members in this crew' }}
            renderItem={(member) => {
              const isLeader = crew.crew_leader_id === member.technician_id;
              return (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="remove"
                      title="Remove this member?"
                      disabled={isLeader}
                      onConfirm={() => handleRemoveMember(member)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<MinusCircleOutlined />}
                        disabled={isLeader}
                        title={isLeader ? 'Cannot remove crew leader' : undefined}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        {member.technician?.first_name} {member.technician?.last_name}
                        {isLeader && <Tag color="gold">Leader</Tag>}
                      </Space>
                    }
                    description={member.technician?.email}
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      ),
    },
    {
      key: 'appointments',
      label: (
        <span>
          <ScheduleOutlined /> Service Appointments ({crewAppointments.length})
        </span>
      ),
      children: (
        <Card title="Service Appointments">
          <Table
            columns={appointmentColumns}
            dataSource={crewAppointments}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: <Empty description="No appointments found" /> }}
          />
        </Card>
      ),
    },
    {
      key: 'territories',
      label: (
        <span>
          <EnvironmentOutlined /> Territories ({crewTerritories.length})
        </span>
      ),
      children: (
        <Card
          title="Assigned Territories"
          extra={
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/workforce/crew/${id}/edit`)}>
              Edit
            </Button>
          }
        >
          {crewTerritories.length === 0 ? (
            <Empty description="No territories assigned" />
          ) : (
            <Row gutter={[16, 16]}>
              {crewTerritories.map((t) => (
                <Col key={t.id} xs={24} sm={12} md={8}>
                  <Card size="small" style={{ borderLeft: `4px solid ${t.color || '#1890ff'}` }}>
                    <Text strong>{t.name}</Text>
                    {t.description && (
                      <>
                        <br />
                        <Text type="secondary">{t.description}</Text>
                      </>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      ),
    },
    {
      key: 'skills',
      label: (
        <span>
          <SafetyOutlined /> Skills ({(crew.skills?.length ?? 0) + (crew.equipment?.length ?? 0)})
        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card title="Skills & Certifications">
            {crew.skills && crew.skills.length > 0 ? (
              <Space wrap>
                {crew.skills.map((s) => (
                  <Tag key={s.id} icon={<SafetyOutlined />} color="purple" style={{ fontSize: 13, padding: '4px 10px' }}>
                    {s.category?.name ?? s.category_id}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Empty description="No skills assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
          <Card title="Assigned Equipment / Vehicles">
            {crew.equipment && crew.equipment.length > 0 ? (
              <List
                dataSource={crew.equipment}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#fa8c16' }} />}
                      title={item.asset?.name ?? item.asset_id}
                      description={
                        <Space>
                          {item.asset?.model && <Text type="secondary">{item.asset.model}</Text>}
                          {item.asset?.serial_number && (
                            <Text type="secondary">S/N: {item.asset.serial_number}</Text>
                          )}
                          {item.asset?.category && <Tag>{item.asset.category}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No equipment assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Space>
      ),
    },
    {
      key: 'notes',
      label: <span><EditOutlined /> Notes ({notes.length})</span>,
      children: (
        <Card title="Notes">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                rows={3}
                placeholder="Add a note about this crew…"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                style={{ flex: 1 }}
              />
            </Space.Compact>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddNote}
              loading={upsertSetting.isPending}
              disabled={!noteInput.trim()}
            >
              Add Note
            </Button>

            {notes.length === 0 ? (
              <Empty description="No notes yet" />
            ) : (
              <List
                dataSource={notes}
                renderItem={(note) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Delete this note?"
                        onConfirm={() => handleDeleteNote(note.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(note.created_at).format('MMM D, YYYY HH:mm')}
                        </Text>
                      }
                      title={<Paragraph style={{ marginBottom: 0 }}>{note.content}</Paragraph>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Card>
      ),
    },
    {
      key: 'attachments',
      label: <span><PaperClipOutlined /> Attachments ({attachments.length})</span>,
      children: (
        <Card
          title="Attachments"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAttachModalOpen(true)}
            >
              Add Link
            </Button>
          }
        >
          {attachments.length === 0 ? (
            <Empty description="No attachments yet" />
          ) : (
            <List
              dataSource={attachments}
              renderItem={(att) => (
                <List.Item
                  actions={[
                    <a key="open" href={att.url} target="_blank" rel="noopener noreferrer">
                      <Button size="small" icon={<LinkOutlined />}>Open</Button>
                    </a>,
                    <Popconfirm
                      key="del"
                      title="Delete this attachment?"
                      onConfirm={() => handleDeleteAttachment(att.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<PaperClipOutlined />} style={{ backgroundColor: '#1677ff' }} />}
                    title={att.name}
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Added {dayjs(att.created_at).format('MMM D, YYYY')}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={crew.name}
        subtitle={crew.description || (crewShift ? `${crewShift.name} · ${activeMembers.length} members` : `${activeMembers.length} members`)}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workforce/crew')}>
              Back
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/workforce/crew/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              danger
              onClick={() =>
                showConfirmDialog({
                  title: `Delete "${crew.name}"?`,
                  content: 'This crew will be permanently removed.',
                  onOk: async () => {
                    await deleteCrew.mutateAsync(id!);
                    navigate('/workforce/crew');
                  },
                  danger: true,
                })
              }
            >
              Delete
            </Button>
          </Space>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="line"
        size="middle"
      />

      {/* Add Attachment Modal */}
      <Modal
        title="Add Attachment Link"
        open={attachModalOpen}
        onCancel={() => { setAttachModalOpen(false); setAttachName(''); setAttachUrl(''); }}
        onOk={handleAddAttachment}
        okText="Add"
        okButtonProps={{ disabled: !attachName.trim() || !attachUrl.trim(), loading: upsertSetting.isPending }}
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Name / Description" required>
            <Input
              placeholder="e.g. Safety Certificate, Vehicle Manual"
              value={attachName}
              onChange={(e) => setAttachName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="URL" required>
            <Input
              placeholder="https://..."
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
