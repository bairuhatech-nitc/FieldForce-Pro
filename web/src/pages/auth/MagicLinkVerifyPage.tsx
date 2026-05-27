import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Result, Spin, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { magicLinksApi } from '@/api/magic-links.api';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/models.types';

const { Text } = Typography;

type VerifyState = 'loading' | 'success' | 'error';

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
      setErrorMsg('Invalid or missing magic link token.');
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
          setErrorMsg('Link expired or already used');
          return;
        }

        // Store user in auth store (cookies set by the server)
        const typedUser = user as unknown as User;
        login(typedUser);
        setState('success');

        // Redirect based on purpose
        setTimeout(() => {
          if (purpose === 'admin_onboarding') {
            navigate('/onboarding/setup', { replace: true });
          } else if (typedUser.is_super_admin) {
            navigate('/admin/tenants', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 1200);
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
        setErrorMsg('Link expired or already used');
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
        <Text type="secondary">Verifying your magic link…</Text>
      </div>
    );
  }

  if (state === 'error') {
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
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="Link Expired or Already Used"
          subTitle={errorMsg || 'This magic link is no longer valid. Please request a new one.'}
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
