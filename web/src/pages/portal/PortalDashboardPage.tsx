import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Form,
  Input,
  Select,
  AutoComplete,
  message,
  Result,
  Space,
  Tabs,
  Tag,
  Descriptions,
  Spin,
  Empty,
  Table,
  Rate,
} from 'antd';
import {
  SendOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  AimOutlined,
  LoadingOutlined,
  SearchOutlined,
  FileSearchOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  UnorderedListOutlined,
  CommentOutlined,
  DownloadOutlined,
  PictureOutlined,
  CarOutlined,
  PhoneOutlined,
  CameraOutlined,
  SmileOutlined,
  TrophyOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StarFilled,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, Tooltip, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios-instance';

const { Title, Text } = Typography;
const { TextArea } = Input;

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
    if (lat && lng) map.flyTo([lat, lng], 14, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

function FitServiceBounds({ locations }: { locations: ServiceLocationPin[] | undefined }) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (hasFitted.current || !locations?.length) return;
    const validLocs = locations.filter((l) => l.lat && l.lng);
    if (validLocs.length === 0) return;
    hasFitted.current = true;
    if (validLocs.length === 1) {
      map.flyTo([Number(validLocs[0].lat), Number(validLocs[0].lng)], 11, { duration: 1 });
    } else {
      const bounds = L.latLngBounds(validLocs.map((l) => [Number(l.lat), Number(l.lng)]));
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1 });
    }
  }, [locations, map]);
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

const boundaryStyle = {
  color: '#F59E0B',
  weight: 3,
  fillColor: '#FCD34D',
  fillOpacity: 0.12,
  dashArray: '6 4',
};

// --- Service location types & fetch ---

interface ServiceLocationPin {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

function usePublicServiceLocations() {
  return useQuery({
    queryKey: ['portal', 'locations'],
    queryFn: async () => {
      const res = await api.get<{ data: ServiceLocationPin[] }>('/customer-portal/locations');
      return res.data.data;
    },
  });
}

// --- Types & point-in-polygon check ---

interface LocationBoundary {
  id: string;
  name: string;
  geojson: GeoJSON.Feature;
}

function isPointInPolygonRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    // GeoJSON coordinates are [lng, lat]
    const xi = ring[i][1], yi = ring[i][0];
    const xj = ring[j][1], yj = ring[j][0];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInServiceAreas(lat: number, lng: number, boundaries: LocationBoundary[]): boolean {
  for (const boundary of boundaries) {
    const geom = boundary.geojson.geometry as { type: string; coordinates: number[][][] | number[][][][] };
    if (geom.type === 'Polygon') {
      if (isPointInPolygonRing(lat, lng, (geom.coordinates as number[][][])[0])) return true;
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates as number[][][][]) {
        if (isPointInPolygonRing(lat, lng, polygon[0])) return true;
      }
    }
  }
  return false;
}

// --- Map Picker for Portal ---

interface MapPickerProps {
  onChange: (lat: number, lng: number, address: string) => void;
  onServiceAreaCheck: (isOutside: boolean) => void;
}

// Green boundary style for service-available areas
const serviceAreaStyle = {
  color: '#52c41a',
  weight: 3,
  fillColor: '#b7eb8f',
  fillOpacity: 0.10,
  dashArray: '8 4',
};

