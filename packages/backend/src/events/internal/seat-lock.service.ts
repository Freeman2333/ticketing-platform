import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';

const LOCK_TTL_MS = 10_000;

const ACQUIRE_ALL_SCRIPT = `
for i, key in ipairs(KEYS) do
  if redis.call('exists', key) == 1 then return 0 end
end
for i, key in ipairs(KEYS) do
  redis.call('set', key, ARGV[1], 'PX', ARGV[2])
end
return 1
`;

const RELEASE_ALL_SCRIPT = `
for i, key in ipairs(KEYS) do
  if redis.call('get', key) == ARGV[1] then
    redis.call('del', key)
  end
end
return 1
`;

@Injectable()
export class SeatLockService {
  constructor(private readonly redis: RedisService) {}

  private lockKey(eventId: string, seatId: string): string {
    return `lock:seat:${eventId}:${seatId}`;
  }

  async acquireAll(
    eventId: string,
    seatIds: string[],
  ): Promise<string | null> {
    const token = randomUUID();
    const keys = seatIds.map((seatId) => this.lockKey(eventId, seatId));
    const result = await this.redis.eval(
      ACQUIRE_ALL_SCRIPT,
      keys.length,
      ...keys,
      token,
      LOCK_TTL_MS,
    );
    return result === 1 ? token : null;
  }

  async releaseAll(
    eventId: string,
    seatIds: string[],
    token: string,
  ): Promise<void> {
    const keys = seatIds.map((seatId) => this.lockKey(eventId, seatId));
    await this.redis.eval(RELEASE_ALL_SCRIPT, keys.length, ...keys, token);
  }
}
