import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { usePartsCatalog, useDeletePartsCatalog } from '@/hooks/use-parts-catalog';
import type { PartsCatalogItem } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatCurrency } from '@/utils/format-currency';
import SearchFilter from '@/components/common/SearchFilter';

export default function PartsCatalogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePartsCatalog({ page, take: pageSize, search });
  const deletePart = useDeletePartsCatalog();

  const parts = data?.data || [];
  const meta = data?.meta;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (part: PartsCatalogItem) => {
    showConfirmDialog({
      title: 'Delete Part',
      content: `Are you sure you want to delete ${part.name}?`,
      onOk: async () => {
        await deletePart.mutateAsync(part.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<PartsCatalogItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => sku || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number | null) =>
        price !== null && price !== undefined ? formatCurrency(price) : <span style={{ opacity: 0.5 }}>-</span>,
      sorter: (a, b) => (a.unit_price || 0) - (b.unit_price || 0),
    },
    {
      title: 'Stock Qty',
      key: 'stock_qty',
      render: (_, record) => {
        const isLowStock = record.stock_qty <= record.reorder_level;
        return (
          <Space>
            <span>{record.stock_qty}</span>
            {isLowStock && <Tag color="red">Low Stock</Tag>}
          </Space>
        );
      },
      sorter: (a, b) => a.stock_qty - b.stock_qty,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (supplier: string) => supplier || <span style={{ opacity: 0.5 }}>-</span>,
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
          <PermissionGuard permission="parts-catalog:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/catalog/parts/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="parts-catalog:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/catalog/parts/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="parts-catalog:delete">
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
        title="Parts Catalog"
        subtitle="Manage your parts inventory"
        extra={
          <PermissionGuard permission="parts-catalog:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalog/parts/new')}>
              Add Part
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search parts by name, SKU, or category"
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={parts}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} parts`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}
