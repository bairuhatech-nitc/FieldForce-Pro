import { Card, Empty, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

export default function WorkforceAttendancePage() {
  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Monitor check-ins, track daily attendance records, and review workforce presence in real time."
      />
      <Card style={{ borderRadius: 8 }}>
        <Empty
          image={<ClockCircleOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          imageStyle={{ height: 80 }}
          description={
            <span style={{ color: '#8c8c8c' }}>
              Attendance tracking is coming soon. You'll be able to record and review daily attendance, late arrivals, and absences for your field team.
            </span>
          }
        >
          <Button type="primary" disabled>Coming Soon</Button>
        </Empty>
      </Card>
    </div>
  );
}
