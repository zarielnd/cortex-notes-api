import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const isAlive = await this.redisService.ping();
    const result = this.getStatus(key, isAlive);

    if (!isAlive) {
      throw new HealthCheckError('Redis ping failed', result);
    }

    return result;
  }
}
