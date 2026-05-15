import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tooltip, Tag, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTimesheets, useDeleteTimesheet, useApproveTimesheet, useRejectTimesheet } from '@/hooks/use-timesheets';
import type { Timesheet } from '@/types/models.types';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';
import SearchFilter from '@/components/common/SearchFilter';

const statusColors: Record<string, string> = {
  pending: 'blue',
  approved: 'green',
  rejected: 'red',
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function TimesheetListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useTimesheets({ page, take: pageSize, search });
  const deleteTimesheet = useDeleteTimesheet();
  const approveTimesheet = useApproveTimesheet();
  const rejectTimesheet = useRejectTimesheet();

  const timesheets = data?.data || [];
  const meta = data?.meta;

  const filteredTimesheets = timesheets.filter((ts) => {
    if (statusFilter && ts.status !== statusFilter) return false;
    return true;
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (timesheet: Timesheet) => {
    showConfirmDialog({
      title: 'Delete Timesheet',
      content: 'Are you sure you want to delete this timesheet entry?',
      onOk: async () => {
        await deleteTimesheet.mutateAsync(timesheet.id);
      },
      danger: true,
    });
  };

  const handleApprove = (timesheet: Timesheet) => {
    showConfirmDialog({
      title: 'Approve Timesheet',
      content: 'Are you sure you want to approve this timesheet?',
      onOk: async () => {
        await approveTimesheet.mutateAsync(timesheet.id);
      },
    });
  };

  const handleReject = (timesheet: Timesheet) => {
    showConfirmDialog({
      title: 'Reject Timesheet',
      content: 'Are you sure you want to reject this timesheet?',
      onOk: async () => {
        await rejectTimesheet.mutateAsync(timesheet.id);
      },
      danger: true,
    });
  };

  const columns: ColumnsType<Timesheet> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) =>
        record.user
          ? `${record.user.first_name} ${record.user.last_name}`
          : <span style={{ color: '#999' }}>{record.user_id || '-'}</span>,
    },
    {
      title: 'Clock In',
      dataIndex: 'clock_in',
      key: 'clock_in',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ color: '#999' }}>-</span>,
      sorter: (a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime(),
    },
    {
      title: 'Clock Out',
      dataIndex: 'clock_out',
      key: 'clock_out',
      render: (date: string) => date ? formatDateTime(date) : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Travel (min)',
      dataIndex: 'travel_time_minutes',
      key: 'travel_time_minutes',
      render: (minutes: number) => minutes || 0,
    },
    {
      title: 'Work (min)',
      dataIndex: 'work_time_minutes',
      key: 'work_time_minutes',
      render: (minutes: number) => minutes || 0,
    },
    {
      title: 'Break (min)',
      dataIndex: 'break_time_minutes',
      key: 'break_time_minutes',
      render: (minutes: number) => minutes || 0,
    },
    {
      title: 'Billable',
      dataIndex: 'is_billable',
      key: 'is_billable',
      render: (billable: boolean) =>
        billable ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {formatStatus(status)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <PermissionGuard permission="timesheets:read">
            <Tooltip title="View">
              <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/timesheets/${record.id}`)} />
            </Tooltip>
          </PermissionGuard>
          {record.status === 'pending' && (
            <>
              <PermissionGuard permission="timesheets:update">
                <Tooltip title="Approve">
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    size="small"
                    style={{ color: '#52c41a' }}
                    loading={approveTimesheet.isPending}
                    onClick={() => handleApprove(record)}
                  />
                </Tooltip>
              </PermissionGuard>
              <PermissionGuard permission="timesheets:update">
                <Tooltip title="Reject">
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    size="small"
                    loading={rejectTimesheet.isPending}
                    onClick={() => handleReject(record)}
                  />
                </Tooltip>
              </PermissionGuard>
            </>
          )}
          <PermissionGuard permission="timesheets:delete">
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
        title="Timesheets"
        subtitle="Manage timesheet entries"
      />

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <SearchFilter
          placeholder="Search timesheets..."
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 400 }}
        />
        <Select
          placeholder="Filter by status"
          allowClear
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={statusOptions}
          style={{ width: 180 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredTimesheets}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize,
          total: meta?.itemCount || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} timesheets`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
      />
    </div>
  );
}
