import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
