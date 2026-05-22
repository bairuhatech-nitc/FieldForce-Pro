import { Module } from '@nestjs/common';
import { AgentLocationsController } from './agent_locations.controller';
import { AgentLocationsService } from './agent_locations.service';
import { agentLocationsProviders } from './agent_locations.provider';
import { DatabaseModule } from '../database/database.module';
import { AgentLocationsGateway } from './agent_locations.gateway';

@Module({
  imports: [DatabaseModule],
  controllers: [AgentLocationsController],
  providers: [AgentLocationsService, ...agentLocationsProviders, AgentLocationsGateway],
  exports: [AgentLocationsService],
})
export class AgentLocationsModule {}
