import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rateLimit';

describe('createRateLimiter', () => {
  it('blocks after max hits and recovers after the window', () => {
    let t = 0;
    const limiter = createRateLimiter(2, 1000, () => t);
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('a').ok).toBe(true);
    const blocked = limiter.check('a');
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    t = 1001;
    expect(limiter.check('a').ok).toBe(true);
  });
  it('tracks keys independently', () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('b').ok).toBe(true);
  });
});
