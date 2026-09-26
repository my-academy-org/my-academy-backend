import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly redis = new Redis(redisUrl);

  constructor() {
    this.redis.on('connect', () => {
      console.log('Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });
  }
  async onModuleInit() {
    const result = await this.redis.ping();

    console.log('Redis:', result);
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      return this.redis.set(key, value, 'EX', ttl);
    }

    return this.redis.set(key, value);
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async del(key: string) {
    return this.redis.del(key);
  }
}
