import { PartialType } from '@nestjs/swagger';
import { CreateCrewDto } from './create_crew.dto';

export class UpdateCrewDto extends PartialType(CreateCrewDto) {}
