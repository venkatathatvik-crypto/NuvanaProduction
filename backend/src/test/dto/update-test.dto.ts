import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTestDto, CreateQuestionDto } from './create-test.dto';

// Omit teacher_id, make all fields optional, but include questions for updates
export class UpdateTestDto extends PartialType(
  OmitType(CreateTestDto, ['teacher_id'] as const),
) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
