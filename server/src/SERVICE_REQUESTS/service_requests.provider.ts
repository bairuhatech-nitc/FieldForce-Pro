import { ServiceRequest } from './service_requests.entity';
import { KEYNAMES } from '../shared/constants/keynames';

export const serviceRequestsProviders = [
  {
    provide: KEYNAMES.SERVICE_REQUESTS,
    useValue: ServiceRequest,
  },
];
