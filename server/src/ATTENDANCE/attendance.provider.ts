import { REPOSITORY } from '../shared/constants/keynames';
import { AttendanceLog } from './attendance_log.entity';
import { AttendancePunch } from './attendance_punch.entity';

export const attendanceProviders = [
  { provide: REPOSITORY.ATTENDANCE_LOGS, useValue: AttendanceLog },
  { provide: REPOSITORY.ATTENDANCE_PUNCHES, useValue: AttendancePunch },
];
