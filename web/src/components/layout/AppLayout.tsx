import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Layout, Alert, Button } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import { useUiStore } from '@/store/ui.store';

const { Content } = Layout;

// Error boundary to protect layout from page crashes
class PageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PageErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          message="This page encountered an error"
          description={
            <div>
              <p>{this.state.error?.message}</p>
              <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.stack}
              </pre>
              <Button
                type="primary"
                size="small"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ marginTop: 8 }}
              >
                Try Again
              </Button>
            </div>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default function AppLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        <Header />
        <Content style={{ margin: 0, transition: 'background-color 0.2s' }}>
          <div style={{ padding: 24 }}>
            <Breadcrumb />
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
