import { Card, Button, Result } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';

export default function CustomReportBuilderPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Custom Report Builder"
        subtitle="Build custom reports with your own fields and filters"
        onBack={() => navigate('/reports')}
      />

      <Card>
        <Result
          icon={<ToolOutlined style={{ color: '#722ed1' }} />}
          title="Coming Soon"
          subTitle="The custom report builder is currently under development. Use the pre-built reports for now."
          extra={
            <Button type="primary" onClick={() => navigate('/reports')}>
              View Reports
            </Button>
          }
        />
      </Card>
    </div>
  );
}
