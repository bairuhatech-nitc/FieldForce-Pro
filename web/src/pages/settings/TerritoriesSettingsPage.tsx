import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CompassOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSetting, useUpsertSetting } from '@/hooks/use-settings';
import { useUsers } from '@/hooks/use-users';
import { showConfirmDialog } from '@/components/common/ConfirmDialog';
import { useNotificationStore } from '@/store/notification.store';

interface TerritoryItem {
  id: string;
  name: string;
  description: string;
  zip_codes: string[];
  dispatcher_ids: string[];
  technician_ids: string[];
}

const INITIAL_TERRITORIES: TerritoryItem[] = [
  {
    id: 't-1',
    name: 'North Region',
    description: 'Servicing northern metro zones',
    zip_codes: ['10001', '10002', '10003'],
    dispatcher_ids: [],
    technician_ids: [],
  },
  {
    id: 't-2',
    name: 'South Region',
    description: 'Coverage for southern division',
    zip_codes: ['90001', '90002'],
    dispatcher_ids: [],
    technician_ids: [],
  },
];

export default function TerritoriesSettingsPage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TerritoryItem | null>(null);
  const [form] = Form.useForm();
  const addNotification = useNotificationStore((s) => s.add);

  // Fetch setting key
  const { data: settingData, isLoading } = useSetting('territories_settings');
  const upsertMutation = useUpsertSetting();

  // Fetch users for dropdown assignment
  const { data: usersData } = useUsers({ take: 100 });
  const users = usersData?.data || [];

  const [territories, setTerritories] = useState<TerritoryItem[]>(INITIAL_TERRITORIES);

  useEffect(() => {
    if (settingData?.value?.list) {
      setTerritories(settingData.value.list as TerritoryItem[]);
    }
  }, [settingData]);

  const saveTerritories = async (newList: TerritoryItem[]) => {
    await upsertMutation.mutateAsync({
      key: 'territories_settings',
      category: 'workforce',
      value: { list: newList },
    });
    setCurrencies(newList); // Wait, make sure we use setTerritories!
  };

  // Fix: setTerritories is the correct state setter
  const setCurrencies = (list: TerritoryItem[]) => {
    setTerritories(list);
  };

  const handleCreateOrEdit = (record?: TerritoryItem) => {
    if (record) {
      setEditingItem(record);
      form.setFieldsValue({
        ...record,
        zip_codes: record.zip_codes.join(', '),
      });
    } else {
      setEditingItem(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const zipArray = values.zip_codes
      ? values.zip_codes
          .split(',')
          .map((z: string) => z.trim())
          .filter(Boolean)
      : [];

    let newList = [...territories];

    if (editingItem) {
      newList = newList.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              name: values.name,
              description: values.description,
              zip_codes: zipArray,
              dispatcher_ids: values.dispatcher_ids || [],
              technician_ids: values.technician_ids || [],
            }
          : item
      );
    } else {
      newList.push({
        id: `t-${Date.now()}`,
        name: values.name,
        description: values.description,
        zip_codes: zipArray,
        dispatcher_ids: values.dispatcher_ids || [],
        technician_ids: values.technician_ids || [],
      });
    }

    await saveTerritories(newList);
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleDelete = (record: TerritoryItem) => {
    showConfirmDialog({
      title: t('settings.territories.deleteTitle', 'Delete Territory'),
      content: t('settings.territories.deleteConfirm', {
        name: record.name,
      }),
      onOk: async () => {
        const newList = territories.filter((item) => item.id !== record.id);
        await saveTerritories(newList);
      },
      danger: true,
    });
  };

  const getUserNames = (ids: string[]) => {
    return ids
      .map((id) => {
        const u = users.find((user) => user.id === id);
        return u ? `${u.first_name} ${u.last_name}` : null;
      })
      .filter(Boolean) as string[];
  };

  const columns: ColumnsType<TerritoryItem> = [
    {
      title: t('settings.territories.colName', 'Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
          <CompassOutlined style={{ marginRight: 6 }} /> {name}
        </span>
      ),
    },
    {
      title: t('settings.territories.colDesc', 'Description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('settings.territories.colZips', 'Zip Codes'),
      dataIndex: 'zip_codes',
      key: 'zip_codes',
      render: (zips: string[]) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {zips.slice(0, 4).map((zip) => (
            <Tag key={zip}>{zip}</Tag>
          ))}
          {zips.length > 4 && <Tag>+{zips.length - 4} more</Tag>}
          {zips.length === 0 && <span style={{ opacity: 0.5 }}>-</span>}
        </div>
      ),
    },
    {
      title: t('settings.territories.colDispatchers', 'Assigned Dispatchers'),
      dataIndex: 'dispatcher_ids',
      key: 'dispatcher_ids',
      render: (ids: string[]) => {
        const names = getUserNames(ids);
        return names.length > 0 ? (
          names.map((name) => <Tag color="geekblue" key={name}>{name}</Tag>)
        ) : (
          <span style={{ opacity: 0.5 }}>-</span>
        );
      },
    },
    {
      title: t('settings.territories.colTechnicians', 'Assigned Technicians'),
      dataIndex: 'technician_ids',
      key: 'technician_ids',
      render: (ids: string[]) => {
        const names = getUserNames(ids);
        return names.length > 0 ? (
          names.map((name) => <Tag color="green" key={name}>{name}</Tag>)
        ) : (
          <span style={{ opacity: 0.5 }}>-</span>
        );
      },
    },
    {
      title: t('settings.territories.colActions', 'Actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('common.edit', 'Edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleCreateOrEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete', 'Delete')}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {t('settings.territories.title', 'Territories')}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0', maxWidth: 650 }}>
            Define geographic service boundaries to organize dispatch logic. Assign field technicians and routing dispatchers to specific territories to ensure that service requests are always routed to the correct local crew.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleCreateOrEdit()}
        >
          {t('settings.territories.addBtn', 'Create Territory')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={territories}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />

      <Modal
        title={
          editingItem
            ? t('settings.territories.editTitle', 'Edit Territory')
            : t('settings.territories.createTitle', 'Create Territory')
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={upsertMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label={t('settings.territories.formName', 'Territory Name')}
            rules={[{ required: true, message: t('settings.territories.requiredName', 'Please input the name') }]}
          >
            <Input placeholder="East Coast Region" />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('settings.territories.formDesc', 'Description')}
          >
            <Input.TextArea placeholder="Coverage for East Coast states and zip codes" rows={2} />
          </Form.Item>

          <Form.Item
            name="zip_codes"
            label={t('settings.territories.formZips', 'Zip / Postal Codes (Comma-separated)')}
            rules={[{ required: true, message: t('settings.territories.requiredZips', 'Please input at least one zip code') }]}
          >
            <Input placeholder="10001, 10002, 10003" />
          </Form.Item>

          <Form.Item
            name="dispatcher_ids"
            label={t('settings.territories.formDispatchers', 'Assign Dispatchers')}
          >
            <Select
              mode="multiple"
              placeholder={t('settings.territories.selectDispatchers', 'Select dispatchers')}
              options={users.map((u) => ({
                label: `${u.first_name} ${u.last_name}`,
                value: u.id,
              }))}
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>

          <Form.Item
            name="technician_ids"
            label={t('settings.territories.formTechnicians', 'Assign Technicians')}
          >
            <Select
              mode="multiple"
              placeholder={t('settings.territories.selectTechnicians', 'Select technicians')}
              options={users.map((u) => ({
                label: `${u.first_name} ${u.last_name}`,
                value: u.id,
              }))}
              optionFilterProp="label"
              maxTagCount="responsive"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
