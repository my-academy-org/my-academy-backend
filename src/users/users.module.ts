import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { MailModule } from '../mail/mail.module.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [RedisModule, MailModule],
})
export class UsersModule {}
