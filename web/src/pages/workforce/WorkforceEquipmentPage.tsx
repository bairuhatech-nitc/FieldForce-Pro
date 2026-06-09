import { Card, Empty, Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

export default function WorkforceEquipmentPage() {
  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Track and manage equipment assigned to your workforce, maintenance schedules, and availability."
      />
      <Card style={{ borderRadius: 8 }}>
        <Empty
          image={<ToolOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          imageStyle={{ height: 80 }}
          description={
            <span style={{ color: '#8c8c8c' }}>
              Equipment management is coming soon. You'll be able to assign equipment to team members, track usage, and schedule maintenance.
            </span>
          }
        >
          <Button type="primary" disabled>Coming Soon</Button>
        </Empty>
      </Card>
    </div>
  );
}
