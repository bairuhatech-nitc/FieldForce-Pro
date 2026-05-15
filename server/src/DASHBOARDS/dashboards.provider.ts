import { Dashboard } from './dashboards.entity';
import { KEYNAMES } from '../shared/constants/keynames';

export const dashboardsProviders = [
  {
    provide: KEYNAMES.DASHBOARDS,
    useValue: Dashboard,
  },
];
