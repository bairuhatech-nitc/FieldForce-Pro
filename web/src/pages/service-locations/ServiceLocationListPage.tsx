import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import SearchFilter from '@/components/common/SearchFilter';
import { useServiceLocations, useDeleteServiceLocation } from '@/hooks/use-service-locations';
import type { ServiceLocation } from '@/types/models.types';

export default function ServiceLocationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useServiceLocations({
    page,
    take: pageSize,
    search,
  });

  const deleteServiceLocation = useDeleteServiceLocation();

  const locations = data?.data || [];
  const meta = data?.meta;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (location: ServiceLocation) => {
    showConfirmDialog({
      title: 'Delete Service Location',
      content: `Are you sure you want to delete this location at ${location.address}?`,
      onOk: async () => {
        await deleteServiceLocation.mutateAsync(location.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<ServiceLocation> = [
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#5B8FF9' }} />
          <span style={{ fontWeight: 500 }}>{address}</span>
        </Space>
      ),
    },
    {
      title: 'Access Notes',
      dataIndex: 'access_notes',
      key: 'access_notes',
      render: (notes: string | null) => notes || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Gate Code',
      dataIndex: 'gate_code',
      key: 'gate_code',
      render: (code: string | null) => code ? (
        <Badge count={code} style={{ backgroundColor: '#52c41a' }} />
      ) : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Coordinates',
      key: 'coordinates',
      render: (_, record) => {
        if (record.lat && record.lng) {
          return (
            <Tooltip title="Click to view on map">
              <a onClick={(e) => {
                e.preventDefault();
                window.open(`https://maps.google.com/?q=${record.lat},${record.lng}`, '_blank');
              }}>
                {Number(record.lat).toFixed(6)}, {Number(record.lng).toFixed(6)}
              </a>
            </Tooltip>
          );
        }
        return <span style={{ color: '#999' }}>Not set</span>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDateTime(date),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="service_locations:read">
            <Tooltip title="View">
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => navigate(`/service-locations/${record.id}`)}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="service_locations:update">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => navigate(`/service-locations/${record.id}/edit`)}
              />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="service_locations:delete">
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDelete(record)}
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
        title={t('nav.serviceLocations')}
        subtitle="Manage service locations"
        extra={
          <PermissionGuard permission="service_locations:create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/service-locations/new')}
            >
              Add Service Location
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search service locations by name, address, or city"
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={locations}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} service locations`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}