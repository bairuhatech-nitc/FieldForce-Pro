import { REPOSITORY } from '../shared/constants/keynames';
import { Crew } from './crews.entity';
import { CrewMember } from './crew_members.entity';
import { CrewSkill } from './crew_skills.entity';
import { CrewEquipment } from './crew_equipment.entity';

export const crewsProviders = [
  { provide: REPOSITORY.CREWS, useValue: Crew },
  { provide: REPOSITORY.CREW_MEMBERS, useValue: CrewMember },
  { provide: REPOSITORY.CREW_SKILLS, useValue: CrewSkill },
  { provide: REPOSITORY.CREW_EQUIPMENT, useValue: CrewEquipment },
];
