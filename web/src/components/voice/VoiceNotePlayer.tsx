import { Card, Typography, Tag, Space, List, Empty } from 'antd';
import { AudioOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { TranscriptionResult } from '../../api/voice.api';

const { Text, Paragraph } = Typography;

interface VoiceNotePlayerProps {
  transcription: TranscriptionResult | null;
  audioUrl?: string;
  fileName?: string;
  loading?: boolean;
}

export default function VoiceNotePlayer({
  transcription,
  audioUrl,
  fileName,
  loading = false,
}: VoiceNotePlayerProps) {
  if (!transcription) {
    return (
      <Card loading={loading}>
        <Empty description="No transcription available" />
      </Card>
    );
  }

  return (
    <Card
      loading={loading}
      title={
        <Space>
          <AudioOutlined />
          <span>{fileName || 'Voice Note'}</span>
        </Space>
      }
      extra={
        <Space>
          <Tag color="blue">{transcription.language}</Tag>
          <Tag icon={<ClockCircleOutlined />}>
            {transcription.duration_seconds.toFixed(1)}s
          </Tag>
        </Space>
      }
    >
      {audioUrl && (
        <audio controls style={{ width: '100%', marginBottom: 16 }}>
          <source src={audioUrl} />
        </audio>
      )}

      <Card size="small" type="inner" title="Transcription">
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {transcription.text || 'No text transcribed.'}
        </Paragraph>
      </Card>

      {transcription.segments.length > 0 && (
        <Card size="small" type="inner" title="Segments" style={{ marginTop: 12 }}>
          <List
            size="small"
            dataSource={transcription.segments}
            renderItem={(seg) => (
              <List.Item>
                <Space>
                  <Tag color="blue">
                    {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                  </Tag>
                  <Text>{seg.text}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}
    </Card>
  );
}
