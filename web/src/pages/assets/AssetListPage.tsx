import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAssets, useDeleteAsset } from '@/hooks/use-assets';
import type { Asset } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import SearchFilter from '@/components/common/SearchFilter';

function getWarrantyStatus(warrantyExpiry: string | null): { color: string; text: string } {
  if (!warrantyExpiry) return { color: 'default', text: 'N/A' };
  const expiry = new Date(warrantyExpiry);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) return { color: 'red', text: 'Expired' };
  if (daysUntilExpiry < 30) return { color: 'orange', text: 'Expiring Soon' };
  return { color: 'green', text: 'Active' };
}

export default function AssetListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAssets({ page, take: pageSize, search });
  const deleteAsset = useDeleteAsset();

  const assets = data?.data || [];
  const meta = data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (asset: Asset) => {
    showConfirmDialog({
      title: 'Delete Asset',
      content: `Are you sure you want to delete ${asset.name}?`,
      onOk: async () => {
        await deleteAsset.mutateAsync(asset.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<Asset> = [
    {
      title: 'Asset Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Serial Number',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (sn: string) => sn || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      render: (m: string) => m || <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : <span style={{ opacity: 0.5 }}>-</span>,
    },
    {
      title: 'Health',
      dataIndex: 'health_score',
      key: 'health_score',
      render: (score: number | null) => {
        if (score === null || score === undefined) return <span style={{ opacity: 0.5 }}>-</span>;
        const color = score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red';
        return <Tag color={color}>{score}%</Tag>;
      },
      sorter: (a, b) => (a.health_score || 0) - (b.health_score || 0),
    },
    {
      title: 'Warranty',
      dataIndex: 'warranty_expiry',
      key: 'warranty_expiry',
      render: (date: string | null) => {
        const status = getWarrantyStatus(date);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Customer',
      key: 'contact',
      render: (_, record) =>
        record.contact
          ? `${record.contact.first_name} ${record.contact.last_name}`
          : <span style={{ opacity: 0.5 }}>-</span>,
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
          <PermissionGuard permission="assets:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/assets/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="assets:update">
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/assets/${record.id}/edit`)} />
            </Tooltip>
          </PermissionGuard>
          <PermissionGuard permission="assets:delete">
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
        title={t('nav.assets')}
        subtitle="Manage customer assets and equipment"
        extra={
          <PermissionGuard permission="assets:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/assets/new')}>
              Add Asset
            </Button>
          </PermissionGuard>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchFilter
          placeholder="Search assets by name, serial number, manufacturer, or category"
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 500 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} assets`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}
