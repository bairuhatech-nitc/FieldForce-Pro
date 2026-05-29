import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Result, Spin, Typography, Button, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { magicLinksApi } from '@/api/magic-links.api';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/models.types';

const { Text } = Typography;

type VerifyState = 'loading' | 'success' | 'error';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || 'An unexpected error occurred. Please try again.';
}

export default function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setErrorMsg('No token found in this link. Please check the URL and try again.');
      return;
    }

    let cancelled = false;

    magicLinksApi
      .verify(token)
      .then((res) => {
        if (cancelled) return;
        const { user, purpose } = res.data.data ?? {};
        if (!user) {
          setState('error');
          setErrorMsg('Verification failed. Please request a new link.');
          return;
        }

        const typedUser = user as unknown as User;
        login(typedUser);
        setState('success');

        setTimeout(() => {
          if (purpose === 'admin_onboarding') {
            navigate('/onboarding/setup', { replace: true });
          } else if (purpose === 'user_onboarding') {
            navigate('/onboarding/user-setup', { replace: true });
          } else if (typedUser.is_super_admin) {
            navigate('/admin/tenants', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 1200);
      })
      .catch((err) => {
        if (cancelled) return;
        setState('error');
        setErrorMsg(extractErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, login]);

  if (state === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <Text type="secondary">Verifying your link…</Text>
      </div>
    );
  }

  if (state === 'error') {
    const isAlreadyUsed = errorMsg.toLowerCase().includes('already been used');
    const isExpired = errorMsg.toLowerCase().includes('expired');

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Result
          icon={
            isAlreadyUsed ? (
              <WarningOutlined style={{ color: '#faad14' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )
          }
          title={
            isAlreadyUsed
              ? 'Link Already Used'
              : isExpired
                ? 'Link Expired'
                : 'Invalid Link'
          }
          subTitle={errorMsg}
          extra={
            <Space direction="vertical" align="center">
              <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
                Go to Login
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="Verified!"
        subTitle="Redirecting you now…"
      />
    </div>
  );
}
