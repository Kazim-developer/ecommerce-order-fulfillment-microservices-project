import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryClient: ClientProxy,
  ) {}

  async reserveStock(
    productId: string,
    orderId: string,
    quantity: number,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.inventoryClient.send<{ success: boolean; message: string }>(
        'reserve_stock',
        {
          productId,
          orderId,
          quantity,
        },
      ),
    );
  }

  async releaseStock(
    productId: string,
    orderId: string,
  ): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.inventoryClient.send<{ success: boolean; message: string }>(
        'release_stock',
        {
          productId,
          orderId,
        },
      ),
    );
  }

  async create(dto: CreateOrderDto) {
    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reservedItems: { productId: string; quantity: number }[] = [];

    try {
      // Reserve stock for each item through RabbitMQ.
      for (const item of dto.items) {
        const result = await this.reserveStock(
          item.productId,
          orderId,
          item.quantity,
        );

        if (!result.success) {
          throw new Error(result.message);
        }

        reservedItems.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      // Create the order only after all reservations succeed.
      const total = dto.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      return await this.prisma.order.create({
        data: {
          id: orderId,
          total,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    } catch (error) {
      // Release any stock reserved before a later failure.
      for (const item of reservedItems.reverse()) {
        try {
          const result = await this.releaseStock(item.productId, orderId);

          if (!result.success) {
            console.error(
              `Failed to release stock for product ${item.productId}: ${result.message}`,
            );
          }
        } catch (releaseError) {
          console.error(
            `Stock release request failed for product ${item.productId}:`,
            releaseError,
          );
        }
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: {
        items: true,
      },
    });
  }
}
