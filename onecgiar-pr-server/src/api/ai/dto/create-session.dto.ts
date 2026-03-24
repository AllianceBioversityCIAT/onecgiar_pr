import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({
    description: 'ID of the result being reviewed',
    example: 123,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  result_id: number;
}
