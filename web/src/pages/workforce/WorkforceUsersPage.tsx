import { useState, useMemo } from 'react';
import {
  Button, Space, Tooltip, Progress, Tag, Typography, Alert, Card,
  Row, Col, Input, Select, Checkbox,
} from 'antd';
import {
  PlusOutlined, TeamOutlined, LinkOutlined,
  UserAddOutlined, ReloadOutlined, FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useUsers, useCompanyUsage } from '@/hooks/use-users';
import { useAllRoles } from '@/hooks/use-roles';
import type { User, Role } from '@/types/models.types';
import type { PageOptions } from '@/types/api.types';
import { Order } from '@/types/enums';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { formatDateTime } from '@/utils/format-date';
import { PermissionGuard } from '@/components/permissions';
import RoleAssignmentModal from '@/components/users/RoleAssignmentModal';
import InviteUserModal from '@/components/users/InviteUserModal';
import { useAuthStore } from '@/store/auth.store';
import { useGenerateMagicLink } from '@/hooks/use-magic-links';
import MagicLinkModal from '@/components/magic-links/MagicLinkModal';
import type { InviteResult } from '@/api/users.api';

const { Text } = Typography;
const { Option } = Select;

type FilterOperator = 'contains' | 'doesNotContain' | 'is' | 'isNot';

interface AdvancedFilterField {
  enabled: boolean;
  operator: FilterOperator;
  value: string;
}

type AdvancedFilterKey =
  | 'first_name' | 'last_name' | 'email' | 'employee_id' | 'profile'
  | 'city' | 'country' | 'mobile' | 'phone' | 'state' | 'street' | 'zip_code';

type AdvancedFilters = Record<AdvancedFilterKey, AdvancedFilterField>;

const ADVANCED_FIELDS: { key: AdvancedFilterKey; label: string }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'employee_id', label: 'Employee Id' },
  { key: 'profile', label: 'Profile' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'street', label: 'Street' },
  { key: 'zip_code', label: 'Zip Code' },
];

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'doesNotContain', label: "Doesn't Contain" },
  { value: 'is', label: 'Is' },
  { value: 'isNot', label: "Isn't" },
];

function initAdvancedFilters(): AdvancedFilters {
  return Object.fromEntries(
    ADVANCED_FIELDS.map(({ key }) => [key, { enabled: false, operator: 'contains' as FilterOperator, value: '' }])
  ) as AdvancedFilters;
}

function getUserFieldValue(user: User, key: AdvancedFilterKey): string {
  switch (key) {
    case 'first_name': return user.first_name ?? '';
    case 'last_name': return user.last_name ?? '';
    case 'email': return user.email ?? '';
    case 'phone': return user.phone ?? '';
    case 'mobile': return user.mobile ?? '';
    case 'employee_id': return user.employee_id ?? '';
    case 'city': return user.city ?? '';
    case 'country': return user.country ?? '';
    case 'state': return user.state ?? '';
    case 'street': return user.street ?? '';
    case 'zip_code': return user.zip_code ?? '';
    case 'profile':
      return (user.roles ?? [])
        .filter((r): r is Role => typeof r !== 'string')
        .map((r) => r.name)
        .join(', ');
    default:
      return '';
  }
}

function applyOperator(fieldVal: string, operator: FilterOperator, filterVal: string): boolean {
  const fv = fieldVal.toLowerCase();
  const v = filterVal.toLowerCase();
  switch (operator) {
    case 'contains': return fv.includes(v);
    case 'doesNotContain': return !fv.includes(v);
    case 'is': return fv === v;
    case 'isNot': return fv !== v;
  }
}

