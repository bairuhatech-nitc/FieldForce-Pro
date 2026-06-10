import { useEffect, useState } from 'react';
import { Button, Space, Tooltip, Typography, Popover, Tag } from 'antd';
import {
  LoginOutlined,
  LogoutOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useMyToday, useCheckIn, useCheckOut } from '@/hooks/use-attendance';

dayjs.extend(duration);

const { Text } = Typography;

function useRunningTimer(startTime: string | null): string {
  const [display, setDisplay] = useState('0:00:00');

  useEffect(() => {
    if (!startTime) {
      setDisplay('0:00:00');
      return;
    }
    const tick = () => {
      const diff = dayjs().diff(dayjs(startTime));
      const d = dayjs.duration(diff);
      const h = Math.floor(d.asHours());
      const m = String(d.minutes()).padStart(2, '0');
      const s = String(d.seconds()).padStart(2, '0');
      setDisplay(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return display;
}

async function requestLocation(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 5000 },
    );
  });
}

function getDeviceInfo(): string {
  return navigator.userAgent.slice(0, 200);
}

export default function CheckInWidget() {
  const { data: today, isLoading: todayLoading } = useMyToday();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const activePunch = today?.active_punch ?? null;
  const isWorking = !!activePunch;
  const timer = useRunningTimer(activePunch ? activePunch.punch_in_time : null);

  const handleCheckIn = async () => {
    const location = await requestLocation();
    await checkInMutation.mutateAsync({ location, device_info: getDeviceInfo() });
  };

  const handleCheckOut = async () => {
    const location = await requestLocation();
    await checkOutMutation.mutateAsync({ location, device_info: getDeviceInfo() });
  };

  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  const popoverContent = (
    <div style={{ width: 220 }}>
      {today?.log ? (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Today ({dayjs(today.log.date).format('MMM D')})
          </Text>
          <Space>
            <Tag color="green">Regular: {formatHrs(today.log.total_regular_hours)}</Tag>
            {today.log.total_overtime_hours > 0 && (
              <Tag color="orange">OT: {formatHrs(today.log.total_overtime_hours)}</Tag>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Punches today: {today.log.punches?.length ?? 0}
          </Text>
        </Space>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>No activity logged today yet.</Text>
      )}
    </div>
  );

  if (todayLoading) return null;

  return (
    <Popover content={popoverContent} title="Attendance" trigger="hover" placement="bottomRight">
      <Space size={8} style={{ cursor: 'default' }}>
        {isWorking && (
          <Tag
            color="green"
            icon={<ClockCircleOutlined />}
            style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', margin: 0 }}
          >
            {timer}
          </Tag>
        )}
        {isWorking ? (
          <Tooltip title="Check Out">
            <Button
              type="default"
              danger
              size="small"
              icon={isMutating ? <LoadingOutlined /> : <LogoutOutlined />}
              onClick={handleCheckOut}
              disabled={isMutating}
              style={{ borderRadius: 6 }}
            >
              Check Out
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="Check In">
            <Button
              type="primary"
              size="small"
              icon={isMutating ? <LoadingOutlined /> : <LoginOutlined />}
              onClick={handleCheckIn}
              disabled={isMutating}
              style={{ borderRadius: 6, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Check In
            </Button>
          </Tooltip>
        )}
      </Space>
    </Popover>
  );
}

function formatHrs(h: number): string {
  if (!h || h === 0) return '0h';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
