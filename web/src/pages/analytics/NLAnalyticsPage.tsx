import { Typography } from 'antd';
import NLQueryBar from '../../components/analytics/NLQueryBar';

const { Title } = Typography;

export default function NLAnalyticsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>AI-Powered Analytics</Title>
      <NLQueryBar />
    </div>
  );
}