export default function WorkforceUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [params, setParams] = useState<PageOptions>({ page: 1, take: 10, order: Order.DESC });
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [simpleFilters, setSimpleFilters] = useState({
    first_name: '', last_name: '', email: '', employee_id: '', profile: '',
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(initAdvancedFilters);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [magicLinkModal, setMagicLinkModal] = useState<{ link: string; expiresAt: string; purpose: string } | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const generateLink = useGenerateMagicLink();
  const { data: allRoles } = useAllRoles();

  const { data, isLoading } = useUsers(params);
  const { data: usage } = useCompanyUsage();

  const isCompanyAdmin =
    !currentUser?.is_super_admin &&
    currentUser?.roles?.some((r) => (typeof r === 'string' ? r : r.name).toLowerCase() === 'admin');

  const filteredUsers = useMemo(() => {
    const users = data?.data ?? [];
    if (isAdvancedMode) {
      return users.filter((user) =>
        ADVANCED_FIELDS.every(({ key }) => {
          const f = advancedFilters[key];
          if (!f.enabled || !f.value.trim()) return true;
          return applyOperator(getUserFieldValue(user, key), f.operator, f.value);
        })
      );
    }
    return users.filter((user) => {
      if (simpleFilters.first_name && !user.first_name.toLowerCase().includes(simpleFilters.first_name.toLowerCase())) return false;
      if (simpleFilters.last_name && !user.last_name.toLowerCase().includes(simpleFilters.last_name.toLowerCase())) return false;
      if (simpleFilters.email && !user.email.toLowerCase().includes(simpleFilters.email.toLowerCase())) return false;
      if (simpleFilters.profile) {
        const userRoles = (user.roles ?? [])
          .filter((r): r is Role => typeof r !== 'string')
          .map((r) => r.name.toLowerCase());
        if (!userRoles.some((r) => r.includes(simpleFilters.profile.toLowerCase()))) return false;
      }
      return true;
    });
  }, [data, simpleFilters, advancedFilters, isAdvancedMode]);

  const handleAssignRoles = (userId: string) => { setSelectedUserId(userId); setRoleModalOpen(true); };
  const handleCloseRoleModal = () => { setRoleModalOpen(false); setSelectedUserId(null); };

  const handleSendMagicLink = (userId: string) => {
    generateLink.mutate(
      { target_user_id: userId, purpose: 'user_access' },
      { onSuccess: (res) => { const d = res.data.data; if (d) setMagicLinkModal({ link: d.link, expiresAt: d.expires_at, purpose: d.purpose }); } },
    );
  };

  const handleResendInvite = (userId: string) => {
    generateLink.mutate(
      { target_user_id: userId, purpose: 'user_onboarding' },
      { onSuccess: (res) => { const d = res.data.data; if (d) setMagicLinkModal({ link: d.link, expiresAt: d.expires_at, purpose: d.purpose }); } },
    );
  };

  const handleInvited = (result: InviteResult) => {
    setMagicLinkModal({ link: result.magic_link, expiresAt: result.expires_at, purpose: 'user_onboarding' });
  };

  const isTargetAdmin = (record: User) =>
    record.roles?.some((r) => (typeof r === 'string' ? r : r.name).toLowerCase() === 'admin');

  const usageCurrent = usage?.usage?.total_users?.current;
  const usageLimit = usage?.usage?.total_users?.limit;
  const usagePct = usageLimit && usageCurrent != null ? Math.round((usageCurrent / usageLimit) * 100) : 0;
  const getProgressColor = (pct: number) => pct > 90 ? '#ff4d4f' : pct > 70 ? '#faad14' : '#52c41a';
  const isLimitReached = !currentUser?.is_super_admin && usageLimit != null && usageCurrent != null && usageCurrent >= usageLimit;

  const updateAdvancedField = (key: AdvancedFilterKey, patch: Partial<AdvancedFilterField>) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const columns: ColumnsType<User> = [
    {
      title: t('users.name'),
      key: 'name',
      render: (_, record) => (
        <span
          style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate(`/users/${record.id}`)}
        >
          {record.first_name} {record.last_name}
        </span>
      ),
      sorter: true,
    },
    { title: t('users.email'), dataIndex: 'email', key: 'email' },
    {
      title: t('users.role'),
      key: 'roles',
      render: (_, record) =>
        (record.roles ?? [])
          .filter((r): r is Role => typeof r !== 'string')
          .map((r) => r.name)
          .join(', ') || '-',
    },
    {
      title: t('users.status'),
      key: 'status',
      render: (_, record) =>
        record.is_active ? <Tag color="success">{t('users.active')}</Tag> : <Tag color="warning">{t('users.pending')}</Tag>,
    },
    {
      title: t('users.lastLogin'),
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <PermissionGuard permission="users:update">
            <Tooltip title={t('users.assignRoles')}>
              <Button type="link" icon={<TeamOutlined />} onClick={() => handleAssignRoles(record.id)} />
            </Tooltip>
          </PermissionGuard>
          {isCompanyAdmin && !record.is_active && (
            <Tooltip title={t('users.resendInvite')}>
              <Button type="link" icon={<ReloadOutlined />} loading={generateLink.isPending} onClick={() => handleResendInvite(record.id)} />
            </Tooltip>
          )}
          {isCompanyAdmin && record.is_active && !isTargetAdmin(record) && (
            <Tooltip title={t('users.sendMagicLink')}>
              <Button type="link" icon={<LinkOutlined />} loading={generateLink.isPending} onClick={() => handleSendMagicLink(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage and filter your workforce users. Configure access levels, assign roles, and streamline field operations."
        extra={
          <Space>
            <PermissionGuard permission="users:create">
              <Tooltip title={isLimitReached ? 'User limit reached. Upgrade your plan to invite more users.' : ''}>
                <Button icon={<UserAddOutlined />} onClick={() => setInviteModalOpen(true)} disabled={isLimitReached}>
                  {t('users.inviteUser')}
                </Button>
              </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="users:create">
              <Tooltip title={isLimitReached ? 'User limit reached. Upgrade your plan to create more users.' : ''}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/users/create')} disabled={isLimitReached}>
                  {t('users.createUser')}
                </Button>
              </Tooltip>
            </PermissionGuard>
          </Space>
        }
      />

      {isLimitReached && (
        <Alert
          message="User Limit Reached"
          description="Your company has reached the maximum number of users allowed by your subscription plan. To add more team members, please upgrade your plan."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {usage && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('users.plan')}: <strong>{usage.plan_name}</strong>
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('users.users')}: <strong>{usageCurrent ?? 0}</strong>
              {usageLimit ? ` / ${usageLimit}` : t('users.unlimited')}
            </Text>
          </Space>
          {usageLimit && (
            <Progress percent={usagePct} strokeColor={getProgressColor(usagePct)} status={usagePct > 90 ? 'exception' : 'normal'} size="small" />
          )}
        </div>
      )}

      {/* Filter Panel */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        {!isAdvancedMode ? (
          /* Simple Filter */
          <div>
            <Row gutter={[12, 8]}>
              <Col xs={24} sm={12} md={5}>
                <Input
                  placeholder="First Name"
                  value={simpleFilters.first_name}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, first_name: e.target.value }))}
                  allowClear
                  size="small"
                  prefix={<FilterOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />}
                />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Input
                  placeholder="Last Name"
                  value={simpleFilters.last_name}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, last_name: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Input
                  placeholder="Email"
                  value={simpleFilters.email}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, email: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Input
                  placeholder="Employee Id"
                  value={simpleFilters.employee_id}
                  onChange={(e) => setSimpleFilters((p) => ({ ...p, employee_id: e.target.value }))}
                  allowClear
                  size="small"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Profile"
                  value={simpleFilters.profile || undefined}
                  onChange={(v) => setSimpleFilters((p) => ({ ...p, profile: v ?? '' }))}
                  allowClear
                  size="small"
                  style={{ width: '100%' }}
                >
                  {(allRoles ?? []).map((role) => (
                    <Option key={role.id} value={role.name}>{role.name}</Option>
                  ))}
                </Select>
              </Col>
            </Row>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, fontSize: 12, color: '#2563eb' }}
                onClick={() => setIsAdvancedMode(true)}
              >
                Switch to Advanced Filter &gt;&gt;
              </Button>
            </div>
          </div>
        ) : (
          /* Advanced Filter */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong style={{ fontSize: 13 }}>Advanced Filter</Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, fontSize: 12 }}
                onClick={() => { setIsAdvancedMode(false); setAdvancedFilters(initAdvancedFilters()); }}
              >
                &lt;&lt; Switch to Simple Filter
              </Button>
            </div>
            <Row gutter={[16, 6]}>
              {ADVANCED_FIELDS.map(({ key, label }) => {
                const field = advancedFilters[key];
                return (
                  <Col xs={24} sm={12} key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
                      <Checkbox
                        checked={field.enabled}
                        onChange={(e) => updateAdvancedField(key, { enabled: e.target.checked, value: '' })}
                        style={{ flexShrink: 0, width: 90 }}
                      >
                        <Text style={{ fontSize: 12 }}>{label}</Text>
                      </Checkbox>
                      {field.enabled && (
                        <Space.Compact size="small" style={{ flex: 1 }}>
                          <Select
                            value={field.operator}
                            onChange={(v) => updateAdvancedField(key, { operator: v })}
                            size="small"
                            style={{ width: 140 }}
                          >
                            {OPERATORS.map((op) => (
                              <Option key={op.value} value={op.value}>{op.label}</Option>
                            ))}
                          </Select>
                          <Input
                            placeholder="Type here"
                            value={field.value}
                            onChange={(e) => updateAdvancedField(key, { value: e.target.value })}
                            size="small"
                            style={{ flex: 1, minWidth: 80 }}
                            allowClear
                          />
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

      <DataTable
        columns={columns}
        dataSource={filteredUsers}
        loading={isLoading}
        total={data?.meta?.itemCount}
        page={params.page}
        pageSize={params.take}
        onPageChange={(page, pageSize) => setParams((prev) => ({ ...prev, page, take: pageSize }))}
        onSearch={(search) => setParams((prev) => ({ ...prev, search, page: 1 }))}
        onSort={(_, order) => setParams((prev) => ({ ...prev, order: order as Order }))}
      />

      <RoleAssignmentModal userId={selectedUserId} open={roleModalOpen} onClose={handleCloseRoleModal} />
      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} onInvited={handleInvited} />

      {magicLinkModal && (
        <MagicLinkModal
          open={!!magicLinkModal}
          onClose={() => setMagicLinkModal(null)}
          link={magicLinkModal.link}
          expiresAt={magicLinkModal.expiresAt}
          purpose={magicLinkModal.purpose}
        />
      )}
    </div>
  );
}
