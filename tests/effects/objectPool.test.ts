import { describe, expect, it } from "vitest";
import { ObjectPool } from "../../src/effects/objectPool";

type Item = { value: number; active: boolean };

describe("ObjectPool", () => {
  it("reuses released objects before creating new objects", () => {
    let created = 0;
    const pool = new ObjectPool<Item>(() => ({ value: ++created, active: false }), item => {
      item.active = false;
      item.value = 0;
    });

    const first = pool.acquire();
    first.value = 42;
    first.active = true;
    pool.release(first);

    const second = pool.acquire();
    expect(second).toBe(first);
    expect(second).toEqual({ value: 0, active: false });
    expect(created).toBe(1);
  });

  it("tracks inactive object count", () => {
    const pool = new ObjectPool<Item>(() => ({ value: 0, active: false }), item => {
      item.active = false;
    });

    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);

    expect(pool.inactiveCount).toBe(2);
  });
});
