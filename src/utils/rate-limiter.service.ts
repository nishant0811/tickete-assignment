// src/utils/rate-limiter.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private lastRefillTimestamp: number;

  constructor() {
    // Configure for 30 requests per minute
    this.maxTokens = 30;
    this.tokens = this.maxTokens;
    this.refillRate = this.maxTokens / (60 * 1000); // 30 tokens per 60000 ms
    this.lastRefillTimestamp = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTimestamp;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  async acquireToken(): Promise<void> {
    this.refillTokens();
    
    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      this.logger.warn(`Rate limit reached, waiting for ${waitTime}ms`);
      
      return new Promise(resolve => {
        setTimeout(() => {
          this.refillTokens();
          this.tokens -= 1;
          resolve();
        }, waitTime);
      });
    }
    
    this.tokens -= 1;
    return Promise.resolve();
  }
}