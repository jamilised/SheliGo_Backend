import type { Paginado } from '../types/admin-types.js';

export class PaginationHelper {
    static offset(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    static build<T>(items: T[], total: number, page: number, limit: number): Paginado<T> {
        return {
            items,
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        };
    }
}
