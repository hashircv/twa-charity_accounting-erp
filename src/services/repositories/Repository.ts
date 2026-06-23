import type { BaseEntity } from "@/types/domain";

export interface Repository<T extends BaseEntity> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(entity: Omit<T, keyof BaseEntity>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  softDelete(id: string, deletedBy: string): Promise<T>;
}
