import { Breadcrumb as AntBreadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  users: 'Users',
  contacts: 'Contacts',
  companies: 'Companies',
  assets: 'Assets',
  'service-requests': 'Service Requests',
  estimates: 'Estimates',
  'work-orders': 'Work Orders',
  'service-locations': 'Service Locations',
  scheduling: 'Scheduling',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
  workforce: 'Workforce',
  settings: 'Settings',
  agreements: 'Agreements',
  trips: 'Trips',
  history: 'History',
  notifications: 'Notifications',
  profile: 'Profile',
  create: 'Create',
  edit: 'Edit',
};

/** Detect UUID v4 segments — these are entity detail pages */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Return a friendly label for a UUID segment based on the parent resource segment */
function detailLabel(parentSegment: string): string {
  const labels: Record<string, string> = {
    'work-orders': 'Work Order Details',
    contacts: 'Contact Details',
    companies: 'Company Details',
    assets: 'Asset Details',
    'service-requests': 'Request Details',
    estimates: 'Estimate Details',
    invoices: 'Invoice Details',
    agreements: 'Agreement Details',
    'service-locations': 'Location Details',
    workforce: 'Agent Details',
  };
  return labels[parentSegment] ?? 'Details';
}

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const items = [
    {
      title: <Link to="/dashboard">Dashboard</Link>,
    },
    ...segments.map((segment, index) => {
      const path = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;

      let label: string;
      if (UUID_RE.test(segment)) {
        // UUID — show a friendly detail label based on the parent resource
        const parent = segments[index - 1] ?? '';
        label = detailLabel(parent);
      } else {
        label = routeLabels[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }

      return {
        title: isLast ? label : <Link to={path}>{label}</Link>,
      };
    }),
  ];

  return <AntBreadcrumb style={{ marginBottom: 16 }} items={items} />;
}
