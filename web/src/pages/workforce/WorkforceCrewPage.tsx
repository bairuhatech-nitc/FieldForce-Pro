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
  Checkbox,
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
  MinusCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import { useCrews, useCreateCrew, useUpdateCrew, useDeleteCrew, useRemoveCrewMember } from '@/hooks/use-crews';
import { useAgents } from '@/hooks/use-users';
import { useSetting } from '@/hooks/use-settings';
import { useAllAssets } from '@/hooks/use-assets';
import { useCategories } from '@/hooks/use-lookups';
import type { Crew, CrewMember } from '@/types/models.types';
import type { CreateCrewPayload } from '@/api/crews.api';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';

const { Text } = Typography;

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
  territory_ids?: string[];
  shift_id?: string;
  crew_leader_id?: string;
  is_active: boolean;
  member_ids: string[];
  skill_ids: string[];
  equipment_ids: string[];
};

type FilterOperator =
  | 'contains'
  | 'doesNotContain'
  | 'is'
  | 'isNot'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty';

interface AdvancedFilterField {
  enabled: boolean;
  operator: FilterOperator;
  value: string;
}

type CrewAdvancedFilterKey =
  | 'name'
  | 'lead'
  | 'territory'
  | 'created_by'
  | 'created_time'
  | 'crew_owner'
  | 'crew_size'
  | 'currency'
  | 'exchange_rate'
  | 'is_active'
  | 'modified_by'
  | 'modified_time';

type CrewAdvancedFilters = Record<CrewAdvancedFilterKey, AdvancedFilterField>;

const CREW_ADVANCED_FIELDS: { key: CrewAdvancedFilterKey; label: string }[] = [
  { key: 'name', label: 'Crew Name' },
  { key: 'lead', label: 'Lead' },
  { key: 'territory', label: 'Territory' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_time', label: 'Created Time' },
  { key: 'crew_owner', label: 'Crew Owner' },
  { key: 'crew_size', label: 'Crew Size' },
  { key: 'currency', label: 'Currency' },
  { key: 'exchange_rate', label: 'Exchange Rate' },
  { key: 'is_active', label: 'isActive' },
  { key: 'modified_by', label: 'Modified By' },
  { key: 'modified_time', label: 'Modified Time' },
];

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'doesNotContain', label: "doesn't contain" },
  { value: 'is', label: 'is' },
  { value: 'isNot', label: "isn't" },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];

function initCrewAdvancedFilters(): CrewAdvancedFilters {
  return Object.fromEntries(
    CREW_ADVANCED_FIELDS.map(({ key }) => [
      key,
      { enabled: false, operator: 'contains' as FilterOperator, value: '' },
    ]),
  ) as CrewAdvancedFilters;
}

function getCrewFieldValue(
  crew: Crew,
  key: CrewAdvancedFilterKey,
  territories: TerritoryItem[],
): string {
  const resolveTerritory = (ids: string[] | null | undefined) =>
    (ids ?? [])
      .map((id) => territories.find((t) => t.id === id)?.name ?? id)
      .join(', ');

  switch (key) {
    case 'name':
      return crew.name ?? '';
    case 'lead':
      return crew.crew_leader
        ? `${crew.crew_leader.first_name ?? ''} ${crew.crew_leader.last_name ?? ''}`.trim()
        : '';
    case 'territory':
      return resolveTerritory(crew.territory_ids);
    case 'created_by':
      return '';
    case 'created_time':
      return crew.created_at ?? '';
    case 'crew_owner':
      return crew.crew_leader
        ? `${crew.crew_leader.first_name ?? ''} ${crew.crew_leader.last_name ?? ''}`.trim()
        : '';
    case 'crew_size':
      return String(crew.members?.filter((m) => !(m as CrewMember & { is_deleted?: boolean }).is_deleted).length ?? 0);
    case 'currency':
      return '';
    case 'exchange_rate':
      return '';
    case 'is_active':
      return crew.is_active ? 'true' : 'false';
    case 'modified_by':
      return '';
    case 'modified_time':
      return crew.updated_at ?? '';
    default:
      return '';
  }
}

