import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import openaiConfig from './config/openai.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [openaiConfig],
        }),
        AiModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
