import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';

@Controller()
export class ProductsMessageController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern('reserve_stock')
  async reserveStock(
    @Payload()
    data: {
      productId: string;
      orderId: string;
      quantity: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.productsService.reserveStock(data.productId, {
        orderId: data.orderId,
        quantity: data.quantity,
      });

      return {
        success: true,
        message: 'Stock reserved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Stock reservation failed',
      };
    }
  }

  @MessagePattern('release_stock')
  async releaseStock(
    @Payload()
    data: {
      productId: string;
      orderId: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.productsService.releaseStock(data.productId, data.orderId);

      return {
        success: true,
        message: 'Stock released successfully',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Stock release failed',
      };
    }
  }
}
