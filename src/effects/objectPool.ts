export class ObjectPool<T> {
  private readonly inactive: T[] = [];

  constructor(
    private readonly createItem: () => T,
    private readonly resetItem: (item: T) => void
  ) {}

  get inactiveCount(): number {
    return this.inactive.length;
  }

  acquire(): T {
    return this.inactive.pop() ?? this.createItem();
  }

  release(item: T): void {
    this.resetItem(item);
    this.inactive.push(item);
  }
}
