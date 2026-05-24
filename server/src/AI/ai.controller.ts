import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../shared/decorator/public.decorator';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class ChatRequestDto {
    @IsString()
    message: string;

    @IsOptional()
    @IsArray()
    history?: any[];
}

@ApiTags('Public AI')
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Public()
    @Post('chat')
    @ApiOperation({ summary: 'Chat with FieldForce AI' })
    async chat(@Body() body: ChatRequestDto) {
        const history = body.history || [];
        const reply = await this.aiService.generateChatResponse(history, body.message);

        return {
            reply,
        };
    }
}