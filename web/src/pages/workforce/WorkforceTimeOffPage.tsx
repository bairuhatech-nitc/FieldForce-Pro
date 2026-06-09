import { Card, Empty, Button } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

export default function WorkforceTimeOffPage() {
  return (
    <div>
      <PageHeader
        title="Time Off"
        subtitle="Manage leave requests, approve time-off submissions, and maintain scheduling coverage."
      />
      <Card style={{ borderRadius: 8 }}>
        <Empty
          image={<CalendarOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          imageStyle={{ height: 80 }}
          description={
            <span style={{ color: '#8c8c8c' }}>
              Time off management is coming soon. You'll be able to handle leave requests, approve absences, and keep dispatch calendars updated automatically.
            </span>
          }
        >
          <Button type="primary" disabled>Coming Soon</Button>
        </Empty>
      </Card>
    </div>
  );
}
