import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super(process.env.REDIS_URL as string, {
      enableOfflineQueue: false,
      commandTimeout: 5000,
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
