import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class RequestUploadUrlDto {
  @ApiProperty({ enum: ALLOWED_CONTENT_TYPES, example: 'image/webp' })
  @IsString({ message: 'El tipo de contenido debe ser texto' })
  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: 'Formato de imagen no soportado (use JPEG, PNG o WebP)',
  })
  contentType: (typeof ALLOWED_CONTENT_TYPES)[number];
}
