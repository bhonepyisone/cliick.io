"use strict";
// Mock Supabase client for testing - fully functional with chainable queries
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const mockDB = {
    users: [],
    shops: [],
    products: [],
    orders: [],
    conversations: [],
    conversation_messages: [],
    forms: [],
    form_submissions: [],
    payments: [],
    notifications: [],
    integrations: [],
};
const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
class QueryBuilder {
    constructor(table) {
        this.filters = [];
        this.table = [...table];
    }
    eq(field, value) {
        this.filters.push([field, value]);
        return this;
    }
    limit(count) {
        this.limitCount = count;
        return this;
    }
    applyFilters() {
        let result = this.table;
        for (const [field, value] of this.filters) {
            result = result.filter((row) => row[field] === value);
        }
        if (this.limitCount !== undefined) {
            result = result.slice(0, this.limitCount);
        }
        return result;
    }
    async single() {
        const result = this.applyFilters();
        if (result.length === 0) {
            return { data: null, error: { message: 'No rows found' } };
        }
        return { data: result[0], error: null };
    }
    async run() {
        return { data: this.applyFilters(), error: null };
    }
    then(callback) {
        const result = this.applyFilters();
        callback({ data: result, error: null });
        return Promise.resolve();
    }
    async catch(callback) {
        // For error handling
        return this;
    }
}
class SelectBuilder extends QueryBuilder {
    constructor(table) {
        super(table);
    }
    async run() {
        return { data: this.applyFilters(), error: null };
    }
}
class UpdateBuilder {
    constructor(table, updates) {
        this.filters = [];
        this.table = table;
        this.updates = updates;
    }
    eq(field, value) {
        this.filters.push([field, value]);
        return this;
    }
    select() {
        return {
            single: async () => {
                const idx = this.table.findIndex((row) => {
                    return this.filters.every(([field, value]) => row[field] === value);
                });
                if (idx >= 0) {
                    this.table[idx] = { ...this.table[idx], ...this.updates, updated_at: new Date().toISOString() };
                    return { data: this.table[idx], error: null };
                }
                return { data: null, error: { message: 'Not found' } };
            }
        };
    }
}
class InsertBuilder {
    constructor(table, records) {
        this.table = table;
        this.records = Array.isArray(records) ? records : [records];
    }
    select() {
        return {
            single: async () => {
                const withId = { ...this.records[0], id: generateId(), created_at: new Date().toISOString() };
                this.table.push(withId);
                return { data: withId, error: null };
            },
            async: async () => {
                const items = this.records.map((r) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
                this.table.push(...items);
                return { data: items, error: null };
            },
            run: async () => {
                const items = this.records.map((r) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
                this.table.push(...items);
                return { data: items, error: null };
            }
        };
    }
    async run() {
        const items = this.records.map((r) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
        this.table.push(...items);
        return { data: items, error: null };
    }
}
class DeleteBuilder {
    constructor(table) {
        this.filters = [];
        this.table = table;
    }
    eq(field, value) {
        this.filters.push([field, value]);
        return this;
    }
    async then(callback) {
        const idx = this.table.findIndex((row) => {
            return this.filters.every(([field, value]) => row[field] === value);
        });
        if (idx >= 0) {
            this.table.splice(idx, 1);
        }
        callback({ error: null });
        return this;
    }
    async run() {
        const idx = this.table.findIndex((row) => {
            return this.filters.every(([field, value]) => row[field] === value);
        });
        if (idx >= 0) {
            this.table.splice(idx, 1);
        }
        return { error: null };
    }
}
exports.supabase = {
    from: (tableName) => {
        const table = mockDB[tableName] || [];
        return {
            select: (columns = '*') => new SelectBuilder(table),
            insert: (records) => new InsertBuilder(table, records),
            update: (values) => new UpdateBuilder(table, values),
            delete: () => new DeleteBuilder(table)
        };
    }
};
