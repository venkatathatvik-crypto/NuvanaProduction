import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { RagService } from './rag.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('rag')
@UseGuards(RolesGuard)
export class RagController {
    private readonly logger = new Logger(RagController.name);

    constructor(private readonly ragService: RagService) {}

    /**
     * Get subjects that have uploaded PDF files for a specific class
     * This ensures the AI Tutor dropdown only shows subjects with actual materials
     */
    @Get('subjects/class/:classId')
    @Roles('student', 'teacher', 'school_admin', 'super_admin')
    async getSubjectsWithMaterials(@Param('classId') classId: string): Promise<string[]> {
        this.logger.log(`GET /rag/subjects/class/${classId} - Getting subjects with uploaded materials`);
        return this.ragService.getSubjectsWithMaterials(classId);
    }

    @Get('life-coach/categories/:schoolId')
    @Roles('student', 'school_admin', 'super_admin')
    async getLifeCoachCategories(@Param('schoolId') schoolId: string): Promise<string[]> {
        return this.ragService.getLifeCoachCategoriesWithContent(schoolId);
    }
}
