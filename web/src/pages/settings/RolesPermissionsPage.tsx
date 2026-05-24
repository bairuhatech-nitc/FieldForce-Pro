import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Checkbox,
  Tooltip,
  Typography,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/hooks/use-roles';
import {
  usePermissions,
  useAllPermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '@/hooks/use-permissions';
import type { Role, Permission } from '@/types/models.types';
import { PermissionAction } from '@/types/enums';
import { formatDateTime } from '@/utils/format-date';

const { Text } = Typography;
const { TextArea } = Input;

const ACTION_OPTIONS = [
  { label: 'Create', value: PermissionAction.CREATE },
  { label: 'Read', value: PermissionAction.READ },
  { label: 'Update', value: PermissionAction.UPDATE },
  { label: 'Delete', value: PermissionAction.DELETE },
  { label: 'Manage', value: PermissionAction.MANAGE },
];

// Module options based on application features — all system modules
const MODULE_OPTIONS = [
  // Core
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Users', value: 'users' },
  { label: 'Roles', value: 'roles' },
  { label: 'Permissions', value: 'permissions' },
  { label: 'Tenants', value: 'tenants' },
  { label: 'Settings', value: 'settings' },
  // Customer
  { label: 'Contacts', value: 'contacts' },
  { label: 'Companies', value: 'companies' },
  { label: 'Service Locations', value: 'service_locations' },
  // Operations
  { label: 'Service Requests', value: 'service_requests' },
  { label: 'Estimates', value: 'estimates' },
  { label: 'Service Appointments', value: 'service_appointments' },
  { label: 'Scheduling', value: 'scheduling' },
  // Job Management
  { label: 'Job Sheets', value: 'job_sheets' },
  { label: 'Timesheets', value: 'timesheets' },
  { label: 'Trips', value: 'trips' },
  { label: 'Agent Locations', value: 'agent_locations' },
  // Financial
  { label: 'Invoices', value: 'invoices' },
  { label: 'Payments', value: 'payments' },
  { label: 'Payment Gateways', value: 'payment_gateways' },
  { label: 'Service Agreements', value: 'service_agreements' },
  { label: 'Pricebook', value: 'pricebook' },
  // Catalog
  { label: 'Services Catalog', value: 'services_catalog' },
  { label: 'Parts Catalog', value: 'parts_catalog' },
  { label: 'Maintenance Plans', value: 'asset_maintenance_plans' },
  { label: 'Assets', value: 'assets' },
  // Communication
  { label: 'Notifications', value: 'notifications' },
  { label: 'Communications', value: 'communications' },
  { label: 'Webforms', value: 'webforms' },
  { label: 'Reviews', value: 'reviews' },
  // Automation
  { label: 'Blueprints', value: 'blueprint_definitions' },
  { label: 'Blueprint States', value: 'blueprint_states' },
  { label: 'Blueprint Transitions', value: 'blueprint_transitions' },
  { label: 'Custom Fields', value: 'custom_fields' },
  { label: 'Templates', value: 'templates' },
  { label: 'Workflow Rules', value: 'workflow_rules' },
  { label: 'Webhooks', value: 'webhooks' },
  // Reports
  { label: 'Reports', value: 'reports' },
  { label: 'Dashboards', value: 'dashboards' },
  { label: 'Audit Logs', value: 'audit_logs' },
  { label: 'Workforce', value: 'workforce' },
  // AI
  { label: 'Chatbot', value: 'chatbot' },
  { label: 'Documents', value: 'documents' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'Vision', value: 'vision' },
  { label: 'Voice', value: 'voice' },
  { label: 'IoT Data', value: 'iot_data' },
  { label: 'Scheduling AI', value: 'scheduling_ai' },
  // Portal
  { label: 'Portal', value: 'portal' },
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;

interface PermissionsMatrixProps {
  value?: string[];
  onChange?: (ids: string[]) => void;
  allPermissions: Permission[];
  moduleOptions: { label: string; value: string }[];
}

function PermissionsMatrix({ value = [], onChange, allPermissions, moduleOptions }: PermissionsMatrixProps) {
  const [search, setSearch] = useState('');

  // Group permissions by module, deduplicated by action
  const grouped = useMemo(() => {
    const result: Record<string, Record<string, string>> = {};
    for (const p of allPermissions) {
      if (!result[p.module]) result[p.module] = {};
      if (!result[p.module][p.action]) result[p.module][p.action] = p.id;
    }
    return result;
  }, [allPermissions]);

  const selectedSet = new Set(value);

  const filteredModules = Object.keys(grouped).filter((m) =>
    (moduleOptions.find((o) => o.value === m)?.label || m)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange?.(Array.from(next));
  };

  const toggleModule = (module: string, checked: boolean) => {
    const next = new Set(selectedSet);
    for (const id of Object.values(grouped[module])) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onChange?.(Array.from(next));
  };

  const toggleAll = (checked: boolean) => {
    onChange?.(checked ? allPermissions.map((p) => p.id) : []);
  };

  const isModuleAllChecked = (module: string) =>
    Object.values(grouped[module]).every((id) => selectedSet.has(id));

  const isModulePartial = (module: string) =>
    Object.values(grouped[module]).some((id) => selectedSet.has(id)) &&
    !isModuleAllChecked(module);

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
        <Input
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 200 }}
          size="small"
        />
        <Space size={6}>
          <span style={{ fontSize: 12, opacity: 0.5 }}>{value.length} selected</span>
          <Button size="small" onClick={() => toggleAll(true)}>Select All</Button>
          <Button size="small" onClick={() => toggleAll(false)}>Clear All</Button>
        </Space>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(5, 1fr)', padding: '8px 14px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Module</span>
        {ACTIONS.map((a) => (
          <span key={a} style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', textTransform: 'capitalize' }}>{a}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {filteredModules.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>No modules found</div>
        )}
        {filteredModules.map((module, idx) => {
          const moduleLabel = moduleOptions.find((o) => o.value === module)?.label || module;
          const allChecked = isModuleAllChecked(module);
          const partial = isModulePartial(module);
          return (
            <div
              key={module}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px repeat(5, 1fr)',
                padding: '9px 14px',
                borderBottom: idx < filteredModules.length - 1 ? '1px solid var(--border-color)' : 'none',
                alignItems: 'center',
                background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={partial}
                  onChange={(e) => toggleModule(module, e.target.checked)}
                />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{moduleLabel}</span>
              </div>
              {ACTIONS.map((action) => {
                const permId = grouped[module][action];
                return (
                  <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                    {permId ? (
                      <Checkbox
                        checked={selectedSet.has(permId)}
                        onChange={() => toggle(permId)}
                      />
                    ) : (
                      <span style={{ opacity: 0.3, fontSize: 16 }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RolesPermissionsPage() {
  const { t } = useTranslation();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [roleForm] = Form.useForm();
  const [permissionForm] = Form.useForm();

  // Pagination state for roles
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPageSize, setRolesPageSize] = useState(10);

  // Pagination state for permissions
  const [permissionsPage, setPermissionsPage] = useState(1);
  const [permissionsPageSize, setPermissionsPageSize] = useState(10);

  const { data: rolesData, isLoading: rolesLoading } = useRoles({
    page: rolesPage,
    take: rolesPageSize,
  });
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions({
    page: permissionsPage,
    take: permissionsPageSize,
  });

  const roles = rolesData?.data || [];
  // Deduplicate permissions by name in case the DB has duplicates from multiple seeds
  const rawPermissions = permissionsData?.data || [];
  const permissions = rawPermissions.filter(
    (p, idx, self) => idx === self.findIndex((q) => q.name === p.name),
  );
  const rolesMeta = rolesData?.meta;
  const permissionsMeta = permissionsData?.meta;

  // Fetch all permissions for the matrix (non-paginated)
  const { data: allPermissionsRaw } = useAllPermissions();
  // Deduplicate by name in case the DB has duplicates from multiple seeds
  const allPermissions = (allPermissionsRaw || []).filter(
    (p, idx, self) => idx === self.findIndex((q) => q.name === p.name),
  );

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();
  // Role handlers
  const handleCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    const permissionIds = role.permissions?.map((p) => p.id) || [];
    roleForm.setFieldsValue({
      name: role.name,
      description: role.description,
      permission_ids: permissionIds,
    });
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (values: {
    name: string;
    description: string;
    permission_ids: string[];
  }) => {
    const assignedPermissions = values.permission_ids || [];

    if (editingRole) {
      // For system roles, only update permissions (not name or description)
      if (editingRole.is_system) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          permission_ids: assignedPermissions,
        });
      } else {
        // For non-system roles, update everything
        await updateRole.mutateAsync({
          id: editingRole.id,
          name: values.name,
          description: values.description,
          permission_ids: assignedPermissions,
        });
      }
    } else {
      await createRole.mutateAsync({
        name: values.name,
        description: values.description,
        permission_ids: assignedPermissions,
      });
    }
    setIsRoleModalOpen(false);
    roleForm.resetFields();
  };

  const handleDeleteRole = (role: Role) => {
    showConfirmDialog({
      title: 'Delete Role',
      content: `Are you sure you want to delete the role "${role.name}"?`,
      onOk: async () => {
        await deleteRole.mutateAsync(role.id);
      },
      danger: true,
    });
  };

  // Permission handlers
  const handleCreatePermission = () => {
    setEditingPermission(null);
    permissionForm.resetFields();
    setIsPermissionModalOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    permissionForm.setFieldsValue({
      module: permission.module,
      action: [permission.action], // Wrap in array for multi-select
      name: permission.name,
      description: permission.description,
    });
    setIsPermissionModalOpen(true);
  };

  const handlePermissionSubmit = async (values: {
    module: string;
    action: string[];
    name: string;
    description: string;
  }) => {
    // Normalize module: lowercase, replace hyphens with underscores
    const moduleNormalized = values.module.toLowerCase().replace(/-/g, '_');

    if (editingPermission) {
      // When editing, only allow single action
      const nameNormalized = values.name.toLowerCase().replace(/-/g, '_');
      await updatePermission.mutateAsync({
        id: editingPermission.id,
        module: moduleNormalized,
        action: values.action[0] as PermissionAction,
        name: nameNormalized,
        description: values.description,
      });
    } else {
      // When creating, allow multiple actions - create one permission per action
      const actions = values.action;
      for (const action of actions) {
        const permissionName = `${moduleNormalized}:${action}`;
        await createPermission.mutateAsync({
          module: moduleNormalized,
          action: action as PermissionAction,
          name: permissionName,
          description: values.description || `Allows ${action} on ${moduleNormalized}`,
        });
      }
    }
    setIsPermissionModalOpen(false);
    permissionForm.resetFields();
  };

  const handleDeletePermission = (permission: Permission) => {
    showConfirmDialog({
      title: 'Delete Permission',
      content: `Are you sure you want to delete the permission "${permission.name}"?`,
      onOk: async () => {
        await deletePermission.mutateAsync(permission.id);
      },
      danger: true,
    });
  };

  // Columns
  const roleColumns: ColumnsType<Role> = [
    { title: 'Role Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'System Role',
      dataIndex: 'is_system',
      key: 'is_system',
      render: (val: boolean) => (val ? <Tag color="blue">System</Tag> : <Tag>Custom</Tag>),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: unknown, record: Role) => (
        <Space>
          <KeyOutlined />
          <Text type="secondary">{record.permissions?.length || 0} permissions</Text>
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Role) => (
        <Space size="small">
          <PermissionGuard permission="roles:update">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditRole(record)}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="roles:delete">
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDeleteRole(record)}
                disabled={record.is_system}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const permissionColumns: ColumnsType<Permission> = [
    { title: 'Module', dataIndex: 'module', key: 'module' },
    { title: 'Action', dataIndex: 'action', key: 'action' },
    {
      title: 'Permission Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Tag color="green">{name}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Permission) => (
        <Space size="small">
          <PermissionGuard permission="permissions:update">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditPermission(record)}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="permissions:delete">
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDeletePermission(record)}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  // Tabs
  const items = [
    {
      key: 'roles',
      label: 'Roles',
      children: (
        <Card
          extra={
            <PermissionGuard permission="roles:create">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRole}>
                Create Role
              </Button>
            </PermissionGuard>
          }
        >
          <Table
            columns={roleColumns}
            dataSource={roles}
            rowKey="id"
            loading={rolesLoading}
            pagination={{
              current: rolesPage,
              pageSize: rolesPageSize,
              total: rolesMeta?.itemCount || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} roles`,
              onChange: (page, pageSize) => {
                setRolesPage(page);
                setRolesPageSize(pageSize);
              },
            }}
          />
        </Card>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: (
        <Card
          extra={
            <PermissionGuard permission="permissions:create">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreatePermission}
              >
                Create Permission
              </Button>
            </PermissionGuard>
          }
        >
          <Table
            columns={permissionColumns}
            dataSource={permissions}
            rowKey="id"
            loading={permissionsLoading}
            pagination={{
              current: permissionsPage,
              pageSize: permissionsPageSize,
              total: permissionsMeta?.itemCount || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} permissions`,
              onChange: (page, pageSize) => {
                setPermissionsPage(page);
                setPermissionsPageSize(pageSize);
              },
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('settings.rolesPermissions')}
        subtitle="Manage roles and their permissions"
      />

      <Tabs items={items} defaultActiveKey="roles" />

      {/* Role Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={isRoleModalOpen}
        onCancel={() => {
          setIsRoleModalOpen(false);
          roleForm.resetFields();
        }}
        onOk={() => roleForm.submit()}
        confirmLoading={createRole.isPending || updateRole.isPending}
        width={780}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleRoleSubmit}>
          {editingRole?.is_system && (
            <Text type="warning" style={{ display: 'block', marginBottom: 16 }}>
              This is a system role. You can only modify its permissions.
            </Text>
          )}
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input
              placeholder="e.g., Admin, Manager, Field Technician"
              disabled={editingRole?.is_system}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea
              rows={3}
              placeholder="Describe what this role can do"
              disabled={editingRole?.is_system}
            />
          </Form.Item>

          <Form.Item name="permission_ids" label="Permissions">
            <PermissionsMatrix allPermissions={allPermissions} moduleOptions={MODULE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Permission Modal */}
      <Modal
        title={editingPermission ? 'Edit Permission' : 'Create Permission'}
        open={isPermissionModalOpen}
        onCancel={() => {
          setIsPermissionModalOpen(false);
          permissionForm.resetFields();
        }}
        onOk={() => permissionForm.submit()}
        confirmLoading={createPermission.isPending || updatePermission.isPending}
      >
        <Form form={permissionForm} layout="vertical" onFinish={handlePermissionSubmit}>
          <Form.Item
            name="module"
            label="Module"
            rules={[{ required: true, message: 'Please select module' }]}
          >
            <Select
              placeholder="Select module"
              showSearch
              optionFilterProp="label"
              options={MODULE_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="action"
            label="Action"
            rules={[{ required: true, message: 'Please select at least one action' }]}
          >
            <Select
              mode={editingPermission ? undefined : 'multiple'}
              placeholder={
                editingPermission
                  ? 'Select action'
                  : 'Select actions (multiple allowed)'
              }
              options={ACTION_OPTIONS}
              maxTagCount="responsive"
            />
          </Form.Item>

          {editingPermission && (
            <Form.Item
              name="name"
              label="Permission Name"
              rules={[{ required: true, message: 'Please enter permission name' }]}
            >
              <Input placeholder="e.g., users:create, roles:read" />
            </Form.Item>
          )}

          {!editingPermission && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Permission names will be auto-generated as: module:action (e.g., users:create,
              users:read)
            </Text>
          )}

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Describe what this permission allows" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
