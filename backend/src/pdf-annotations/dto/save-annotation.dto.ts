import { IsNotEmpty, IsNumber, IsString, IsObject, IsDefined } from 'class-validator';

export class SaveAnnotationDto {
  @IsString()
  @IsNotEmpty()
  file_id: string;

  @IsNumber()
  @IsNotEmpty()
  page_number: number;

  @IsDefined()
  annotation_data: any;

  @IsString()
  @IsNotEmpty()
  note_type: string;
}
