import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Card, Space, Row, Col, Spin, Select, AutoComplete, message, Typography } from 'antd';
import { EnvironmentOutlined, SaveOutlined, CloseOutlined, AimOutlined, LoadingOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PageHeader from '@/components/common/PageHeader';
import { useServiceLocation, useCreateServiceLocation, useUpdateServiceLocation } from '@/hooks/use-service-locations';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import type { CreateServiceLocationPayload, UpdateServiceLocationPayload } from '@/api/service-locations.api';

const { TextArea } = Input;
const { Text } = Typography;

// Fix Leaflet default marker icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Map helper components ---

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 12, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DraggableMarker({ lat, lng, onDragEnd }: { lat: number; lng: number; onDragEnd: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(pos.lat, pos.lng);
      }
    },
  }), [onDragEnd]);

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
    />
  );
}

// Territory boundary styles
const boundaryStyle = {
  color: '#F59E0B',
  weight: 3,
  fillColor: '#FCD34D',
  fillOpacity: 0.12,
  dashArray: '6 4',
};

// --- Map Picker Component ---

interface MapPickerProps {
  lat?: number | null;
  lng?: number | null;
  address: string;
  onChange: (lat: number, lng: number, address?: string) => void;
}

function MapPicker({ lat, lng, address, onChange }: MapPickerProps) {
  const [mapAddress, setMapAddress] = useState(address);
  const [coords, setCoords] = useState({ lat: lat || 0, lng: lng || 0 });
  const [suggestions, setSuggestions] = useState<{ value: string; label: string; lat: number; lng: number }[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [boundaryData, setBoundaryData] = useState<{ type: string; coordinates: number[][][] | number[][][][] } | null>(null);
  const [boundaryName, setBoundaryName] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundaryKeyRef = useRef(0);

  // Fetch boundary + reverse geocode for a point
  const fetchBoundaryForPoint = useCallback(async (pointLat: number, pointLng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pointLat}&lon=${pointLng}&zoom=10&polygon_geojson=1&addressdetails=1`,
      );
      const data = await res.json();

      // Show territory boundary
      if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
        setBoundaryData(data.geojson);
        setBoundaryName(data.address?.city || data.address?.town || data.address?.village || data.address?.county || '');
        boundaryKeyRef.current += 1;
      }

      // Update address from reverse geocode
      if (data.display_name) {
        setMapAddress(data.display_name);
        onChange(pointLat, pointLng, data.display_name);
      } else {
        onChange(pointLat, pointLng);
      }
    } catch {
      onChange(pointLat, pointLng);
    }
  }, [onChange]);

  // Address search via Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      );
      const results = await response.json();
      setSuggestions(
        results.map((r: { display_name: string; lat: string; lon: string }) => ({
          value: r.display_name,
          label: `🔍 ${r.display_name}`,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })),
      );
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleAddressType = (value: string) => {
    setMapAddress(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(value), 400);
  };

  const handleSelectSuggestion = (_value: string, option: { lat?: number; lng?: number; value?: string }) => {
    const selectedLat = option.lat!;
    const selectedLng = option.lng!;
    setMapAddress(option.value!);
    setCoords({ lat: selectedLat, lng: selectedLng });
    setSuggestions([]);

    // Fetch boundary for selected place
    fetchBoundaryForPoint(selectedLat, selectedLng);
    message.success(`Location set: ${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { message.error('Geolocation not supported'); return; }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setCoords({ lat: newLat, lng: newLng });
        setFetchingLocation(false);
        fetchBoundaryForPoint(newLat, newLng);
        message.success(`Current location: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
      },
      (error) => {
        setFetchingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          message.error('Location permission denied. Please allow location access.');
        } else {
          message.error('Unable to get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleMapClick = useCallback((clickLat: number, clickLng: number) => {
    setCoords({ lat: clickLat, lng: clickLng });
    fetchBoundaryForPoint(clickLat, clickLng);
  }, [fetchBoundaryForPoint]);

  const handleMarkerDrag = useCallback((newLat: number, newLng: number) => {
    setCoords({ lat: newLat, lng: newLng });
    fetchBoundaryForPoint(newLat, newLng);
  }, [fetchBoundaryForPoint]);

  // Wrap boundary as GeoJSON Feature
  const boundaryFeature = boundaryData
    ? { type: 'Feature' as const, geometry: boundaryData, properties: { name: boundaryName } }
    : null;

  return (
    <Card
      title={<Space><EnvironmentOutlined /> Location on Map <span style={{ color: '#ff4d4f' }}>*</span></Space>}
      style={{ marginBottom: 24 }}
    >
      {/* Address search */}
      <Text strong style={{ display: 'block', marginBottom: 6 }}>Search Address:</Text>
      <AutoComplete
        value={mapAddress}
        options={suggestions}
        onSearch={handleAddressType}
        onSelect={handleSelectSuggestion}
        filterOption={false}
        placeholder="Search address (e.g. Kozhikode, Thamarassery)..."
        style={{ width: '100%', marginBottom: 8 }}
        size="large"
      />

      <Button
        icon={fetchingLocation ? <LoadingOutlined /> : <AimOutlined />}
        onClick={handleUseCurrentLocation}
        loading={fetchingLocation}
        block
        style={{ marginBottom: 8 }}
      >
        Use My Current Location
      </Button>

      {/* Interactive map with boundary */}
      <div style={{ height: 350, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
        <MapContainer
          center={[coords.lat || 25.276987, coords.lng || 55.296249]}
          zoom={coords.lat && coords.lng ? 12 : 3}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater lat={coords.lat} lng={coords.lng} />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Territory boundary polygon */}
          {boundaryFeature && (
            <GeoJSON
              key={boundaryKeyRef.current}
              data={boundaryFeature as GeoJSON.Feature}
              style={boundaryStyle}
            />
          )}

          {/* Draggable marker */}
          {coords.lat !== 0 && coords.lng !== 0 && (
            <DraggableMarker lat={coords.lat} lng={coords.lng} onDragEnd={handleMarkerDrag} />
          )}
        </MapContainer>
      </div>

      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
        Search a place or click on the map to set the location. Drag the marker to adjust. The yellow boundary shows the area territory.
      </Text>

      {/* Coordinate display */}
      {coords.lat !== 0 && coords.lng !== 0 && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          <Text strong style={{ fontSize: 12 }}>
            📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            {boundaryName && <Text type="secondary" style={{ marginLeft: 8 }}>(in {boundaryName})</Text>}
          </Text>
        </div>
      )}
    </Card>
  );
}

// --- Main Form ---

export default function ServiceLocationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const isEdit = !!id;

  const { data: location, isLoading } = useServiceLocation(id || '');
  const createServiceLocation = useCreateServiceLocation();
  const updateServiceLocation = useUpdateServiceLocation();
  const { data: contactsData } = useContacts({ take: 100 });
  const { data: companiesData } = useCompanies({ take: 100 });

  const contacts = contactsData?.data || [];
  const companies = companiesData?.data || [];

  useEffect(() => {
    if (location && isEdit) {
      form.setFieldsValue({
        contact_id: location.contact_id,
        company_id: location.company_id,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        access_notes: location.access_notes,
        gate_code: location.gate_code,
      });
    }
  }, [location, isEdit, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!values.lat || !values.lng) {
      message.warning('Please pick a location on the map. Location coordinates are required.');
      return;
    }
    try {
      if (isEdit) {
        const payload: UpdateServiceLocationPayload = {
          ...values,
        } as UpdateServiceLocationPayload;
        await updateServiceLocation.mutateAsync({ id: id!, ...payload });
      } else {
        const payload: CreateServiceLocationPayload = {
          ...values,
        } as CreateServiceLocationPayload;
        await createServiceLocation.mutateAsync(payload);
      }
      navigate('/service-locations');
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleMapChange = (lat: number, lng: number, address?: string) => {
    form.setFieldsValue({ lat, lng });
    if (address) {
      form.setFieldsValue({ address });
    }
  };

  if (isLoading && isEdit) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Service Location' : 'Add Service Location'}
        subtitle={isEdit ? `Editing location at ${location?.address}` : 'Create a new service location'}
        onBack={() => navigate('/service-locations')}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ lat: null, lng: null }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={10}>
            <Card title="Location Details" style={{ marginBottom: 24 }}>
              <Form.Item name="contact_id" label="Contact">
                <Select
                  placeholder="Select a contact (optional)"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {contacts.map((contact) => (
                    <Select.Option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} {contact.email && `(${contact.email})`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="company_id" label="Company">
                <Select
                  placeholder="Select a company (optional)"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {companies.map((company) => (
                    <Select.Option key={company.id} value={company.id}>
                      {company.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: 'Address is required' }]}
              >
                <TextArea rows={2} placeholder="123 Main St, City, State 12345" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="gate_code" label="Gate Code">
                    <Input placeholder="e.g., #1234" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="access_notes" label="Access Notes">
                    <TextArea rows={1} placeholder="Enter through side gate" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="lat"
                hidden
                rules={[{ required: true, message: 'Please pick a location on the map' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="lng"
                hidden
                rules={[{ required: true, message: 'Please pick a location on the map' }]}
              >
                <Input />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <MapPicker
              lat={form.getFieldValue('lat')}
              lng={form.getFieldValue('lng')}
              address={form.getFieldValue('address') || ''}
              onChange={handleMapChange}
            />
          </Col>
        </Row>

        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={createServiceLocation.isPending || updateServiceLocation.isPending}
            >
              {isEdit ? 'Update Location' : 'Create Location'}
            </Button>
            <Button
              onClick={() => navigate('/service-locations')}
              icon={<CloseOutlined />}
            >
              Cancel
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
}
