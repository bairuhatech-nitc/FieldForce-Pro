import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Typography, Spin, Result, Button } from 'antd';
import { useVerifyMagicLink } from '@/hooks/use-auth';

const { Title, Text } = Typography;

export default function VerifyMagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const verifyMutation = useVerifyMagicLink();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    verifyMutation.mutate(
      { token, device_type: 'web' },
      {
        onSuccess: () => {
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        },
        onError: () => {
          setStatus('error');
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
      }}
    >
      <Card style={{ width: 420, padding: 24, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <Spin size="large" />
            <Title level={3} style={{ marginTop: 24 }}>Verifying Magic Link</Title>
            <Text type="secondary">Please wait while we log you in...</Text>
          </>
        )}

        {status === 'success' && (
          <Result
            status="success"
            title="Successfully logged in!"
            subTitle="Redirecting you to the dashboard..."
          />
        )}

        {status === 'error' && (
          <Result
            status="error"
            title="Verification Failed"
            subTitle="The magic link is invalid or has expired."
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            ]}
          />
        )}
      </Card>
    </div>
  );
}
