import { describe, it, expect } from 'vitest';

describe('Simple Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should add two numbers correctly', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(1, 2)).toBe(3);
  });

  it('should return the correct string length', () => {
    const str = 'hello';
    expect(str.length).toBe(5);
  });
});
