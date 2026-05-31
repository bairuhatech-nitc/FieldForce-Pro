import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  Select,
  DatePicker,
  InputNumber,
  Modal,
  Divider,
  Tag,
  Spin,
  Empty,
  Typography,
  Alert,
  Tooltip,
  Badge,
  message,
  Radio,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  LinkOutlined,
  AppstoreOutlined,
  ToolOutlined,
  FormOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import {
  useEstimate,
  useCreateEstimate,
  useUpdateEstimate,
  useSendEstimate,
  useEstimateAssignedCreator,
  useSubmitForInternalApproval,
} from '@/hooks/use-estimates';
import { usePermission } from '@/components/permissions/usePermission';
import { useAuthStore } from '@/store/auth.store';
import { useAllContacts } from '@/hooks/use-contacts';
import { useServiceRequest } from '@/hooks/use-service-requests';
import { useAllServiceLocations } from '@/hooks/use-service-locations';
import { useEstimateLineItems, useCreateEstimateLineItem } from '@/hooks/use-estimate-line-items';
import { useAllServicesCatalog } from '@/hooks/use-services-catalog';
import { useAllPartsCatalog } from '@/hooks/use-parts-catalog';
import type { LineItemType } from '@/api/estimate-line-items.api';
import { useUiStore } from '@/store/ui.store';
import type { EstimateLineItem, ServiceCatalogItem, PartsCatalogItem, ServiceLocation } from '@/types/models.types';

const { TextArea } = Input;
const { Text } = Typography;

type ItemSource = 'service' | 'part' | 'manual';

const LINE_ITEM_TYPE_META: Record<string, { label: string; color: string }> = {
  service:   { label: 'Service',   color: 'blue'    },
  part:      { label: 'Part',      color: 'green'   },
  labor:     { label: 'Labour',    color: 'purple'  },
  material:  { label: 'Material',  color: 'cyan'    },
  equipment: { label: 'Equipment', color: 'gold'    },
  travel:    { label: 'Travel',    color: 'orange'  },
  other:     { label: 'Other',     color: 'default' },
};

const MANUAL_TYPES = [
  { value: 'service',   label: 'Service'   },
  { value: 'part',      label: 'Part'      },
  { value: 'labor',     label: 'Labour'    },
  { value: 'material',  label: 'Material'  },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel',    label: 'Travel'    },
  { value: 'other',     label: 'Other'     },
];

const UNITS = ['each', 'hrs', 'days', 'sqft', 'sqm', 'lm', 'kg', 'lot', 'visit', 'month'];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    dot: '#6b7280' },
  { value: 'medium', label: 'Medium', dot: '#2563eb' },
  { value: 'high',   label: 'High',   dot: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', dot: '#ef4444' },
];

