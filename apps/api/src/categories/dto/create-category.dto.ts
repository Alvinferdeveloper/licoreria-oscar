import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Whisky' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Whiskies escoceses, irlandeses y americanos' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
