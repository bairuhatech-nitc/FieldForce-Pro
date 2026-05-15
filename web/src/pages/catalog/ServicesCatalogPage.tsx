import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useServicesCatalog, useDeleteServiceCatalog } from '@/hooks/use-services-catalog';
import type { ServiceCatalogItem } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatCurrency } from '@/utils/format-currency';
import SearchFilter from '@/components/common/SearchFilter';

export default function ServicesCatalogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useServicesCatalog({ page, take: pageSize, search });
  const deleteService = useDeleteServiceCatalog();

  const services = data?.data || [];
  const meta = data?.meta;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (service: ServiceCatalogItem) => {
    showConfirmDialog({
      title: 'Delete Service',
      content: `Are you sure you want to delete ${service.name}?`,
      onOk: async () => {
        await deleteService.mutateAsync(service.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<ServiceCatalogItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Price',
      dataIndex: 'default_price',
      key: 'default_price',
      render: (price: number | null) =>
        price !== null && price !== undefined ? formatCurrency(price) : <span style={{ color: '#999' }}>-</span>,
      sorter: (a, b) => (a.default_price || 0) - (b.default_price || 0),
    },
    {
      title: 'Duration (min)',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
      render: (duration: number | null) =>
        duration !== null && duration !== undefined ? `${duration} min` : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Tax Rate',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      render: (rate: number | null) =>
        rate !== null && rate !== undefined ? `${rate}%` : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) =>
        active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="services-catalog:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/catalog/services/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="services-catalog:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/catalog/services/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="services-catalog:delete">
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)} />
            </Tooltip>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Services Catalog"
        subtitle="Manage your service offerings"
        extra={
          <PermissionGuard permission="services-catalog:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalog/services/new')}>
              Add Service
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search services by name or category"
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={services}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} services`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}
