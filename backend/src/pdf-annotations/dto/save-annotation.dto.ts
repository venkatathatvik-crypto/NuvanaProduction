import { IsNotEmpty, IsNumber, IsString, IsObject } from 'class-validator';

export class SaveAnnotationDto {
  @IsString()
  @IsNotEmpty()
  file_id: string;

  @IsNumber()
  @IsNotEmpty()
  page_number: number;

  @IsNotEmpty()
  annotation_data: any;
}
