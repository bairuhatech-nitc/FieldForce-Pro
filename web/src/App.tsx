import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { ConfigProvider, theme as antTheme, App as AntApp } from 'antd';
import { useUiStore } from '@/store/ui.store';
import { routes } from '@/routes';
import NotificationToast from '@/components/common/NotificationToast';
import { ChatbotWidget } from '@/components/chat/ChatbotWidget';
import './index.css';

export default function App() {
  const themeMode = useUiStore((s) => s.theme);
  const element = useRoutes(routes);

  // Note: User authentication is checked in PrivateRoute component

  // Update body class for global CSS support
  useEffect(() => {
    if (themeMode === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [themeMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb', // Solux Blue
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
          colorBgLayout: themeMode === 'dark' ? '#141414' : '#f3f4f6',
          colorBgContainer: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 8,
          },
          Input: {
            controlHeight: 40,
            borderRadius: 8,
            colorBgContainer: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
          },
          Card: {
            borderRadiusLG: 12,
            colorBgContainer: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
            colorBorderSecondary: themeMode === 'dark' ? '#303030' : '#f0f0f0',
          },
          Table: {
            colorBgContainer: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
          }
        }
      }}
    >
      <AntApp>
        <NotificationToast />
        {element}
        <ChatbotWidget />
      </AntApp>
    </ConfigProvider>
  );
}