function PortalMapPicker({ onChange, onServiceAreaCheck }: MapPickerProps) {
  const { data: serviceLocations } = usePublicServiceLocations();
  const [mapAddress, setMapAddress] = useState('');
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [suggestions, setSuggestions] = useState<{ value: string; label: string; lat: number; lng: number }[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [boundaryData, setBoundaryData] = useState<{ type: string; coordinates: number[][][] | number[][][][] } | null>(null);
  const [boundaryName, setBoundaryName] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundaryKeyRef = useRef(0);
  const [serviceAreaBoundaries, setServiceAreaBoundaries] = useState<LocationBoundary[]>([]);
  const fetchedBoundaryIds = useRef<Set<string>>(new Set());
  const [outsideServiceArea, setOutsideServiceArea] = useState(false);

  // Fetch boundaries for all service locations once they load
  useEffect(() => {
    if (!serviceLocations?.length) return;

    const fetchBoundaries = async () => {
      const newBoundaries: LocationBoundary[] = [];

      for (const loc of serviceLocations) {
        if (!loc.lat || !loc.lng || fetchedBoundaryIds.current.has(loc.id)) continue;
        fetchedBoundaryIds.current.add(loc.id);

        try {
          // Small delay between requests to respect Nominatim rate limit
          await new Promise((r) => setTimeout(r, 300));
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=8&polygon_geojson=1&addressdetails=1`,
          );
          const data = await res.json();

          if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
            const areaName = data.address?.county || data.address?.state_district || data.address?.city || data.address?.town || loc.address;
            newBoundaries.push({
              id: loc.id,
              name: areaName,
              geojson: {
                type: 'Feature',
                geometry: data.geojson,
                properties: { name: areaName, address: loc.address },
              },
            });
          }
        } catch {
          // skip failed fetches
        }
      }

      if (newBoundaries.length > 0) {
        setServiceAreaBoundaries((prev) => [...prev, ...newBoundaries]);
      }
    };

    fetchBoundaries();
  }, [serviceLocations]);

  // Check if selected point is inside any service area
  useEffect(() => {
    if (coords.lat === 0 && coords.lng === 0) {
      setOutsideServiceArea(false);
      onServiceAreaCheck(false);
      return;
    }
    if (serviceAreaBoundaries.length === 0) return; // boundaries not loaded yet
    const isOutside = !isPointInServiceAreas(coords.lat, coords.lng, serviceAreaBoundaries);
    setOutsideServiceArea(isOutside);
    onServiceAreaCheck(isOutside);
  }, [coords.lat, coords.lng, serviceAreaBoundaries, onServiceAreaCheck]);

  const fetchBoundaryForPoint = useCallback(async (pointLat: number, pointLng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pointLat}&lon=${pointLng}&zoom=10&polygon_geojson=1&addressdetails=1`,
      );
      const data = await res.json();

      if (data.geojson && (data.geojson.type === 'Polygon' || data.geojson.type === 'MultiPolygon')) {
        setBoundaryData(data.geojson);
        setBoundaryName(data.address?.city || data.address?.town || data.address?.village || data.address?.county || '');
        boundaryKeyRef.current += 1;
      }

      if (data.display_name) {
        setMapAddress(data.display_name);
        onChange(pointLat, pointLng, data.display_name);
      } else {
        onChange(pointLat, pointLng, mapAddress);
      }
    } catch {
      onChange(pointLat, pointLng, mapAddress);
    }
  }, [onChange, mapAddress]);

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
          label: r.display_name,
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
    fetchBoundaryForPoint(selectedLat, selectedLng);
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
        message.success('Location detected!');
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

  const boundaryFeature = boundaryData
    ? { type: 'Feature' as const, geometry: boundaryData, properties: { name: boundaryName } }
    : null;

  return (
    <Card
      title={
        <Space>
          <EnvironmentOutlined />
          Service Location
          <span style={{ color: '#ff4d4f' }}>*</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Text strong style={{ display: 'block', marginBottom: 6 }}>Search Address:</Text>
      <AutoComplete
        value={mapAddress}
        options={suggestions}
        onSearch={handleAddressType}
        onSelect={handleSelectSuggestion}
        filterOption={false}
        placeholder="Search address..."
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

      <div style={{ height: 350, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
        <MapContainer
          center={[coords.lat || 25.276987, coords.lng || 55.296249]}
          zoom={coords.lat && coords.lng ? 14 : 3}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitServiceBounds locations={serviceLocations} />
          <MapUpdater lat={coords.lat} lng={coords.lng} />
          <MapClickHandler onMapClick={handleMapClick} />

          {boundaryFeature && (
            <GeoJSON
              key={boundaryKeyRef.current}
              data={boundaryFeature as GeoJSON.Feature}
              style={boundaryStyle}
            />
          )}

          {/* Service area boundaries — green polygons */}
          {serviceAreaBoundaries.map((boundary) => (
            <GeoJSON
              key={`boundary-${boundary.id}`}
              data={boundary.geojson}
              style={serviceAreaStyle}
              onEachFeature={(_feature, layer) => {
                layer.bindTooltip(
                  `<strong>${boundary.name}</strong><br/><span style="color:#52c41a">Service Available District</span>`,
                  { sticky: true },
                );
              }}
            />
          ))}

          {/* Service available locations — green markers */}
          {serviceLocations?.map((loc) =>
            loc.lat && loc.lng ? (
              <CircleMarker
                key={loc.id}
                center={[Number(loc.lat), Number(loc.lng)]}
                radius={10}
                pathOptions={{
                  color: '#52c41a',
                  weight: 3,
                  fillColor: '#b7eb8f',
                  fillOpacity: 0.5,
                }}
                eventHandlers={{
                  click: () => {
                    const lat = Number(loc.lat);
                    const lng = Number(loc.lng);
                    setCoords({ lat, lng });
                    setMapAddress(loc.address);
                    onChange(lat, lng, loc.address);
                    message.success(`Selected: ${loc.address}`);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} permanent={false}>
                  <span style={{ fontWeight: 600 }}>{loc.address}</span>
                  <br />
                  <span style={{ fontSize: 11, color: '#52c41a' }}>Service Available</span>
                </Tooltip>
                <Popup>
                  <strong>{loc.address}</strong>
                  <br />
                  <span style={{ color: '#52c41a' }}>Click to select this location</span>
                </Popup>
              </CircleMarker>
            ) : null,
          )}

          {/* User-selected draggable marker */}
          {coords.lat !== 0 && coords.lng !== 0 && (
            <DraggableMarker lat={coords.lat} lng={coords.lng} onDragEnd={handleMarkerDrag} />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        <Space size={4}>
          <div style={{ width: 18, height: 14, border: '3px dashed #52c41a', background: 'rgba(183,235,143,0.15)', borderRadius: 3 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Service Available District</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '3px solid #52c41a', background: '#b7eb8f' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Service Location</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 14, height: 20, background: `url(https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png) center/contain no-repeat` }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Your Selected Location</Text>
        </Space>
      </div>

      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
        Green borders show service available districts. Click a green marker to select it, or search/click the map for a custom location.
      </Text>

      {coords.lat !== 0 && coords.lng !== 0 && (
        <>
          {outsideServiceArea ? (
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
              <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>
                This location is outside our service area. Please select a location within a green highlighted district.
              </Text>
              <br />
              <Text style={{ fontSize: 12, color: '#ff4d4f' }}>
                Selected: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                {boundaryName && ` (${boundaryName})`}
              </Text>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                Location is within service area
              </Text>
              <br />
              <Text style={{ fontSize: 12 }}>
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                {boundaryName && <Text type="secondary" style={{ marginLeft: 8 }}>(in {boundaryName})</Text>}
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// --- Status helpers ---

const srStatusColors: Record<string, string> = {
  new: 'blue',
  triaged: 'cyan',
  estimated: 'gold',
  approved: 'green',
  converted_to_wo: 'purple',
  closed: 'default',
  spam: 'red',
};

const woStatusColors: Record<string, string> = {
  new: 'blue',
  estimated: 'gold',
  approved: 'green',
  scheduled: 'cyan',
  in_progress: 'processing',
  on_hold: 'orange',
  completed: 'green',
  closed: 'default',
  cancelled: 'red',
};

const srStatusSteps = [
  { key: 'new', label: 'New' },
  { key: 'approved', label: 'Approved' },
  { key: 'estimated', label: 'Estimated' },
  { key: 'converted_to_wo', label: 'Convert to WO' },
  { key: 'closed', label: 'Closed' },
];

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// --- Track Request Component ---

interface TrackResult {
  service_request: {
    id: string;
    request_number: string;
    subject: string;
    description: string | null;
    status: string;
    priority: string;
    category: string | null;
    channel: string;
    contact?: { first_name: string; last_name: string; email: string; phone: string };
    location?: { address: string };
    created_at: string;
    updated_at: string;
  };
  work_orders: {
    id: string;
    wo_number: string;
    status: string;
    summary: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    created_at: string;
  }[];
}

function TrackRequestSection() {
  const [trackId, setTrackId] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);
  const [trackError, setTrackError] = useState('');

  const handleTrack = () => {
    const id = trackId.trim().toUpperCase();
    if (!id) {
      message.warning('Please enter your Request ID (e.g. SR-000005)');
      return;
    }
    setLoading(true);
    setTrackError('');
    setTrackResult(null);
    api
      .get(`/customer-portal/track/${encodeURIComponent(id)}`)
      .then((res) => {
        setTrackResult(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        const errMsg = err?.response?.data?.message || 'Service request not found. Please check your Request ID.';
        setTrackError(errMsg);
      });
  };

  const sr = trackResult?.service_request;
  const currentStepIndex = sr ? srStatusSteps.findIndex((s) => s.key === sr.status) : -1;

  return (
    <div>
      {/* Search Box */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <FileSearchOutlined style={{ fontSize: 36, color: '#667eea', marginBottom: 8 }} />
          <Title level={4} style={{ margin: 0 }}>Track Your Service Request</Title>
          <Text type="secondary">Enter your Request ID to check status and details</Text>
        </div>
        <Input.Search
          placeholder="Enter Request ID (e.g. SR-000005)"
          enterButton={<><SearchOutlined /> Track</>}
          size="large"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value.toUpperCase())}
          onSearch={handleTrack}
          loading={loading}
          style={{ maxWidth: 500, margin: '0 auto', display: 'block' }}
        />
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}><Text type="secondary">Looking up your request...</Text></div>
        </div>
      )}

      {/* Error */}
      {trackError && !loading && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="danger" style={{ fontSize: 15 }}>{trackError}</Text>}
          />
        </Card>
      )}

      {/* Result */}
      {sr && !loading && (
        <>
          {/* Status Progress */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 22, fontFamily: 'monospace', color: '#1890ff' }}>
                {sr.request_number}
              </Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={srStatusColors[sr.status] || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>
                  {formatStatus(sr.status)}
                </Tag>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {srStatusSteps.map((step, idx) => {
                const isDone = currentStepIndex >= 0 && idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isSpam = sr.status === 'spam';
                const dotColor = isSpam ? '#ff4d4f' : isDone ? '#52c41a' : '#d9d9d9';
                const lineColor = isSpam ? '#ffccc7' : (currentStepIndex >= 0 && idx < currentStepIndex) ? '#52c41a' : '#e8e8e8';
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: idx < srStatusSteps.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                      <div
                        style={{
                          width: isCurrent ? 28 : 20,
                          height: isCurrent ? 28 : 20,
                          borderRadius: '50%',
                          background: dotColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s',
                          boxShadow: isCurrent ? `0 0 0 4px ${isSpam ? '#fff1f0' : '#f6ffed'}` : 'none',
                        }}
                      >
                        {isDone && (
                          <CheckCircleOutlined style={{ color: '#fff', fontSize: isCurrent ? 16 : 12 }} />
                        )}
                      </div>
                      <Text
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: isCurrent ? 700 : 400,
                          color: isDone ? '#333' : '#999',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {step.label}
                      </Text>
                    </div>
                    {idx < srStatusSteps.length - 1 && (
                      <div style={{ flex: 1, height: 3, background: lineColor, borderRadius: 2, margin: '0 4px', marginBottom: 18, transition: 'background 0.3s' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Request Details */}
          <Card title="Request Details" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Request ID">
                <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>{sr.request_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={srStatusColors[sr.status] || 'default'}>{formatStatus(sr.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Subject" span={2}>{sr.subject}</Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={sr.priority === 'critical' ? 'red' : sr.priority === 'high' ? 'orange' : sr.priority === 'medium' ? 'blue' : 'default'}>
                  {sr.priority?.charAt(0).toUpperCase() + sr.priority?.slice(1)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Category">{sr.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="Channel">
                <Tag>{sr.channel?.charAt(0).toUpperCase() + sr.channel?.slice(1)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Location">{sr.location?.address || '-'}</Descriptions.Item>
              {sr.description && (
                <Descriptions.Item label="Description" span={2}>{sr.description}</Descriptions.Item>
              )}
              <Descriptions.Item label="Submitted">
                {new Date(sr.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {new Date(sr.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Contact Info */}
          {sr.contact && (
            <Card title="Contact Information" style={{ marginBottom: 16 }}>
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="Name">
                  {sr.contact.first_name} {sr.contact.last_name}
                </Descriptions.Item>
                <Descriptions.Item label="Email">{sr.contact.email}</Descriptions.Item>
                <Descriptions.Item label="Phone">{sr.contact.phone || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Work Orders */}
          {trackResult.work_orders.length > 0 && (
            <Card title={<Space><ToolOutlined /> Work Orders</Space>}>
              {trackResult.work_orders.map((wo) => (
                <Card
                  key={wo.id}
                  type="inner"
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={
                    <Space>
                      <Text strong style={{ fontFamily: 'monospace' }}>{wo.wo_number}</Text>
                      <Tag color={woStatusColors[wo.status] || 'default'}>{formatStatus(wo.status)}</Tag>
                    </Space>
                  }
                >
                  {wo.summary && <Text>{wo.summary}</Text>}
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    {wo.scheduled_start && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined /> Scheduled: {new Date(wo.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </Col>
                    )}
                    {wo.actual_start && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <CheckCircleOutlined /> Actual: {new Date(wo.actual_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {wo.actual_end && ` — ${new Date(wo.actual_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                      </Col>
                    )}
                  </Row>
                </Card>
              ))}
            </Card>
          )}

          {trackResult.work_orders.length === 0 && (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No work orders assigned yet"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// --- Work Order Detail Component ---

const woStatusSteps = [
  { key: 'new', label: 'New' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Closed' },
];

interface WoLineItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  total: number;
}

interface WoNote {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

interface WoAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  photo_type: string;
  created_at: string;
}

interface WoTechSession {
  step: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  trip_started_at: string | null;
  reached_at: string | null;
  items_confirmed_at: string | null;
  call_confirmed_at: string | null;
  work_started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  before_photos_at: string | null;
  after_photos_at: string | null;
  customer_rating: number | null;
  customer_feedback: string | null;
  finished_at: string | null;
}

interface WoReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface WoDetailResult {
  work_order: {
    id: string;
    wo_number: string;
    status: string;
    priority: string;
    category: string | null;
    summary: string;
    description: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    tags: string[] | null;
    contact?: { first_name: string; last_name: string; email: string; phone: string };
    location?: { address: string; lat: number; lng: number };
    created_at: string;
    updated_at: string;
  };
  service_request: { id: string; request_number: string; subject: string; status: string } | null;
  appointments: {
    id: string;
    status: string;
    technician: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    notes: string | null;
    created_at: string;
  }[];
  line_items: WoLineItem[];
  notes: WoNote[];
  attachments: WoAttachment[];
  technician_session: WoTechSession | null;
  review: WoReview | null;
}

// --- Field Progress Step Definitions ---
interface FieldStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  getTs: (s: WoTechSession) => string | null | undefined;
}

const FIELD_STEPS: FieldStep[] = [
  { key: 'pending_approval', label: 'Job Assigned', icon: <ClockCircleOutlined />, getTs: (s) => s.created_at },
  { key: 'approved', label: 'Job Accepted', icon: <CheckCircleOutlined />, getTs: (s) => s.approved_at },
  { key: 'trip_started', label: 'Trip Started', icon: <CarOutlined />, getTs: (s) => s.trip_started_at },
  { key: 'reached', label: 'Arrived at Site', icon: <EnvironmentOutlined />, getTs: (s) => s.reached_at },
  { key: 'items_confirmed', label: 'Items Verified', icon: <UnorderedListOutlined />, getTs: (s) => s.items_confirmed_at },
  { key: 'call_confirmed', label: 'Client Called', icon: <PhoneOutlined />, getTs: (s) => s.call_confirmed_at },
  { key: 'work_started', label: 'Work Started', icon: <ToolOutlined />, getTs: (s) => s.work_started_at },
  { key: 'after_photos', label: 'Photos Captured', icon: <CameraOutlined />, getTs: (s) => s.before_photos_at || s.after_photos_at },
  { key: 'feedback_collected', label: 'Feedback Collected', icon: <SmileOutlined />, getTs: (s) => s.after_photos_at },
  { key: 'finished', label: 'Job Complete', icon: <TrophyOutlined />, getTs: (s) => s.finished_at },
];

const FIELD_STEP_ORDER = [
  'pending_approval', 'approved', 'trip_started', 'reached',
  'items_confirmed', 'call_confirmed', 'work_started', 'paused',
  'after_photos', 'feedback_collected', 'finished',
];

function getFieldStepStatus(itemStep: string, currentStep: string): 'done' | 'active' | 'pending' {
  if (currentStep === 'rejected') {
    return itemStep === 'pending_approval' ? 'done' : 'pending';
  }
  const itemIdx = FIELD_STEP_ORDER.indexOf(itemStep);
  const currIdx = FIELD_STEP_ORDER.indexOf(currentStep);
  if (itemIdx < currIdx) return 'done';
  if (itemIdx === currIdx) return 'active';
  return 'pending';
}

function TrackWorkOrderSection() {
  const [woId, setWoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [woResult, setWoResult] = useState<WoDetailResult | null>(null);
  const [woError, setWoError] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleTrack = (value?: string) => {
    const id = (value || woId).trim().toUpperCase();
    if (!id) {
      message.warning('Please enter your Work Order ID (e.g. WO-000001)');
      return;
    }
    setWoId(id);
    setLoading(true);
    setWoError('');
    setWoResult(null);
    api
      .get(`/customer-portal/work-orders/${encodeURIComponent(id)}`)
      .then((res) => {
        setWoResult(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        const errMsg = err?.response?.data?.message || 'Work order not found. Please check your Work Order ID.';
        setWoError(errMsg);
      });
  };

  const handleSubmitFeedback = () => {
    if (!woResult || !feedbackRating) {
      message.warning('Please select a rating.');
      return;
    }
    setFeedbackSubmitting(true);
    api
      .post(`/customer-portal/work-orders/${encodeURIComponent(woResult.work_order.wo_number)}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment || undefined,
      })
      .then(() => {
        setFeedbackSubmitting(false);
        setFeedbackSubmitted(true);
        message.success('Thank you for your feedback!');
        // Update local state so the review shows
        setWoResult((prev) => prev ? {
          ...prev,
          review: { id: '', rating: feedbackRating, comment: feedbackComment || null, created_at: new Date().toISOString() },
        } : prev);
      })
      .catch((err) => {
        setFeedbackSubmitting(false);
        const errMsg = err?.response?.data?.message || 'Failed to submit feedback.';
        message.error(errMsg);
      });
  };

  const wo = woResult?.work_order;
  const currentWoStep = wo ? woStatusSteps.findIndex((s) => s.key === wo.status) : -1;
  const techSession = woResult?.technician_session;
  // Show main tabs after Job Accepted (approved step or beyond)
  const jobAcceptedSteps = ['approved', 'trip_started', 'reached', 'items_confirmed', 'call_confirmed', 'work_started', 'paused', 'after_photos', 'feedback_collected', 'finished'];
  const isJobAccepted = techSession ? jobAcceptedSteps.includes(techSession.step) : false;
  // Show Feedback tab only after feedback_collected or finished
  const isFeedbackReady = techSession ? ['feedback_collected', 'finished'].includes(techSession.step) : false;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div>
      {/* Search Box */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <ToolOutlined style={{ fontSize: 36, color: '#667eea', marginBottom: 8 }} />
          <Title level={4} style={{ margin: 0 }}>Track Your Work Order</Title>
          <Text type="secondary">Enter your Work Order ID to check status and details</Text>
        </div>
        <Input.Search
          placeholder="Enter Work Order ID (e.g. WO-000001)"
          enterButton={<><SearchOutlined /> Track</>}
          size="large"
          value={woId}
          onChange={(e) => setWoId(e.target.value.toUpperCase())}
          onSearch={handleTrack}
          loading={loading}
          style={{ maxWidth: 500, margin: '0 auto', display: 'block' }}
        />
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}><Text type="secondary">Looking up your work order...</Text></div>
        </div>
      )}

      {woError && !loading && (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="danger" style={{ fontSize: 15 }}>{woError}</Text>} />
        </Card>
      )}

      {wo && !loading && (
        <>
          {/* Status Progress */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text strong style={{ fontSize: 22, fontFamily: 'monospace', color: '#1890ff' }}>{wo.wo_number}</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={woStatusColors[wo.status] || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>
                  {formatStatus(wo.status)}
                </Tag>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {woStatusSteps.map((step, idx) => {
                const isDone = currentWoStep >= 0 && idx <= currentWoStep;
                const isCurrent = idx === currentWoStep;
                const isCancelled = wo.status === 'cancelled';
                const dotColor = isCancelled ? '#ff4d4f' : isDone ? '#52c41a' : '#d9d9d9';
                const lineColor = isCancelled ? '#ffccc7' : (currentWoStep >= 0 && idx < currentWoStep) ? '#52c41a' : '#e8e8e8';
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: idx < woStatusSteps.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                      <div style={{
                        width: isCurrent ? 28 : 20, height: isCurrent ? 28 : 20, borderRadius: '50%', background: dotColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s',
                        boxShadow: isCurrent ? `0 0 0 4px ${isCancelled ? '#fff1f0' : '#f6ffed'}` : 'none',
                      }}>
                        {isDone && <CheckCircleOutlined style={{ color: '#fff', fontSize: isCurrent ? 16 : 12 }} />}
                      </div>
                      <Text style={{ fontSize: 11, marginTop: 4, fontWeight: isCurrent ? 700 : 400, color: isDone ? '#333' : '#999', whiteSpace: 'nowrap' }}>
                        {step.label}
                      </Text>
                    </div>
                    {idx < woStatusSteps.length - 1 && (
                      <div style={{ flex: 1, height: 3, background: lineColor, borderRadius: 2, margin: '0 4px', marginBottom: 18, transition: 'background 0.3s' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Linked SR */}
          {woResult.service_request && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <FileSearchOutlined />
                <Text type="secondary">Linked Request:</Text>
                <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>{woResult.service_request.request_number}</Text>
                <Text>{woResult.service_request.subject}</Text>
                <Tag color={srStatusColors[woResult.service_request.status] || 'default'}>{formatStatus(woResult.service_request.status)}</Tag>
              </Space>
            </Card>
          )}

          {/* Tabbed Detail Sections */}
          <Card>
            <Tabs
              defaultActiveKey="details"
              items={[
                {
                  key: 'details',
                  label: <span><FileTextOutlined /> Details</span>,
                  children: (
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                      <Descriptions.Item label="WO Number">
                        <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>{wo.wo_number}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={woStatusColors[wo.status] || 'default'}>{formatStatus(wo.status)}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Summary" span={2}>{wo.summary}</Descriptions.Item>
                      <Descriptions.Item label="Priority">
                        <Tag color={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'orange' : wo.priority === 'medium' ? 'blue' : 'default'}>
                          {wo.priority?.charAt(0).toUpperCase() + wo.priority?.slice(1)}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Category">{wo.category || '-'}</Descriptions.Item>
                      {wo.description && <Descriptions.Item label="Description" span={2}>{wo.description}</Descriptions.Item>}
                      <Descriptions.Item label="Location">{wo.location?.address || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Customer">
                        {wo.contact ? `${wo.contact.first_name} ${wo.contact.last_name}` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Scheduled Date">{fmtDate(wo.scheduled_start)}</Descriptions.Item>
                      <Descriptions.Item label="Actual Start">{fmtDate(wo.actual_start)}</Descriptions.Item>
                      <Descriptions.Item label="Actual End">{fmtDate(wo.actual_end)}</Descriptions.Item>
                      <Descriptions.Item label="Created">{fmtDate(wo.created_at)}</Descriptions.Item>
                      <Descriptions.Item label="Last Updated">{fmtDate(wo.updated_at)}</Descriptions.Item>
                      {wo.tags && wo.tags.length > 0 && (
                        <Descriptions.Item label="Tags" span={2}>
                          {wo.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  ),
                },
                ...(isJobAccepted ? [{
                  key: 'workflow',
                  label: <span><ClockCircleOutlined /> Field Progress</span>,
                  children: techSession ? (() => {
                    const currentStep = techSession.step;
                    // Build display steps with optional pause/resume
                    const displaySteps: { key: string; label: string; icon: React.ReactNode; ts: string | null | undefined }[] = [];
                    for (const def of FIELD_STEPS) {
                      displaySteps.push({ key: def.key, label: def.label, icon: def.icon, ts: def.getTs(techSession) });
                      if (def.key === 'work_started' && techSession.paused_at) {
                        displaySteps.push({ key: 'paused', label: 'Work Paused', icon: <PauseCircleOutlined />, ts: techSession.paused_at });
                      }
                      if (def.key === 'work_started' && techSession.resumed_at) {
                        displaySteps.push({ key: 'resumed', label: 'Work Resumed', icon: <PlayCircleOutlined />, ts: techSession.resumed_at });
                      }
                    }
                    const doneCount = FIELD_STEPS.filter((s) => getFieldStepStatus(s.key, currentStep) === 'done').length;
                    const progressPct = Math.round((doneCount / FIELD_STEPS.length) * 100);

                    return (
                      <div>
                        {/* Header */}
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 14 }}>Field Progress</Text>
                          <div><Text type="secondary" style={{ fontSize: 12 }}>{doneCount} of {FIELD_STEPS.length} steps done</Text></div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${progressPct}%`,
                              background: currentStep === 'finished'
                                ? 'linear-gradient(90deg, #52c41a, #73d13d)'
                                : 'linear-gradient(90deg, #52c41a, #95de64)',
                              borderRadius: 4,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>{progressPct}% complete</Text>
                        </div>

                        {/* Timeline Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {displaySteps.map((item, idx) => {
                            const status = getFieldStepStatus(item.key, currentStep);
                            const isLast = idx === displaySteps.length - 1;
                            const dotColor = status === 'done' ? '#52c41a' : status === 'active' ? '#1677ff' : '#d9d9d9';
                            const dotBg = status === 'done' ? '#f6ffed' : status === 'active' ? '#e6f4ff' : '#fafafa';

                            return (
                              <div key={`${item.key}-${idx}`} style={{ display: 'flex', gap: 0 }}>
                                {/* Dot + connector */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                                  <div style={{
                                    width: 30, height: 30, borderRadius: '50%',
                                    background: dotBg, border: `2px solid ${dotColor}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: dotColor, fontSize: 13, flexShrink: 0,
                                    zIndex: 1,
                                    boxShadow: status === 'active' ? '0 0 0 3px rgba(22,119,255,0.15)' : 'none',
                                    transition: 'all 0.3s',
                                  }}>
                                    {status === 'done'
                                      ? <CheckCircleOutlined style={{ fontSize: 14 }} />
                                      : item.icon
                                    }
                                  </div>
                                  {!isLast && (
                                    <div style={{
                                      width: 2, flex: 1, minHeight: 20,
                                      background: status === 'done' ? '#52c41a' : '#f0f0f0',
                                      margin: '2px 0', transition: 'background 0.3s',
                                    }} />
                                  )}
                                </div>
                                {/* Label + timestamp */}
                                <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 14, paddingTop: 4 }}>
                                  <Text style={{
                                    fontSize: 14, fontWeight: status === 'active' ? 600 : 400,
                                    color: status === 'pending' ? '#bfbfbf' : status === 'active' ? '#1677ff' : '#262626',
                                    display: 'block', lineHeight: '22px',
                                  }}>
                                    {item.label}
                                  </Text>
                                  {item.ts && (
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                      {fmtDate(item.ts)}
                                    </Text>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    );
                  })() : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Field workflow not started yet" />
                  ),
                },
                {
                  key: 'line-items',
                  label: <span><UnorderedListOutlined /> Line Items {woResult.line_items?.length ? `(${woResult.line_items.length})` : ''}</span>,
                  children: woResult.line_items && woResult.line_items.length > 0 ? (
                    <>
                      <Table
                        dataSource={woResult.line_items}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: 'Type',
                            dataIndex: 'type',
                            key: 'type',
                            width: 90,
                            render: (type: string) => (
                              <Tag color={type === 'service' ? 'blue' : type === 'part' ? 'green' : 'orange'}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Item',
                            dataIndex: 'name',
                            key: 'name',
                            render: (name: string, record: WoLineItem) => (
                              <div>
                                <Text strong>{name}</Text>
                                {record.description && (
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text></div>
                                )}
                              </div>
                            ),
                          },
                          {
                            title: 'Qty',
                            dataIndex: 'quantity',
                            key: 'quantity',
                            width: 60,
                            align: 'center' as const,
                          },
                          {
                            title: 'Unit Price',
                            dataIndex: 'unit_price',
                            key: 'unit_price',
                            width: 100,
                            align: 'right' as const,
                            render: (v: number) => `$${v.toFixed(2)}`,
                          },
                          {
                            title: 'Total',
                            dataIndex: 'total',
                            key: 'total',
                            width: 100,
                            align: 'right' as const,
                            render: (v: number) => <Text strong>${v.toFixed(2)}</Text>,
                          },
                        ]}
                      />
                      <div style={{ textAlign: 'right', marginTop: 12, padding: '8px 16px', background: '#fafafa', borderRadius: 6 }}>
                        <Text strong style={{ fontSize: 16 }}>
                          Total: ${woResult.line_items.reduce((sum, li) => sum + li.total, 0).toFixed(2)}
                        </Text>
                      </div>
                    </>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No line items" />
                  ),
                },
                {
                  key: 'notes',
                  label: <span><CommentOutlined /> Notes {woResult.notes?.length ? `(${woResult.notes.length})` : ''}</span>,
                  children: woResult.notes && woResult.notes.length > 0 ? (
                    <div>
                      {woResult.notes.map((note) => (
                        <Card key={note.id} type="inner" size="small" style={{ marginBottom: 12 }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text>{note.content}</Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              By: <Text strong style={{ fontSize: 12 }}>{note.author}</Text>
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {fmtDate(note.created_at)}
                            </Text>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notes available" />
                  ),
                },
                {
                  key: 'attachments',
                  label: <span><PaperClipOutlined /> Attachments {woResult.attachments?.length ? `(${woResult.attachments.length})` : ''}</span>,
                  children: woResult.attachments && woResult.attachments.length > 0 ? (
                    <Row gutter={[12, 12]}>
                      {woResult.attachments.map((att) => {
                        const isImage = att.file_type?.startsWith('image/');
                        const fileSize = att.file_size
                          ? att.file_size > 1048576
                            ? `${(att.file_size / 1048576).toFixed(1)} MB`
                            : `${(att.file_size / 1024).toFixed(0)} KB`
                          : '';
                        const photoLabel = att.photo_type === 'before_work' ? 'Before Work'
                          : att.photo_type === 'after_work' ? 'After Work' : '';

                        return (
                          <Col key={att.id} xs={24} sm={12}>
                            <Card
                              type="inner"
                              size="small"
                              hoverable
                              style={{ cursor: 'pointer' }}
                              onClick={() => window.open(att.file_url, '_blank')}
                            >
                              <Space>
                                {isImage ? (
                                  <PictureOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                ) : (
                                  <FileTextOutlined style={{ fontSize: 24, color: '#666' }} />
                                )}
                                <div>
                                  <Text strong style={{ fontSize: 13 }}>{att.file_name}</Text>
                                  <div>
                                    {photoLabel && <Tag color="blue" style={{ fontSize: 10 }}>{photoLabel}</Tag>}
                                    {fileSize && <Text type="secondary" style={{ fontSize: 11 }}>{fileSize}</Text>}
                                  </div>
                                </div>
                                <DownloadOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                              </Space>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attachments" />
                  ),
                }] : []),
                ...(isFeedbackReady ? [{
                  key: 'feedback',
                  label: <span><SmileOutlined /> Feedback</span>,
                  children: (
                    <div>
                      {/* Show existing review if already submitted */}
                      {(woResult.review || feedbackSubmitted) ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 16 }}>Thank you for your feedback!</Text>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarFilled
                                key={i}
                                style={{
                                  color: i < (woResult.review?.rating || feedbackRating) ? '#faad14' : '#e8e8e8',
                                  fontSize: 24,
                                  marginRight: 4,
                                }}
                              />
                            ))}
                          </div>
                          {(woResult.review?.comment || feedbackComment) && (
                            <Card type="inner" size="small" style={{ maxWidth: 400, margin: '12px auto', textAlign: 'left' }}>
                              <Text>{woResult.review?.comment || feedbackComment}</Text>
                            </Card>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Submitted on {fmtDate(woResult.review?.created_at || new Date().toISOString())}
                          </Text>
                        </div>
                      ) : (
                        <div style={{ maxWidth: 480, margin: '0 auto' }}>
                          <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <SmileOutlined style={{ fontSize: 40, color: '#faad14', marginBottom: 8 }} />
                            <div><Text strong style={{ fontSize: 16 }}>How was your experience?</Text></div>
                            <Text type="secondary">Your feedback helps us improve our service</Text>
                          </div>

                          <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Rating</Text>
                            <Rate
                              value={feedbackRating}
                              onChange={setFeedbackRating}
                              style={{ fontSize: 36 }}
                            />
                          </div>

                          <div style={{ marginBottom: 20 }}>
                            <Text style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Comments (optional)</Text>
                            <Input.TextArea
                              rows={4}
                              placeholder="Tell us about your experience..."
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                            />
                          </div>

                          <Button
                            type="primary"
                            size="large"
                            block
                            icon={<SendOutlined />}
                            loading={feedbackSubmitting}
                            disabled={!feedbackRating}
                            onClick={handleSubmitFeedback}
                            style={{
                              height: 44,
                              ...(feedbackRating ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' } : {}),
                            }}
                          >
                            Submit Feedback
                          </Button>
                        </div>
                      )}
                    </div>
                  ),
                }] : []),
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}

// --- Main Page ---

export default function PortalDashboardPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState('');
  const [isOutsideService, setIsOutsideService] = useState(false);

  const handleMapChange = useCallback((lat: number, lng: number, address: string) => {
    form.setFieldsValue({ lat, lng, address });
  }, [form]);

  const handleServiceAreaCheck = useCallback((isOutside: boolean) => {
    setIsOutsideService(isOutside);
  }, []);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!values.lat || !values.lng) {
        message.warning('Please pick a location on the map.');
        return;
      }
      if (isOutsideService) {
        message.error('Selected location is outside our service area. Please choose a location within a green highlighted district.');
        return;
      }
      setSubmitting(true);
      api
        .post('/customer-portal/service-requests', {
          subject: values.subject,
          description: values.description,
          category: values.category,
          priority: values.priority,
          contact_name: values.contact_name,
          contact_email: values.contact_email,
          contact_phone: values.contact_phone,
          lat: Number(values.lat),
          lng: Number(values.lng),
          address: values.address || '',
        })
        .then((res) => {
          setSubmitting(false);
          setSubmitted(true);
          setSubmittedRequestNumber(res.data?.data?.request_number || '');
          message.success('Service request submitted successfully!');
        })
        .catch((err) => {
          setSubmitting(false);
          const errMsg = err?.response?.data?.message || 'Failed to submit service request. Please try again.';
          message.error(errMsg);
        });
    });
  };

  const handleSubmitAnother = () => {
    form.resetFields();
    setSubmitted(false);
    setSubmittedRequestNumber('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '40px 16px',
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CustomerServiceOutlined
            style={{ fontSize: 48, color: '#667eea', marginBottom: 12 }}
          />
          <Title level={2} style={{ margin: 0 }}>
            Customer Portal
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Submit a new request or track an existing one
          </Text>
        </div>

        <Tabs
          defaultActiveKey="request"
          centered
          size="large"
          items={[
            {
              key: 'request',
              label: <span><SendOutlined /> Request a Service</span>,
              children: (
                <>
                  {/* Success State */}
                  {submitted ? (
          <Card>
            <Result
              status="success"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="Service Request Submitted!"
              subTitle={
                <>
                  {submittedRequestNumber && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 18, fontFamily: 'monospace', color: '#1890ff' }}>
                        {submittedRequestNumber}
                      </Text>
                    </div>
                  )}
                  Thank you for reaching out. Our team will review your request and contact you soon.
                </>
              }
              extra={[
                <Button
                  key="another"
                  type="primary"
                  onClick={handleSubmitAnother}
                >
                  Submit Another Request
                </Button>,
              ]}
            />
          </Card>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ lat: null, lng: null }}>
            {/* Service Details */}
            <Card style={{ marginBottom: 16 }}>
              <Form.Item
                label="Subject"
                name="subject"
                rules={[{ required: true, message: 'Please enter a subject' }]}
              >
                <Input placeholder="e.g., AC Unit Not Cooling" size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Category"
                    name="category"
                    rules={[{ required: true, message: 'Please select a category' }]}
                  >
                    <Select placeholder="Select a category" size="large">
                      <Select.Option value="HVAC">HVAC</Select.Option>
                      <Select.Option value="Plumbing">Plumbing</Select.Option>
                      <Select.Option value="Electrical">Electrical</Select.Option>
                      <Select.Option value="Roofing">Roofing</Select.Option>
                      <Select.Option value="Appliance">Appliance Repair</Select.Option>
                      <Select.Option value="General">General Maintenance</Select.Option>
                      <Select.Option value="Other">Other</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                    initialValue="medium"
                    rules={[{ required: true, message: 'Please select a priority' }]}
                  >
                    <Select size="large">
                      <Select.Option value="low">Low</Select.Option>
                      <Select.Option value="medium">Medium</Select.Option>
                      <Select.Option value="high">High</Select.Option>
                      <Select.Option value="critical">Critical</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Description"
                name="description"
                rules={[{ required: true, message: 'Please describe the issue' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  size="large"
                />
              </Form.Item>
            </Card>

            {/* Contact Information */}
            <Card title="Contact Information" style={{ marginBottom: 16 }}>
              <Form.Item
                label="Full Name"
                name="contact_name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input placeholder="Your full name" size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Email"
                    name="contact_email"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' },
                    ]}
                  >
                    <Input placeholder="your@email.com" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Phone"
                    name="contact_phone"
                    rules={[{ required: true, message: 'Please enter your phone number' }]}
                  >
                    <Input placeholder="(555) 123-4567" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Map Location Picker */}
            <PortalMapPicker onChange={handleMapChange} onServiceAreaCheck={handleServiceAreaCheck} />

            {/* Hidden fields for lat/lng/address */}
            <Form.Item name="lat" hidden rules={[{ required: true, message: 'Please pick a location on the map' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lng" hidden rules={[{ required: true, message: 'Please pick a location on the map' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="address" hidden>
              <Input />
            </Form.Item>

            {/* Submit */}
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              icon={<SendOutlined />}
              loading={submitting}
              disabled={isOutsideService}
              style={{
                height: 48,
                fontSize: 16,
                ...(!isOutsideService
                  ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }
                  : {}),
              }}
            >
              {isOutsideService ? 'Location Outside Service Area' : 'Submit Service Request'}
            </Button>
          </Form>
        )}
                </>
              ),
            },
            {
              key: 'track',
              label: <span><FileSearchOutlined /> Track Request</span>,
              children: <TrackRequestSection />,
            },
            {
              key: 'track-wo',
              label: <span><ToolOutlined /> Track Work Order</span>,
              children: <TrackWorkOrderSection />,
            },
          ]}
        />

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            Need help? Contact us at{' '}
            <Text strong>support@fieldforce.com</Text>
            {' '}or call{' '}
            <Text strong>(555) 123-4567</Text>
          </Text>
        </div>
      </div>
    </div>
  );
}
