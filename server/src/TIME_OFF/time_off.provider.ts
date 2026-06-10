import { REPOSITORY } from '../shared/constants/keynames';
import { TimeOffRequest } from './time_off_requests.entity';
import { TimeOffBalance } from './time_off_balances.entity';

export const timeOffProviders = [
  { provide: REPOSITORY.TIME_OFF_REQUESTS, useValue: TimeOffRequest },
  { provide: REPOSITORY.TIME_OFF_BALANCES, useValue: TimeOffBalance },
];
