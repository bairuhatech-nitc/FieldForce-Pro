import { useState } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useUsers } from '@/hooks/use-users';
import type { User, Role } from '@/types/models.types';
import type { PageOptions } from '@/types/api.types';
import { Order } from '@/types/enums';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime } from '@/utils/format-date';
import { PermissionGuard } from '@/components/permissions';
import RoleAssignmentModal from '@/components/users/RoleAssignmentModal';

export default function UserListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useState<PageOptions>({
    page: 1,
    take: 10,
    order: Order.DESC,
  });
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading } = useUsers(params);

  const handleAssignRoles = (userId: string) => {
    setSelectedUserId(userId);
    setRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedUserId(null);
  };

  const columns: ColumnsType<User> = [
    {
      title: t('users.name'),
      key: 'name',
      render: (_, record) => `${record.first_name} ${record.last_name}`,
      sorter: true,
    },
    {
      title: t('users.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('users.role'),
      key: 'roles',
      render: (_, record) =>
        record.roles
          ?.filter((r): r is Role => typeof r !== 'string')
          .map((r) => r.name)
          .join(', ') || '-',
    },
    {
      title: t('users.status'),
      key: 'status',
      render: (_, record) => (
        <StatusBadge status={record.is_active ? 'active' : 'inactive'} />
      ),
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
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/users/${record.id}`)}
            />
          </Tooltip>
          <PermissionGuard permission="users:update">
            <Tooltip title="Assign Roles">
              <Button
                type="link"
                icon={<TeamOutlined />}
                onClick={() => handleAssignRoles(record.id)}
              />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        extra={
          <PermissionGuard permission="users:create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/users/create')}
            >
              {t('users.createUser')}
            </Button>
          </PermissionGuard>
        }
      />
      <DataTable
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        total={data?.meta?.itemCount}
        page={params.page}
        pageSize={params.take}
        onPageChange={(page, pageSize) =>
          setParams((prev) => ({ ...prev, page, take: pageSize }))
        }
        onSearch={(search) => setParams((prev) => ({ ...prev, search, page: 1 }))}
        onSort={(_, order) =>
          setParams((prev) => ({ ...prev, order: order as Order }))
        }
      />

      <RoleAssignmentModal
        userId={selectedUserId}
        open={roleModalOpen}
        onClose={handleCloseRoleModal}
      />
    </div>
  );
}
