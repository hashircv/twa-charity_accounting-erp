import type { BaseEntity } from "@/types/domain";
import type { Repository } from "@/services/repositories/Repository";

export class MockRepository<T extends BaseEntity> implements Repository<T> {
  constructor(
    private items: T[],
    private readonly moduleName: string,
  ) {}

  async list() {
    return this.items.filter((item) => !item.deletedAt);
  }

  async getById(id: string) {
    return this.items.find((item) => item.id === id && !item.deletedAt);
  }

  async create(entity: Omit<T, keyof BaseEntity>) {
    const now = new Date().toISOString();
    const next = {
      ...entity,
      id: `${this.moduleName}-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      updatedBy: "system",
    } as T;

    this.items = [next, ...this.items];
    return next;
  }

  async update(id: string, patch: Partial<T>) {
    const current = await this.getById(id);
    if (!current) throw new Error(`${this.moduleName} ${id} was not found`);

    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.items = this.items.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async softDelete(id: string, deletedBy: string) {
    return this.update(id, { deletedAt: new Date().toISOString(), deletedBy } as Partial<T>);
  }
}
