import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Tooltip, Select, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { usePricebookItems, useDeletePricebookItem, useUpdatePricebookItem } from '@/hooks/use-pricebook';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import SearchFilter from '@/components/common/SearchFilter';

interface PricebookRecord {
  id: string;
  name: string;
  service_id: string;
  tier: string;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TIER_COLORS: Record<string, string> = {
  good: 'blue',
  better: 'cyan',
  best: 'gold',
};

export default function PricebookListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = usePricebookItems({ page, take: pageSize, search } as Record<string, unknown> & { page: number; take: number });
  const deletePricebookItem = useDeletePricebookItem();
  const updatePricebookItem = useUpdatePricebookItem();

  const pricebookItems = ((data?.data || []) as PricebookRecord[]).filter((item) => {
    if (tierFilter && item.tier !== tierFilter) return false;
    return true;
  });
  const meta = data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (record: PricebookRecord) => {
    showConfirmDialog({
      title: 'Delete Pricebook Item',
      content: `Are you sure you want to delete "${record.name}"?`,
      onOk: async () => {
        await deletePricebookItem.mutateAsync(record.id);
      },
      danger: true,
    });
  };

  const handleToggleActive = async (record: PricebookRecord, checked: boolean) => {
    await updatePricebookItem.mutateAsync({ id: record.id, is_active: checked });
  };

  const columns: ColumnsType<PricebookRecord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      key: 'tier',
      render: (tier: string) => (
        <Tag color={TIER_COLORS[tier] || 'default'}>
          {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '-'}
        </Tag>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {desc || <span style={{ opacity: 0.5 }}>-</span>}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="pricebook:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/pricebook/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="pricebook:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/pricebook/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="pricebook:delete">
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
        title="Pricebook"
        subtitle="Manage tiered pricing for services (Good/Better/Best)"
        extra={
          <PermissionGuard permission="pricebook:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pricebook/new')}>
              Add Pricebook Item
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <SearchFilter
          placeholder="Search pricebook items..."
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
        <Select
          placeholder="Filter by tier"
          allowClear
          value={tierFilter}
          onChange={(value) => { setTierFilter(value); setPage(1); }}
          style={{ width: 200 }}
          options={[
            { value: 'good', label: 'Good' },
            { value: 'better', label: 'Better' },
            { value: 'best', label: 'Best' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={pricebookItems}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              setPage(1);
            }
          },
        }}
      />
    </div>
  );
}
