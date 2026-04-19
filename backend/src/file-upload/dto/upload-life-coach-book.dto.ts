import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class UploadLifeCoachBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumberString()
  @IsNotEmpty()
  categoryId: string;
}
