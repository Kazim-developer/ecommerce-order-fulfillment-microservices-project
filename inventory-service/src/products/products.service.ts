import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async releaseStock(productId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: {
          orderId_productId: {
            orderId,
            productId,
          },
        },
      });

      if (!reservation || reservation.status !== 'RESERVED') {
        return;
      }

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          availableQuantity: { increment: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
        },
      });
    });
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          unitPrice: dto.unitPrice,
          availableQuantity: dto.availableQuantity ?? 0,
        },
      });
    } catch (error: unknown) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A product with this SKU already exists');
      }

      throw error;
    }
  }

  async reserveStock(productId: string, dto: ReserveStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID "${productId}" not found`);
      }

      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          availableQuantity: { gte: dto.quantity },
        },
        data: {
          availableQuantity: { decrement: dto.quantity },
          reservedQuantity: { increment: dto.quantity },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Insufficient available stock');
      }

      return tx.reservation.create({
        data: {
          orderId: dto.orderId,
          productId,
          quantity: dto.quantity,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    // Ensure the product exists before updating it.
    await this.findOne(id);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
      });
    } catch (error: unknown) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A product with this SKU already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
