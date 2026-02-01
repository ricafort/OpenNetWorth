/**
 * Base definition for a Data Repository.
 * All domain entities should have a repository that extends this.
 */
export interface IRepository<T> {
    getAll(): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    create(item: T): Promise<T>;
    update(item: T): Promise<T>;
    delete(id: string): Promise<void>;
}

/**
 * Common configuration for Repository Factory
 */
export interface RepositoryConfig {
    isDemoMode: boolean;
    templateId?: string | null;
}
