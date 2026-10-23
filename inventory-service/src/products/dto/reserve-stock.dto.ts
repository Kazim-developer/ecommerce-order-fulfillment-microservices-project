import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ReserveStockDto {
  @IsString()
  @MinLength(1)
  orderId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
