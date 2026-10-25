import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsMessageController } from './products/products.message-controller';

@Module({
  imports: [ProductsModule, PrismaModule],
  controllers: [AppController, ProductsMessageController],
  providers: [AppService],
})
export class AppModule {}