interface LineItemFormData extends Partial<EstimateLineItem> {
  tempId?: string;
  unit?: string;
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableLineItemRow({
  item, index, onEdit, onDelete, borderColor,
}: {
  item: LineItemFormData;
  index: number;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
  borderColor: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.tempId || item.id || `item-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const qty      = Number(item.quantity)   || 0;
  const price    = Number(item.unit_price) || 0;
  const discType = item.discount_type || 'fixed';
  const discVal  = Number(item.discount)   || 0;
  const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;
  const tax      = Number(item.tax_rate)   || 0;
  const lineBase = qty * price - discAmt;
  const lineTotal = lineBase + lineBase * (tax / 100);
  const typeMeta = LINE_ITEM_TYPE_META[item.type || 'other'] || LINE_ITEM_TYPE_META['other'];

  return (
    <tr ref={setNodeRef} style={{ ...style, borderBottom: `1px solid ${borderColor}` }}>
      <td style={{ width: 36, textAlign: 'center', cursor: 'grab', color: '#9ca3af', padding: '10px 6px' }}
        {...attributes} {...listeners}>
        <DragOutlined />
      </td>
      <td style={{ padding: '10px 8px', width: 110 }}>
        <Tag color={typeMeta.color} style={{ fontSize: 11, margin: 0 }}>
          {typeMeta.label}
        </Tag>
      </td>
      <td style={{ padding: '10px 8px' }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
        {item.description && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>
        )}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center', width: 80 }}>
        <span style={{ fontSize: 13 }}>{qty}</span>
        {item.unit && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 3 }}>{item.unit}</span>}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', width: 100, fontSize: 13 }}>
        ${price.toFixed(2)}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', width: 70, fontSize: 13 }}>
        {tax > 0 ? `${tax}%` : <Text type="secondary">—</Text>}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', width: 90, fontSize: 13 }}>
        {discAmt > 0 ? <Text style={{ color: '#ef4444' }}>{discType === 'percentage' ? `${discVal}%` : `-$${discAmt.toFixed(2)}`}</Text> : <Text type="secondary">—</Text>}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', width: 105, fontWeight: 600, fontSize: 13 }}>
        ${lineTotal.toFixed(2)}
      </td>
      <td style={{ padding: '10px 8px', width: 72 }}>
        <Space size={2}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(index)} />
          </Tooltip>
          <Tooltip title="Remove">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(index)} />
          </Tooltip>
        </Space>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EstimateBuilderPage() {
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const [searchParams]   = useSearchParams();
  const serviceRequestId = searchParams.get('service_request_id');
  const estimateTypeParam  = searchParams.get('estimate_type') || 'pre_visit';
  const theme            = useUiStore((s) => s.theme);
  const { isAdmin }      = usePermission();
  const currentUser      = useAuthStore((s) => s.user);

  const [form]         = Form.useForm();
  const [lineItemForm] = Form.useForm();
  const isEdit = !!id;

  const { data: estimate, isLoading }  = useEstimate(id || '');
  const { data: existingLineItems }    = useEstimateLineItems(isEdit ? (id || '') : '');
  // In create mode: use URL query param. In edit mode: fall back to estimate.request_id
  const srIdToFetch = serviceRequestId || (isEdit && estimate?.request_id ? estimate.request_id : '');
  const { data: linkedSR }             = useServiceRequest(srIdToFetch);
  const { data: servicesCatalog = [] } = useAllServicesCatalog();
  const { data: partsCatalog    = [] } = useAllPartsCatalog();
  const { data: allLocations = [] }    = useAllServiceLocations();
  const { data: assignedCreatorId }    = useEstimateAssignedCreator();

  // Guard: only assigned creator or admin can create new estimates
  useEffect(() => {
    if (!isEdit && assignedCreatorId !== undefined && !isAdmin && currentUser?.id !== assignedCreatorId) {
      message.error('Only the assigned estimator can create estimates');
      navigate('/estimates');
    }
  }, [isEdit, assignedCreatorId, isAdmin, currentUser?.id, navigate]);

  // Build location options: merge fetched list + SR's embedded location so the
  // dropdown always has at least the SR's location even if allLocations is empty.
  const locationOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = (allLocations as ServiceLocation[]).map((loc) => ({
      value: loc.id,
      label: loc.address,
    }));
    // If the linked SR carries a location object not already in the list, prepend it.
    if (linkedSR?.location && !opts.find((o) => o.value === linkedSR.location!.id)) {
      opts.unshift({ value: linkedSR.location.id, label: linkedSR.location.address });
    }
    return opts;
  }, [allLocations, linkedSR]);

  const createEstimate          = useCreateEstimate();
  const updateEstimate          = useUpdateEstimate();
  const sendEstimate            = useSendEstimate();
  const submitForInternalApproval = useSubmitForInternalApproval();
  const createLineItem          = useCreateEstimateLineItem();
  const isOnSite                = estimateTypeParam === 'on_site';
  const { data: contacts } = useAllContacts();

  const [lineItems,    setLineItems]    = useState<LineItemFormData[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [itemSource,   setItemSource]   = useState<ItemSource>('service');
  const [isSaving,     setIsSaving]     = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const borderColor = theme === 'dark' ? '#303030' : '#f0f0f0';
  const cardBg      = theme === 'dark' ? '#141414' : '#fff';
  const mutedBg     = theme === 'dark' ? '#1f1f1f' : '#f9fafb';

  useEffect(() => {
    if (linkedSR && !isEdit) {
      form.setFieldsValue({
        contact_id: linkedSR.contact_id,
        title: `Estimate for: ${linkedSR.subject || 'Service Request'}`,
        scheduled_start: linkedSR.scheduled_start ? dayjs(linkedSR.scheduled_start) : null,
        location_id: linkedSR.location_id || null,
      });
    }
  }, [linkedSR, isEdit, form]);

  useEffect(() => {
    if (estimate && isEdit) {
      const cf = (estimate.custom_fields as Record<string, unknown>) || {};
      // Fall back to linked SR for scheduled dates if not set on the estimate
      const scheduledStart = estimate.scheduled_start
        ? dayjs(estimate.scheduled_start)
        : (linkedSR?.scheduled_start ? dayjs(linkedSR.scheduled_start) : null);
      form.setFieldsValue({
        contact_id:            estimate.contact_id,
        title:                 cf.title || '',
        expiry_date:           estimate.expiry_date ? dayjs(estimate.expiry_date) : null,
        scheduled_start:       scheduledStart,
        priority:              cf.priority || undefined,
        notes:                 estimate.notes || '',
        terms_and_conditions:  (cf.terms_and_conditions as string) || '',
        location_id:           (cf.location_id as string) || linkedSR?.location_id || null,
      });
    }
  }, [estimate, isEdit, form, linkedSR]);

  useEffect(() => {
    const source =
      existingLineItems && existingLineItems.length > 0
        ? existingLineItems
        : estimate?.line_items && estimate.line_items.length > 0
          ? estimate.line_items : null;
    if (source && isEdit) {
      setLineItems(
        [...source]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((item) => ({ ...item, tempId: item.id })),
      );
    }
  }, [existingLineItems, estimate?.line_items, isEdit]);

  const subtotal = lineItems.reduce((sum, item) => {
    const qty   = Number(item.quantity)   || 0;
    const price = Number(item.unit_price) || 0;
    const discType = item.discount_type || 'fixed';
    const discVal  = Number(item.discount) || 0;
    const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;
    return sum + (qty * price) - discAmt;
  }, 0);
  const totalTax = lineItems.reduce((sum, item) => {
    const qty   = Number(item.quantity)   || 0;
    const price = Number(item.unit_price) || 0;
    const discType = item.discount_type || 'fixed';
    const discVal  = Number(item.discount) || 0;
    const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;
    const base = (qty * price) - discAmt;
    return sum + base * ((Number(item.tax_rate) || 0) / 100);
  }, 0);
  const totalDiscount = lineItems.reduce((sum, item) => {
    const qty   = Number(item.quantity)   || 0;
    const price = Number(item.unit_price) || 0;
    const discType = item.discount_type || 'fixed';
    const discVal  = Number(item.discount) || 0;
    const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;
    return sum + discAmt;
  }, 0);
  const grandTotal    = subtotal + totalTax;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLineItems((items) => {
        const oldIdx = items.findIndex((i) => (i.tempId || i.id) === active.id);
        const newIdx = items.findIndex((i) => (i.tempId || i.id) === over.id);
        return arrayMove(items, oldIdx, newIdx).map((item, idx) => ({ ...item, sort_order: idx }));
      });
    }
  };

  const openAdd = () => {
    setEditingIndex(null);
    setItemSource('service');
    lineItemForm.resetFields();
    lineItemForm.setFieldsValue({ quantity: 1, unit: 'each', unit_price: 0, tax_rate: 0, discount_type: 'fixed', discount: 0 });
    setModalVisible(true);
  };

  const openEdit = (index: number) => {
    const item = lineItems[index];
    setEditingIndex(index);
    setItemSource(item.type === 'service' ? 'service' : item.type === 'part' ? 'part' : 'manual');
    lineItemForm.resetFields();
    lineItemForm.setFieldsValue(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    lineItemForm.resetFields();
  };

  const confirmDelete = (index: number) => {
    Modal.confirm({
      title: 'Remove Line Item',
      content: 'Remove this item from the estimate?',
      okText: 'Remove', okType: 'danger',
      onOk: () => setLineItems((items) => items.filter((_, i) => i !== index)),
    });
  };

  const saveLineItem = () => {
    lineItemForm
      .validateFields()
      .then((values) => {
        const resolvedType =
          itemSource === 'service' ? 'service' :
          itemSource === 'part'    ? 'part'    :
          String(values.type || 'other');

        const qty   = Number(values.quantity)   || 0;
        const price = Number(values.unit_price) || 0;
        const discType = values.discount_type || 'fixed';
        const discVal  = Number(values.discount)   || 0;
        const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;

        const entry: LineItemFormData = {
          ...values,
          type:       resolvedType,
          discount_type: discType,
          tempId:     editingIndex !== null ? lineItems[editingIndex].tempId : `temp-${Date.now()}`,
          sort_order: editingIndex !== null ? lineItems[editingIndex].sort_order : lineItems.length,
          total:      qty * price - discAmt,
        };

        if (editingIndex !== null) {
          setLineItems((items) => items.map((li, i) => (i === editingIndex ? entry : li)));
        } else {
          setLineItems((prev) => [...prev, entry]);
        }
        closeModal();
      })
      .catch(() => {
        // Validation errors shown inline by antd
      });
  };

  const doSave = useCallback(
    async (sendForReview = false) => {
      let values: Record<string, unknown>;
      try { values = await form.validateFields(); } catch { return; }

      if (lineItems.length === 0) {
        message.error('Please add at least one line item before saving.');
        return;
      }

      setIsSaving(true);
      try {
        const payload = {
          contact_id:     values.contact_id as string,
          request_id:     (serviceRequestId || estimate?.request_id) ?? undefined,
          work_order_id:  (searchParams.get('work_order_id') || estimate?.work_order_id) ?? undefined,
          estimate_type:  isEdit ? undefined : estimateTypeParam,
          expiry_date:    values.expiry_date ? (values.expiry_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
          scheduled_start: values.scheduled_start ? (values.scheduled_start as dayjs.Dayjs).toISOString() : undefined,
          notes:          (values.notes as string) || undefined,
          subtotal, tax: totalTax, discount: totalDiscount, total: grandTotal,
          custom_fields: {
            title:                (values.title as string) || '',
            priority:             (values.priority as string) || '',
            terms_and_conditions: (values.terms_and_conditions as string) || '',
            location_id:          (values.location_id as string) || '',
          },
        };

        let estimateId: string | undefined = id;
        if (isEdit) {
          await updateEstimate.mutateAsync({ id: id!, ...payload });
        } else {
          const res = await createEstimate.mutateAsync(payload);
          estimateId = (res.data?.data as { id?: string } | undefined)?.id;
        }

        if (!estimateId) { message.error('Could not get estimate ID. Please try again.'); return; }

        for (const item of lineItems.filter((i) => !i.id)) {
          const qty      = Number(item.quantity)   || 1;
          const price    = Number(item.unit_price) || 0;
          const discType = item.discount_type || 'fixed';
          const discVal  = Number(item.discount)   || 0;
          const discAmt  = discType === 'percentage' ? (qty * price) * (discVal / 100) : discVal;
          const taxRate  = Number(item.tax_rate)   || 0;
          const lineBase = qty * price - discAmt;
          await createLineItem.mutateAsync({
            estimate_id: estimateId,
            type:        (String(item.type || 'service')) as LineItemType,
            name:        String(item.name || ''),
            description: item.description ?? undefined,
            quantity:    qty,
            unit:        item.unit,
            unit_price:  price,
            tax_rate:    taxRate,
            discount_type: discType,
            discount:    discVal,
            total:       lineBase + lineBase * (taxRate / 100),
            sort_order:  item.sort_order || 0,
          });
        }

        // Send for review: transition status from draft → sent
        if (sendForReview) {
          await sendEstimate.mutateAsync(estimateId);
        }

        navigate('/estimates');
      } catch (err: unknown) {
        message.error((err as { message?: string })?.message || 'Failed to save estimate');
      } finally {
        setIsSaving(false);
      }
    },
    [form, lineItems, subtotal, totalTax, totalDiscount, grandTotal,
     serviceRequestId, estimate, id, isEdit,
     updateEstimate, createEstimate, sendEstimate, createLineItem, navigate],
  );

  if (isEdit && isLoading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const activeSvcOptions = (servicesCatalog as ServiceCatalogItem[])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.id, label: s.category ? `${s.name} — ${s.category}` : s.name }));

  const activePartOptions = (partsCatalog as PartsCatalogItem[])
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }));

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Create Estimate' : 'New Estimate'}
        subtitle={isEdit ? 'Complete the estimate with details and line items' : 'Create a detailed estimate for the approved service request'}
        onBack={() => navigate('/estimates')}
        extra={
          <Space>
            <Button onClick={() => navigate('/estimates')}>Cancel</Button>
            <Button icon={<SaveOutlined />} onClick={() => doSave(false)} loading={isSaving}>
              Save Draft
            </Button>
            {isOnSite ? (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={isSaving || submitForInternalApproval.isPending}
                onClick={async () => {
                  const savedRes = await doSave(false) as unknown as { id?: string } | undefined;
                  const newId = savedRes?.id || id;
                  if (newId) submitForInternalApproval.mutate(newId);
                }}
              >
                Submit for Manager Approval
              </Button>
            ) : (
              <Button type="primary" icon={<SendOutlined />} onClick={() => doSave(true)} loading={isSaving}>
                Save &amp; Send for Review
              </Button>
            )}
          </Space>
        }
      />

      {linkedSR && (
        <Alert type="info" showIcon icon={<LinkOutlined />}
          message={
            <span>
              Linked to Service Request: <Text strong>{linkedSR.subject}</Text>
              {linkedSR.priority && <Tag color="orange" style={{ marginLeft: 8 }}>{linkedSR.priority}</Tag>}
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault(); }}>
        <Row gutter={24}>
          <Col xs={24} lg={16}>

            <Card title={<Space><UserOutlined /><span>Client &amp; Reference</span></Space>}
              style={{ marginBottom: 16, background: cardBg, borderColor }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="contact_id" label="Customer / Contact"
                    rules={[{ required: true, message: 'Please select a customer' }]}>
                    <Select showSearch optionFilterProp="label" placeholder="Search and select customer"
                      options={contacts?.map((c) => ({
                        value: c.id,
                        label: `${c.first_name} ${c.last_name}${c.email ? ` — ${c.email}` : ''}`,
                      })) || []}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="title" label="Estimate Title">
                    <Input placeholder="e.g. HVAC Annual Maintenance Package" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="scheduled_start" label="Scheduled Date">
                    <DatePicker
                      format="YYYY-MM-DD"
                      placeholder="Select scheduled date"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="location_id" label={<Space size={4}><EnvironmentOutlined />Location</Space>}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Select service location"
                  optionFilterProp="label"
                  options={locationOptions}
                />
              </Form.Item>
              {linkedSR && (
                <Form.Item label="Linked Service Request" style={{ marginBottom: 0 }}>
                  <Input readOnly value={linkedSR.subject || ''}
                    prefix={<LinkOutlined style={{ color: '#6b7280' }} />}
                    style={{ background: mutedBg, color: '#6b7280', cursor: 'default' }} />
                </Form.Item>
              )}
            </Card>

            <Card
              title={<Space><FileTextOutlined /><span>Line Items</span>{lineItems.length === 0 && <Tag color="error" style={{ marginLeft: 4 }}>Required</Tag>}</Space>}
              extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAdd}>Add Item</Button>}
              style={{ marginBottom: 16, background: cardBg, borderColor: lineItems.length === 0 ? '#ff4d4f' : borderColor }}
            >
              {/* DndContext is ALWAYS mounted to prevent StrictMode remount crash */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={lineItems.map((i) => i.tempId || i.id || '')}
                  strategy={verticalListSortingStrategy}
                >
                  {lineItems.length === 0 ? (
                    <Empty description="No line items yet. Add services, parts, or custom items."
                      image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '24px 0' }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add First Item</Button>
                    </Empty>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${borderColor}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
                            <th style={{ padding: '8px 6px', width: 36 }} />
                            <th style={{ padding: '8px 8px', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '8px 8px', textAlign: 'left' }}>Item / Description</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Tax</th>
                            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Disc</th>
                            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Total</th>
                            <th style={{ padding: '8px 8px', width: 72 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, index) => (
                            <SortableLineItemRow
                              key={item.tempId || item.id || `item-${index}`}
                              item={item} index={index}
                              onEdit={openEdit} onDelete={confirmDelete}
                              borderColor={borderColor}
                            />
                          ))}
                        </tbody>
                      </table>

                      <Divider style={{ margin: '16px 0' }} />

                      <Row justify="end">
                        <Col xs={24} sm={14} md={10}>
                          <div style={{ padding: '0 8px' }}>
                            {[
                              { label: 'Subtotal', value: `$${subtotal.toFixed(2)}` },
                              { label: 'Total Discount', value: totalDiscount > 0 ? `-$${totalDiscount.toFixed(2)}` : '—', color: totalDiscount > 0 ? '#ef4444' : undefined },
                              { label: 'Tax', value: `$${totalTax.toFixed(2)}` },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                                <Text type="secondary">{label}</Text>
                                <Text style={{ color }}>{value}</Text>
                              </div>
                            ))}
                            <Divider style={{ margin: '8px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                              <Text strong style={{ fontSize: 14 }}>Grand Total</Text>
                              <Text strong style={{ fontSize: 20, color: '#2563eb' }}>${grandTotal.toFixed(2)}</Text>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            </Card>

            <Card
              title={<Space><FileTextOutlined /><span>Notes</span></Space>}
              style={{ marginBottom: 16, background: cardBg, borderColor }}
            >
              <Form.Item name="notes" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={3}
                  placeholder="Any additional notes for the customer (printed on the PDF)..."
                />
              </Form.Item>
            </Card>

            <Card
              title={<Space><FileTextOutlined /><span>Terms &amp; Conditions</span></Space>}
              style={{ marginBottom: 16, background: cardBg, borderColor }}
              extra={
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    const defaults = [
                      'Payment Terms: Full payment is due within 30 days of invoice date.',
                      'Service Delivery: Work will commence within 10 business days of estimate approval.',
                      'Cancellation: Written notice of 15 days is required. Payment is due for work completed up to the cancellation date.',
                      'Warranty: All workmanship is warranted for 90 days from the date of service completion.',
                      'Liability: Our liability is limited to the total value of this estimate.',
                    ].join('\n');
                    form.setFieldValue('terms_and_conditions', defaults);
                  }}
                >
                  Use Default Terms
                </Button>
              }
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Each line is printed as a numbered item in the PDF. Use "Label: Description" format to bold the label.
              </Text>
              <Form.Item name="terms_and_conditions" style={{ marginBottom: 0 }}>
                <TextArea
                  rows={6}
                  placeholder={`Payment Terms: Full payment due within 30 days.\nService Delivery: Work starts within 10 days of approval.\nCancellation: 15 days written notice required.\nWarranty: 90-day workmanship warranty.`}
                />
              </Form.Item>
            </Card>

          </Col>

          <Col xs={24} lg={8}>
            <Card title={<Space><CalendarOutlined /><span>Estimate Details</span></Space>}
              style={{ marginBottom: 16, background: cardBg, borderColor }}>
              <Form.Item label="Estimate Date">
                <Input readOnly value={dayjs().format('DD MMM YYYY')}
                  style={{ background: mutedBg, color: '#6b7280', cursor: 'default' }} />
              </Form.Item>
              <Form.Item name="expiry_date" label="Valid Until" rules={[{ required: true, message: 'Expiry date is required' }]}>
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY"
                  disabledDate={(d) => d && d.isBefore(dayjs(), 'day')} placeholder="Select expiry date" />
              </Form.Item>
              <Form.Item name="priority" label="Priority" style={{ marginBottom: 0 }}>
                <Select placeholder="Select priority" allowClear>
                  {PRIORITIES.map((p) => (
                    <Select.Option key={p.value} value={p.value}>
                      <Badge color={p.dot} text={p.label} />
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            <Card title={<Space><DollarOutlined /><span>Financial Summary</span></Space>}
              style={{ marginBottom: 16, background: cardBg, borderColor }}>
              <div style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <Text type="secondary">Items</Text>
                  <Text>{lineItems.length}</Text>
                </div>
                {[
                  { label: 'Subtotal', value: `$${subtotal.toFixed(2)}` },
                  { label: 'Discount', value: totalDiscount > 0 ? `-$${totalDiscount.toFixed(2)}` : '—', color: totalDiscount > 0 ? '#ef4444' : undefined },
                  { label: 'Tax', value: `$${totalTax.toFixed(2)}` },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <Text type="secondary">{label}</Text>
                    <Text style={{ color }}>{value}</Text>
                  </div>
                ))}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <Text strong style={{ fontSize: 14 }}>Total</Text>
                  <Text strong style={{ fontSize: 22, color: '#2563eb' }}>${grandTotal.toFixed(2)}</Text>
                </div>
              </div>
            </Card>

          </Col>
        </Row>
      </Form>

      {/* ── LINE ITEM MODAL ── */}
      <Modal
        title={editingIndex !== null ? 'Edit Line Item' : 'Add Line Item'}
        open={modalVisible}
        onOk={saveLineItem}
        onCancel={closeModal}
        okText={editingIndex !== null ? 'Update Item' : 'Add Item'}
        width={680}
        destroyOnClose
      >
        {/* Source selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>ITEM SOURCE</div>
          <Radio.Group
            value={itemSource}
            buttonStyle="solid"
            style={{ width: '100%' }}
            onChange={(e) => {
              setItemSource(e.target.value as ItemSource);
              lineItemForm.resetFields();
              lineItemForm.setFieldsValue({ quantity: 1, unit: 'each', unit_price: 0, tax_rate: 0, discount: 0 });
            }}
          >
            <Radio.Button value="service" style={{ width: '33.33%', textAlign: 'center' }}>
              <Space size={4}><AppstoreOutlined />Services Catalog</Space>
            </Radio.Button>
            <Radio.Button value="part" style={{ width: '33.33%', textAlign: 'center' }}>
              <Space size={4}><ToolOutlined />Parts Catalog</Space>
            </Radio.Button>
            <Radio.Button value="manual" style={{ width: '33.34%', textAlign: 'center' }}>
              <Space size={4}><FormOutlined />Manual Entry</Space>
            </Radio.Button>
          </Radio.Group>
        </div>

        <Form form={lineItemForm} layout="vertical">

          {/* Services Catalog */}
          {itemSource === 'service' && (
            <Form.Item label="Choose from Services Catalog" style={{ marginBottom: 16 }}>
              <Select
                showSearch
                allowClear
                placeholder="Search services by name or category..."
                optionFilterProp="label"
                options={activeSvcOptions}
                notFoundContent={<div style={{ padding: '8px 0', color: '#9ca3af', textAlign: 'center' }}>No active services found</div>}
                onChange={(serviceId: string) => {
                  if (!serviceId) return;
                  const svc = (servicesCatalog as ServiceCatalogItem[]).find((s) => s.id === serviceId);
                  if (!svc) return;
                  lineItemForm.setFieldsValue({
                    name:        svc.name,
                    description: svc.description || '',
                    unit_price:  Number(svc.default_price) || 0,
                    tax_rate:    Number(svc.tax_rate) || 0,
                    unit:        svc.duration_minutes ? 'hrs' : 'each',
                    quantity:    1,
                    discount:    0,
                  });
                }}
              />
            </Form.Item>
          )}

          {/* Parts Catalog */}
          {itemSource === 'part' && (
            <Form.Item label="Choose from Parts Catalog" style={{ marginBottom: 16 }}>
              <Select
                showSearch
                allowClear
                placeholder="Search parts by name or SKU..."
                optionFilterProp="label"
                options={activePartOptions}
                notFoundContent={<div style={{ padding: '8px 0', color: '#9ca3af', textAlign: 'center' }}>No active parts found</div>}
                onChange={(partId: string) => {
                  if (!partId) return;
                  const part = (partsCatalog as PartsCatalogItem[]).find((p) => p.id === partId);
                  if (!part) return;
                  lineItemForm.setFieldsValue({
                    name:        part.name,
                    description: part.description || (part.sku ? `SKU: ${part.sku}` : ''),
                    unit_price:  Number(part.unit_price) || 0,
                    tax_rate:    0,
                    unit:        'each',
                    quantity:    1,
                    discount:    0,
                  });
                }}
              />
            </Form.Item>
          )}

          {/* Manual mode — type selector */}
          {itemSource === 'manual' && (
            <Form.Item name="type" label="Item Type" rules={[{ required: true, message: 'Please select a type' }]} style={{ marginBottom: 16 }}>
              <Select placeholder="Select type"
                options={MANUAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Form.Item>
          )}

          <Divider style={{ margin: '4px 0 16px' }} />

          {/* Common fields */}
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Item name is required' }]}>
                <Input placeholder="e.g. HVAC Filter Replacement" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit">
                <Select placeholder="each" allowClear options={UNITS.map((u) => ({ value: u, label: u }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Optional details about this item..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0.01} step={1} style={{ width: '100%' }} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit_price" label="Unit Price" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tax_rate" label="Tax Rate (%)">
                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} suffix="%" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount_type" label="Discount Type" initialValue="fixed">
                <Select
                  options={[
                    { value: 'fixed', label: 'Fixed Amount ($)' },
                    { value: 'percentage', label: 'Percentage (%)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev?.discount_type !== curr?.discount_type}
              >
                {({ getFieldValue }) => {
                  const dType = getFieldValue('discount_type') || 'fixed';
                  return (
                    <Form.Item name="discount" label={dType === 'percentage' ? 'Discount (%)' : 'Discount ($)'} style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0}
                        max={dType === 'percentage' ? 100 : undefined}
                        step={dType === 'percentage' ? 1 : 0.01}
                        prefix={dType === 'percentage' ? undefined : '$'}
                        suffix={dType === 'percentage' ? '%' : undefined}
                        style={{ width: '100%' }}
                        precision={2}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
