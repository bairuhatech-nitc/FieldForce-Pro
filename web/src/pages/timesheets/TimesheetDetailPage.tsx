import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Skeleton, Tag } from 'antd';
import { DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useTimesheet, useDeleteTimesheet, useApproveTimesheet, useRejectTimesheet } from '@/hooks/use-timesheets';
import PageHeader from '@/components/common/PageHeader';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGuard } from '@/components/permissions';
import { formatDateTime } from '@/utils/format-date';

const statusColors: Record<string, string> = {
  pending: 'blue',
  approved: 'green',
  rejected: 'red',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: timesheet, isLoading } = useTimesheet(id!);
  const deleteTimesheet = useDeleteTimesheet();
  const approveTimesheet = useApproveTimesheet();
  const rejectTimesheet = useRejectTimesheet();

  const handleDelete = () => {
    if (!timesheet) return;
    showConfirmDialog({
      title: 'Delete Timesheet',
      content: 'Are you sure you want to delete this timesheet entry?',
      onOk: async () => {
        await deleteTimesheet.mutateAsync(timesheet.id);
        navigate('/timesheets');
      },
      danger: true,
    });
  };

  const handleApprove = () => {
    if (!timesheet) return;
    showConfirmDialog({
      title: 'Approve Timesheet',
      content: 'Are you sure you want to approve this timesheet?',
      onOk: async () => {
        await approveTimesheet.mutateAsync(timesheet.id);
      },
    });
  };

  const handleReject = () => {
    if (!timesheet) return;
    showConfirmDialog({
      title: 'Reject Timesheet',
      content: 'Are you sure you want to reject this timesheet?',
      onOk: async () => {
        await rejectTimesheet.mutateAsync(timesheet.id);
      },
      danger: true,
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Timesheet Details" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div>
        <PageHeader title="Timesheet Not Found" />
        <Card>Timesheet not found</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Timesheet Details"
        onBack={() => navigate('/timesheets')}
        extra={
          <Space>
            {timesheet.status === 'pending' && (
              <>
                <PermissionGuard permission="timesheets:update">
                  <Button
                    icon={<CheckOutlined />}
                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                    loading={approveTimesheet.isPending}
                    onClick={handleApprove}
                  >
                    Approve
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="timesheets:update">
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={rejectTimesheet.isPending}
                    onClick={handleReject}
                  >
                    Reject
                  </Button>
                </PermissionGuard>
              </>
            )}
            <PermissionGuard permission="timesheets:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Delete
              </Button>
            </PermissionGuard>
          </Space>
        }
      />

      <Card title="Timesheet Information">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="User">
            {timesheet.user
              ? `${timesheet.user.first_name} ${timesheet.user.last_name}`
              : timesheet.user_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag color={statusColors[timesheet.status] || 'default'}>
              {formatStatus(timesheet.status)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Clock In">
            {timesheet.clock_in ? formatDateTime(timesheet.clock_in) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Clock Out">
            {timesheet.clock_out ? formatDateTime(timesheet.clock_out) : <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Travel Time">
            {timesheet.travel_time_minutes || 0} minutes
          </Descriptions.Item>

          <Descriptions.Item label="Work Time">
            {timesheet.work_time_minutes || 0} minutes
          </Descriptions.Item>

          <Descriptions.Item label="Break Time">
            {timesheet.break_time_minutes || 0} minutes
          </Descriptions.Item>

          <Descriptions.Item label="Billable">
            {timesheet.is_billable ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>}
          </Descriptions.Item>

          <Descriptions.Item label="Appointment ID">
            {timesheet.appointment_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Work Order ID">
            {timesheet.work_order_id || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Approved By">
            {timesheet.approved_by || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Notes" span={2}>
            {timesheet.notes || <span style={{ opacity: 0.5 }}>-</span>}
          </Descriptions.Item>

          <Descriptions.Item label="Created At">
            {formatDateTime(timesheet.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {formatDateTime(timesheet.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
