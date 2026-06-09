import { useState, useMemo } from 'react';
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
  Switch,
  Tabs,
  Drawer,
  Avatar,
  Badge,
  Typography,
  Row,
  Col,
  Card,
  List,
  Divider,
  Transfer,
  Empty,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  ToolOutlined,
  EyeOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useCrews, useCreateCrew, useUpdateCrew, useDeleteCrew, useRemoveCrewMember } from '@/hooks/use-crews';
import { useAgents } from '@/hooks/use-users';
import { useSetting } from '@/hooks/use-settings';
import { useAllAssets } from '@/hooks/use-assets';
import { useCategories } from '@/hooks/use-lookups';
import type { Crew, CrewMember } from '@/types/models.types';
import type { CreateCrewPayload } from '@/api/crews.api';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface TerritoryItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface ShiftItem {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

type CrewFormValues = {
  name: string;
  description?: string;
  territory_id?: string;
  shift_id?: string;
  crew_leader_id?: string;
  is_active: boolean;
  member_ids: string[];
  skill_ids: string[];
  equipment_ids: string[];
};

export default function WorkforceCrewPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterTerritory, setFilterTerritory] = useState<string | undefined>();
  const [filterShift, setFilterShift] = useState<string | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [detailCrew, setDetailCrew] = useState<Crew | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [formTab, setFormTab] = useState('basic');
  const [form] = Form.useForm<CrewFormValues>();
  const selectedMemberIds: string[] = Form.useWatch('member_ids', form) ?? [];

  const { data: crewsData, isLoading } = useCrews({
    page,
    take: pageSize,
    search: search || undefined,
    territory_id: filterTerritory,
    shift_id: filterShift,
  });

  const { data: agentsData } = useAgents();
  const { data: territoriesSettingData } = useSetting('territories_settings');
  const { data: shiftsSettingData } = useSetting('shifts_settings');
  const { data: allAssets } = useAllAssets();
  const { data: categories } = useCategories();

  const createMutation = useCreateCrew();
  const updateMutation = useUpdateCrew();
  const deleteMutation = useDeleteCrew();
  const removeMemberMutation = useRemoveCrewMember();

  const crews = crewsData?.data ?? [];
  const meta = crewsData?.meta;
  const agents = agentsData ?? [];
  const territories: TerritoryItem[] = (territoriesSettingData?.value?.list as TerritoryItem[]) ?? [];
  const shifts: ShiftItem[] = (shiftsSettingData?.value?.list as ShiftItem[]) ?? [];

  const getTerritoryName = (id: string | null) => {
    if (!id) return '—';
    return territories.find((t) => t.id === id)?.name ?? id;
  };

  const getShiftName = (id: string | null) => {
    if (!id) return '—';
    return shifts.find((s) => s.id === id)?.name ?? id;
  };

  const openCreate = () => {
    setEditingCrew(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, member_ids: [], skill_ids: [], equipment_ids: [] });
    setFormTab('basic');
    setModalOpen(true);
  };

  const openEdit = (crew: Crew) => {
    setEditingCrew(crew);
    form.setFieldsValue({
      name: crew.name,
      description: crew.description ?? undefined,
      territory_id: crew.territory_id ?? undefined,
      shift_id: crew.shift_id ?? undefined,
      crew_leader_id: crew.crew_leader_id ?? undefined,
      is_active: crew.is_active,
      member_ids: crew.members?.map((m) => m.technician_id) ?? [],
      skill_ids: crew.skills?.map((s) => s.category_id) ?? [],
      equipment_ids: crew.equipment?.map((e) => e.asset_id) ?? [],
    });
    setFormTab('basic');
    setModalOpen(true);
  };

  const openDetail = (crew: Crew) => {
    setDetailCrew(crew);
    setDetailDrawerOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateCrewPayload = {
        name: values.name,
        description: values.description,
        territory_id: values.territory_id,
        shift_id: values.shift_id,
        crew_leader_id: values.crew_leader_id,
        is_active: values.is_active,
        member_ids: values.member_ids ?? [],
        skill_ids: values.skill_ids ?? [],
        equipment_ids: values.equipment_ids ?? [],
      };

      if (editingCrew) {
        await updateMutation.mutateAsync({ id: editingCrew.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setModalOpen(false);
      form.resetFields();
    } catch {
      // form validation errors handled by antd
    }
  };

  const handleDelete = (crew: Crew) => {
    showConfirmDialog({
      title: `Delete "${crew.name}"?`,
      content: 'This crew will be deactivated and hidden from the dispatch board.',
      onOk: () => deleteMutation.mutateAsync(crew.id),
    });
  };

  const handleRemoveMember = (crew: Crew, member: CrewMember) => {
    const isLeader = crew.crew_leader_id === member.technician_id;
    if (isLeader) {
      Modal.warning({
        title: 'Cannot remove crew leader',
        content: 'Please assign a different leader before removing this member.',
      });
      return;
    }
    showConfirmDialog({
      title: 'Remove member?',
      content: `Remove ${member.technician?.first_name} ${member.technician?.last_name} from ${crew.name}?`,
      onOk: () => removeMemberMutation.mutateAsync({ crewId: crew.id, technicianId: member.technician_id }),
    });
  };

  // Transfer list data for member selection
  const transferDataSource = useMemo(
    () =>
      agents.map((agent) => ({
        key: agent.id,
        title: `${agent.first_name} ${agent.last_name}`,
        description: agent.email,
      })),
    [agents],
  );

  const columns: ColumnsType<Crew> = [
    {
      title: 'Crew Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1677ff' }} />
          <span
            style={{ fontWeight: 500, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => openDetail(record)}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: 'Crew Leader',
      key: 'crew_leader',
      render: (_, record) =>
        record.crew_leader ? (
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <Text>{record.crew_leader.first_name} {record.crew_leader.last_name}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Members',
      key: 'members',
      render: (_, record) => {
        const activeMembers = record.members?.filter((m) => !m.is_deleted) ?? [];
        return (
          <Tooltip
            title={
              activeMembers.length > 0
                ? activeMembers.map((m) => `${m.technician?.first_name ?? ''} ${m.technician?.last_name ?? ''}`).join(', ')
                : 'No members'
            }
          >
            <Badge count={activeMembers.length} showZero style={{ backgroundColor: '#52c41a' }}>
              <TeamOutlined style={{ fontSize: 18, padding: '0 4px' }} />
            </Badge>
          </Tooltip>
        );
      },
    },
    {
      title: 'Territory',
      key: 'territory_id',
      render: (_, record) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#faad14' }} />
          <Text>{getTerritoryName(record.territory_id)}</Text>
        </Space>
      ),
    },
    {
      title: 'Shift',
      key: 'shift_id',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#722ed1' }} />
          <Text>{getShiftName(record.shift_id)}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'is_active',
      render: (_, record) =>
        record.is_active ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Edit crew">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete crew">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleteMutation.isPending}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Crew Management"
        subtitle="Create and manage field service crews, assign members, territories, and shifts."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Crew
          </Button>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={16} align="middle">
          <Col flex={1}>
            <Input.Search
              placeholder="Search crews by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ maxWidth: 320 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by Territory"
              style={{ width: 200 }}
              allowClear
              value={filterTerritory}
              onChange={setFilterTerritory}
              options={territories.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Filter by Shift"
              style={{ width: 180 }}
              allowClear
              value={filterShift}
              onChange={setFilterShift}
              options={shifts.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={crews}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: meta?.itemCount ?? 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `${total} crews`,
          }}
          locale={{ emptyText: <Empty description="No crews found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editingCrew ? `Edit Crew: ${editingCrew.name}` : 'New Crew'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingCrew ? 'Save Changes' : 'Create Crew'}
        confirmLoading={isMutating}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Tabs activeKey={formTab} onChange={setFormTab}>
            <TabPane tab="Basic Info" key="basic">
              <Form.Item
                name="name"
                label="Crew Name"
                rules={[{ required: true, message: 'Crew name is required' }, { max: 100 }]}
              >
                <Input placeholder="e.g. North HVAC Team" />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Optional description" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="territory_id" label="Territory">
                    <Select
                      placeholder="Select territory"
                      allowClear
                      options={territories.map((t) => ({ label: t.name, value: t.id }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="shift_id" label="Shift / Working Hours">
                    <Select
                      placeholder="Select shift"
                      allowClear
                      options={shifts.map((s) => ({
                        label: `${s.name} (${s.start_time}–${s.end_time})`,
                        value: s.id,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="Members" key="members">
              <Form.Item label="Select crew members">
                <Transfer
                  dataSource={transferDataSource}
                  titles={['Available', 'In Crew']}
                  showSearch
                  filterOption={(input, item) => {
                    const rec = item as { title: string; description: string };
                    return rec.title.toLowerCase().includes(input.toLowerCase()) ||
                      rec.description.toLowerCase().includes(input.toLowerCase());
                  }}
                  render={(item) => item.title}
                  listStyle={{ width: 280, height: 300 }}
                  onChange={(nextTargetKeys) => {
                    form.setFieldValue('member_ids', nextTargetKeys as string[]);
                    const leader = form.getFieldValue('crew_leader_id') as string | undefined;
                    if (leader && !(nextTargetKeys as string[]).includes(leader)) {
                      form.setFieldValue('crew_leader_id', undefined);
                    }
                  }}
                  targetKeys={selectedMemberIds}
                />
              </Form.Item>
              {/* Hidden field to hold member_ids value for form submission */}
              <Form.Item name="member_ids" hidden>
                <input type="hidden" />
              </Form.Item>

              <Form.Item
                name="crew_leader_id"
                label="Crew Leader"
                help={selectedMemberIds.length === 0 ? 'Add members first, then select a leader' : undefined}
              >
                <Select
                  placeholder="Select crew leader from members"
                  allowClear
                  disabled={selectedMemberIds.length === 0}
                  options={agents
                    .filter((a) => selectedMemberIds.includes(a.id))
                    .map((a) => ({
                      label: `${a.first_name} ${a.last_name}`,
                      value: a.id,
                    }))}
                />
              </Form.Item>
            </TabPane>

            <TabPane tab="Skills & Equipment" key="skills">
              <Form.Item
                name="skill_ids"
                label={
                  <Space>
                    <SafetyOutlined />
                    Skills / Certifications
                  </Space>
                }
                help="Select the skill categories this crew is certified for"
              >
                <Select
                  mode="multiple"
                  placeholder="Select skills"
                  allowClear
                  options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
                  notFoundContent={<Text type="secondary">No skills configured yet. Add categories in Settings.</Text>}
                />
              </Form.Item>

              <Divider />

              <Form.Item
                name="equipment_ids"
                label={
                  <Space>
                    <ToolOutlined />
                    Assigned Equipment / Vehicles
                  </Space>
                }
                help="Assign vehicles or tools from the asset registry to this crew"
              >
                <Select
                  mode="multiple"
                  placeholder="Select equipment"
                  allowClear
                  options={(allAssets ?? []).map((a) => ({ label: `${a.name}${a.model ? ` (${a.model})` : ''}`, value: a.id }))}
                  notFoundContent={<Text type="secondary">No assets available. Add equipment in the Assets module.</Text>}
                />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title={
          <Space>
            <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <span>{detailCrew?.name}</span>
            {detailCrew?.is_active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>}
          </Space>
        }
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={520}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => { setDetailDrawerOpen(false); if (detailCrew) openEdit(detailCrew); }}>
              Edit
            </Button>
          </Space>
        }
      >
        {detailCrew && (
          <Tabs defaultActiveKey="overview">
            <TabPane tab="Overview" key="overview">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" title={<Space><EnvironmentOutlined />Territory</Space>}>
                    <Text>{getTerritoryName(detailCrew.territory_id)}</Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title={<Space><ClockCircleOutlined />Shift</Space>}>
                    <Text>{getShiftName(detailCrew.shift_id)}</Text>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" title="Crew Leader">
                    {detailCrew.crew_leader ? (
                      <Space>
                        <Avatar icon={<UserOutlined />} />
                        <Text strong>{detailCrew.crew_leader.first_name} {detailCrew.crew_leader.last_name}</Text>
                        <Text type="secondary">{detailCrew.crew_leader.email}</Text>
                      </Space>
                    ) : (
                      <Text type="secondary">No leader assigned</Text>
                    )}
                  </Card>
                </Col>
                {detailCrew.description && (
                  <Col span={24}>
                    <Card size="small" title="Description">
                      <Text>{detailCrew.description}</Text>
                    </Card>
                  </Col>
                )}
              </Row>
            </TabPane>

            <TabPane
              tab={
                <Space>
                  Members
                  <Badge count={detailCrew.members?.filter((m) => !m.is_deleted).length ?? 0} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              key="members"
            >
              <List
                dataSource={detailCrew.members?.filter((m) => !m.is_deleted) ?? []}
                locale={{ emptyDescription: 'No members in this crew' }}
                renderItem={(member) => {
                  const isLeader = detailCrew.crew_leader_id === member.technician_id;
                  return (
                    <List.Item
                      actions={[
                        <Popconfirm
                          key="remove"
                          title="Remove this member?"
                          disabled={isLeader}
                          onConfirm={() => handleRemoveMember(detailCrew, member)}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<MinusCircleOutlined />}
                            disabled={isLeader}
                            title={isLeader ? 'Cannot remove the crew leader' : undefined}
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
            </TabPane>

            <TabPane
              tab={
                <Space>
                  Skills
                  <Badge count={detailCrew.skills?.length ?? 0} style={{ backgroundColor: '#722ed1' }} />
                </Space>
              }
              key="skills"
            >
              {detailCrew.skills && detailCrew.skills.length > 0 ? (
                <Space wrap>
                  {detailCrew.skills.map((skill) => (
                    <Tag key={skill.id} icon={<SafetyOutlined />} color="purple">
                      {skill.category?.name ?? skill.category_id}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="No skills assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </TabPane>

            <TabPane
              tab={
                <Space>
                  Equipment
                  <Badge count={detailCrew.equipment?.length ?? 0} style={{ backgroundColor: '#fa8c16' }} />
                </Space>
              }
              key="equipment"
            >
              <List
                dataSource={detailCrew.equipment ?? []}
                locale={{ emptyDescription: 'No equipment assigned' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#fa8c16' }} />}
                      title={item.asset?.name ?? item.asset_id}
                      description={
                        <Space>
                          {item.asset?.model && <Text type="secondary">{item.asset.model}</Text>}
                          {item.asset?.serial_number && <Text type="secondary">S/N: {item.asset.serial_number}</Text>}
                          {item.asset?.category && <Tag>{item.asset.category}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
}
