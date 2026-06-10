import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Switch, Button, Space, Row, Col,
  Divider, Transfer, Tabs, Spin, Typography,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SafetyOutlined, ToolOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { useCrew, useCreateCrew, useUpdateCrew } from '@/hooks/use-crews';
import { useAgents } from '@/hooks/use-users';
import { useSetting } from '@/hooks/use-settings';
import { useAllAssets } from '@/hooks/use-assets';
import { useCategories } from '@/hooks/use-lookups';
import type { CreateCrewPayload } from '@/api/crews.api';

const { Text } = Typography;

interface TerritoryItem { id: string; name: string; }
interface ShiftItem { id: string; name: string; start_time: string; end_time: string; }

type FormValues = {
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

export default function CrewFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [formTab, setFormTab] = useState('basic');
  const [form] = Form.useForm<FormValues>();
  const selectedMemberIds: string[] = Form.useWatch('member_ids', form) ?? [];

  const { data: existing, isLoading } = useCrew(id || '');
  const createMutation = useCreateCrew();
  const updateMutation = useUpdateCrew();

  const { data: agentsData } = useAgents();
  const { data: territoriesSettingData } = useSetting('territories_settings');
  const { data: shiftsSettingData } = useSetting('shifts_settings');
  const { data: allAssets } = useAllAssets();
  const { data: categories } = useCategories();

  const agents = agentsData ?? [];
  const territories: TerritoryItem[] = (territoriesSettingData?.value?.list as TerritoryItem[]) ?? [];
  const shifts: ShiftItem[] = (shiftsSettingData?.value?.list as ShiftItem[]) ?? [];

  // Pre-fill on edit
  const [seeded, setSeeded] = useState(false);
  if (isEdit && existing && !seeded) {
    form.setFieldsValue({
      name: existing.name,
      description: existing.description ?? undefined,
      territory_ids: existing.territory_ids ?? [],
      shift_id: existing.shift_id ?? undefined,
      crew_leader_id: existing.crew_leader_id ?? undefined,
      is_active: existing.is_active,
      member_ids: existing.members?.map((m) => m.technician_id) ?? [],
      skill_ids: existing.skills?.map((s) => s.category_id) ?? [],
      equipment_ids: existing.equipment?.map((e) => e.asset_id) ?? [],
    });
    setSeeded(true);
  }

  const transferDataSource = useMemo(
    () =>
      agents.map((a) => ({
        key: a.id,
        title: `${a.first_name} ${a.last_name}`,
        description: a.email,
      })),
    [agents],
  );

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
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...payload });
        navigate(`/workforce/crew/${id}`);
      } else {
        const res = await createMutation.mutateAsync(payload);
        navigate('/workforce/crew');
      }
    } catch {
      // form validation errors handled by antd
    }
  };

  if (isEdit && isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit Crew: ${existing?.name ?? ''}` : 'New Crew'}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit && id ? `/workforce/crew/${id}` : '/workforce/crew')}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isMutating}
              onClick={handleSubmit}
            >
              {isEdit ? 'Save Changes' : 'Create Crew'}
            </Button>
          </Space>
        }
      />

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true, member_ids: [], skill_ids: [], equipment_ids: [] }}
        >
          <Tabs
            activeKey={formTab}
            onChange={setFormTab}
            items={[
              {
                key: 'basic',
                label: 'Basic Info',
                children: (
                  <>
                    <Form.Item
                      name="name"
                      label="Crew Name"
                      rules={[{ required: true, message: 'Crew name is required' }, { max: 100 }]}
                    >
                      <Input placeholder="e.g. North HVAC Team" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                      <Input.TextArea rows={3} placeholder="Optional description" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="territory_ids" label="Territories">
                          <Select
                            mode="multiple"
                            placeholder="Select territories"
                            allowClear
                            options={territories.map((t) => ({ label: t.name, value: t.id }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
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
                ),
              },
              {
                key: 'members',
                label: 'Members',
                children: (
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
                        listStyle={{ width: '45%', height: 300 }}
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
                    <Form.Item name="member_ids" hidden><input type="hidden" /></Form.Item>

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
                          .map((a) => ({ label: `${a.first_name} ${a.last_name}`, value: a.id }))}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'skills',
                label: 'Skills & Equipment',
                children: (
                  <>
                    <Form.Item
                      name="skill_ids"
                      label={<Space><SafetyOutlined /> Skills / Certifications</Space>}
                      help="Select the skill categories this crew is certified for"
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select skills"
                        allowClear
                        options={(categories ?? []).map((c) => ({ label: c.name, value: c.id }))}
                        notFoundContent={<Text type="secondary">No skills configured. Add categories in Settings.</Text>}
                      />
                    </Form.Item>

                    <Divider />

                    <Form.Item
                      name="equipment_ids"
                      label={<Space><ToolOutlined /> Assigned Equipment / Vehicles</Space>}
                      help="Assign vehicles or tools from the asset registry"
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select equipment"
                        allowClear
                        options={(allAssets ?? []).map((a) => ({
                          label: `${a.name}${a.model ? ` (${a.model})` : ''}`,
                          value: a.id,
                        }))}
                        notFoundContent={<Text type="secondary">No assets available. Add equipment in the Assets module.</Text>}
                      />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </div>
  );
}
