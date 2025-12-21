import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('rag')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RagController {
    constructor(private readonly ragService: RagService) {}

    /**
     * Get subjects that have uploaded PDF files for a specific class
     * This ensures the AI Tutor dropdown only shows subjects with actual materials
     */
    @Get('subjects/class/:classId')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    async getSubjectsWithMaterials(@Param('classId') classId: string): Promise<string[]> {
        console.log(`[RAG Controller] GET /rag/subjects/class/${classId} - Getting subjects with uploaded materials`);
        return this.ragService.getSubjectsWithMaterials(classId);
    }
}
