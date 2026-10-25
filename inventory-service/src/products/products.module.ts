import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsMessageController } from './products.message-controller';

@Module({
  providers: [ProductsService],
  controllers: [ProductsController, ProductsMessageController],
})
export class ProductsModule {}
