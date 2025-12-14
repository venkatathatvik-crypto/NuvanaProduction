import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTestDto } from './create-test.dto';

// Omit teacher_id and questions, make all fields optional
export class UpdateTestDto extends PartialType(
  OmitType(CreateTestDto, ['teacher_id', 'questions'] as const),
) {}