function applyCrewOperator(fieldVal: string, operator: FilterOperator, filterVal: string): boolean {
  const fv = fieldVal.toLowerCase();
  const v = filterVal.toLowerCase().trim();
  switch (operator) {
    case 'contains':
      return fv.includes(v);
    case 'doesNotContain':
      return !fv.includes(v);
    case 'is':
      return fv === v;
    case 'isNot':
      return fv !== v;
    case 'startsWith':
      return fv.startsWith(v);
    case 'endsWith':
      return fv.endsWith(v);
    case 'isEmpty':
      return fv.trim() === '';
    case 'isNotEmpty':
      return fv.trim() !== '';
    default:
      return true;
  }
}

export default function WorkforceCrewPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [simpleFilters, setSimpleFilters] = useState({ name: '', lead: '', territory: '' });
  const [advancedFilters, setAdvancedFilters] = useState<CrewAdvancedFilters>(initCrewAdvancedFilters);

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

  const getTerritoryName = (id: string) =>
    territories.find((t) => t.id === id)?.name ?? id;

  const getTerritoryNames = (ids: string[] | null | undefined): string[] =>
    (ids ?? []).map(getTerritoryName);

  const getShiftName = (id: string | null) => {
    if (!id) return '—';
    return shifts.find((s) => s.id === id)?.name ?? id;
  };

  const updateAdvancedField = (key: CrewAdvancedFilterKey, patch: Partial<AdvancedFilterField>) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const filteredCrews = useMemo(() => {
    const list = crews;
    if (isAdvancedMode) {
      return list.filter((crew) =>
        CREW_ADVANCED_FIELDS.every(({ key }) => {
          const f = advancedFilters[key];
          if (!f.enabled) return true;
          const noValue = f.operator === 'isEmpty' || f.operator === 'isNotEmpty';
          if (!noValue && !f.value.trim()) return true;
          return applyCrewOperator(getCrewFieldValue(crew, key, territories), f.operator, f.value);
        }),
      );
    }
    return list.filter((crew) => {
      if (
        simpleFilters.name &&
        !crew.name.toLowerCase().includes(simpleFilters.name.toLowerCase())
      )
        return false;
      if (simpleFilters.lead) {
        const leadName = crew.crew_leader
          ? `${crew.crew_leader.first_name ?? ''} ${crew.crew_leader.last_name ?? ''}`.toLowerCase()
          : '';
        if (!leadName.includes(simpleFilters.lead.toLowerCase())) return false;
      }
      if (simpleFilters.territory) {
        const tNames = getTerritoryNames(crew.territory_ids).join(' ').toLowerCase();
        if (!tNames.includes(simpleFilters.territory.toLowerCase())) return false;
      }
      return true;
    });
  }, [crews, simpleFilters, advancedFilters, isAdvancedMode, territories]);

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
      territory_ids: crew.territory_ids ?? [],
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
        territory_ids: values.territory_ids ?? [],
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
            onClick={() => navigate(`/workforce/crew/${record.id}`)}
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
      key: 'territory_ids',
      render: (_, record) => {
        const names = getTerritoryNames(record.territory_ids);
        if (names.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space wrap>
            {names.map((name, i) => (
              <Tag key={i} icon={<EnvironmentOutlined />} color="gold">{name}</Tag>
            ))}
          </Space>
        );
      },
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
          <Tooltip title="Edit crew">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/workforce/crew/${record.id}/edit`)} />
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

  // ── Tab content for Create/Edit Modal ────────────────────────────────────

  const basicInfoTab = (
    <>
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
          <Form.Item name="territory_ids" label="Territories">
            <Select
              mode="multiple"
              placeholder="Select territories"
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
    </>
  );

  const membersTab = (
    <>
      <Form.Item label="Select crew members">
        <Transfer
          dataSource={transferDataSource}
          titles={['Available', 'In Crew']}
          showSearch
          filterOption={(input, item) => {
            const rec = item as { title: string; description: string };
            return (
              rec.title.toLowerCase().includes(input.toLowerCase()) ||
              rec.description.toLowerCase().includes(input.toLowerCase())
            );
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
      {/* Hidden field keeps member_ids registered so Form.useWatch picks it up after resetFields */}
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
    </>
  );

  const skillsTab = (
    <>
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
    </>
  );

  return (
    <div>
      <PageHeader
        title="Crew Management"
        subtitle="Create and manage field service crews, assign members, territories, and shifts."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/workforce/crew/new')}>
            New Crew
          </Button>
        }
      />

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: '12px 16px' }}>
        {!isAdvancedMode ? (
          <div>
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={8}>
                <Input
                  placeholder="Crew Name"
                  prefix={<FilterOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />}
                  value={simpleFilters.name}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, name: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={8}>
                <Input
                  placeholder="Lead"
                  value={simpleFilters.lead}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, lead: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={8}>
                <Input
                  placeholder="Territory"
                  value={simpleFilters.territory}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, territory: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
            </Row>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, fontSize: 12 }}
                onClick={() => setIsAdvancedMode(true)}
              >
                Switch to Advanced Filter &gt;&gt;
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong style={{ fontSize: 13 }}>Advanced Filter</Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, fontSize: 12 }}
                onClick={() => {
                  setIsAdvancedMode(false);
                  setAdvancedFilters(initCrewAdvancedFilters());
                }}
              >
                &lt;&lt; Switch to Simple Filter
              </Button>
            </div>
            <Row gutter={[16, 6]}>
              {CREW_ADVANCED_FIELDS.map(({ key, label }) => {
                const field = advancedFilters[key];
                const noValueNeeded = field.operator === 'isEmpty' || field.operator === 'isNotEmpty';
                return (
                  <Col xs={24} sm={12} key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
                      <Checkbox
                        checked={field.enabled}
                        onChange={(e) => updateAdvancedField(key, { enabled: e.target.checked, value: '' })}
                        style={{ flexShrink: 0, width: 110 }}
                      >
                        <Text style={{ fontSize: 12 }}>{label}</Text>
                      </Checkbox>
                      {field.enabled && (
                        <Space.Compact size="small" style={{ flex: 1 }}>
                          <Select
                            value={field.operator}
                            onChange={(v) => updateAdvancedField(key, { operator: v })}
                            size="small"
                            style={{ width: 148 }}
                            options={FILTER_OPERATORS.map((op) => ({ label: op.label, value: op.value }))}
                          />
                          {!noValueNeeded && (
                            <Input
                              placeholder="Type here"
                              value={field.value}
                              onChange={(e) => updateAdvancedField(key, { value: e.target.value })}
                              size="small"
                              style={{ flex: 1, minWidth: 80 }}
                              allowClear
                            />
                          )}
                        </Space.Compact>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={filteredCrews}
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
          <Tabs
            activeKey={formTab}
            onChange={setFormTab}
            items={[
              { key: 'basic', label: 'Basic Info', children: basicInfoTab },
              { key: 'members', label: 'Members', children: membersTab },
              { key: 'skills', label: 'Skills & Equipment', children: skillsTab },
            ]}
          />
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
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setDetailDrawerOpen(false);
                if (detailCrew) openEdit(detailCrew);
              }}
            >
              Edit
            </Button>
          </Space>
        }
      >
        {detailCrew && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card size="small" title={<Space><EnvironmentOutlined />Territories</Space>}>
                        {(detailCrew.territory_ids ?? []).length > 0 ? (
                          <Space wrap size={4}>
                            {getTerritoryNames(detailCrew.territory_ids).map((name, i) => (
                              <Tag key={i} color="gold">{name}</Tag>
                            ))}
                          </Space>
                        ) : (
                          <Text type="secondary">—</Text>
                        )}
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
                            <Text strong>
                              {detailCrew.crew_leader.first_name} {detailCrew.crew_leader.last_name}
                            </Text>
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
                ),
              },
              {
                key: 'members',
                label: (
                  <Space>
                    Members
                    <Badge
                      count={detailCrew.members?.filter((m) => !m.is_deleted).length ?? 0}
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  </Space>
                ),
                children: (
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
                ),
              },
              {
                key: 'skills',
                label: (
                  <Space>
                    Skills
                    <Badge
                      count={detailCrew.skills?.length ?? 0}
                      style={{ backgroundColor: '#722ed1' }}
                    />
                  </Space>
                ),
                children:
                  detailCrew.skills && detailCrew.skills.length > 0 ? (
                    <Space wrap>
                      {detailCrew.skills.map((skill) => (
                        <Tag key={skill.id} icon={<SafetyOutlined />} color="purple">
                          {skill.category?.name ?? skill.category_id}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Empty description="No skills assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ),
              },
              {
                key: 'equipment',
                label: (
                  <Space>
                    Equipment
                    <Badge
                      count={detailCrew.equipment?.length ?? 0}
                      style={{ backgroundColor: '#fa8c16' }}
                    />
                  </Space>
                ),
                children: (
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
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
