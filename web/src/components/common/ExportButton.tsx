import { Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportToCSV, exportToExcel, exportTableData } from '@/utils/export.utils';

export interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
}

export default function ExportButton<T extends Record<string, any>>({
  data,
  filename,
  columns,
}: ExportButtonProps<T>) {
  const menuItems = [
    {
      key: 'csv',
      label: 'Export as CSV',
      onClick: () => exportToCSV(data, filename, columns),
    },
    {
      key: 'excel',
      label: 'Export as Excel',
      onClick: () => exportToExcel(data, filename, columns),
    },
    {
      key: 'pdf',
      label: 'Export as PDF',
      onClick: () => exportTableData(data, filename, 'pdf'),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Button icon={<DownloadOutlined />}>Export</Button>
    </Dropdown>
  );
}