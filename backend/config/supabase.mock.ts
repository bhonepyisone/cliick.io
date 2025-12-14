// Mock Supabase client for testing - fully functional with chainable queries

interface MockDatabase {
  [tableName: string]: any[];
}

const mockDB: MockDatabase = {
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
  private table: any[];
  private filters: Array<[string, any]> = [];
  private limitCount?: number;

  constructor(table: any[]) {
    this.table = [...table];
  }

  eq(field: string, value: any): QueryBuilder {
    this.filters.push([field, value]);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  protected applyFilters(): any[] {
    let result = this.table;
    for (const [field, value] of this.filters) {
      result = result.filter((row: any) => row[field] === value);
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

  then(callback: any) {
    const result = this.applyFilters();
    callback({ data: result, error: null });
    return Promise.resolve();
  }

  async catch(callback: any) {
    // For error handling
    return this;
  }
}

class SelectBuilder extends QueryBuilder {
  constructor(table: any[]) {
    super(table);
  }

  async run() {
    return { data: this.applyFilters(), error: null };
  }
}

class UpdateBuilder {
  private table: any[];
  private updates: any;
  private filters: Array<[string, any]> = [];

  constructor(table: any[], updates: any) {
    this.table = table;
    this.updates = updates;
  }

  eq(field: string, value: any): UpdateBuilder {
    this.filters.push([field, value]);
    return this;
  }

  select() {
    return {
      single: async () => {
        const idx = this.table.findIndex((row: any) => {
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
  private table: any[];
  private records: any[];

  constructor(table: any[], records: any[]) {
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
        const items = this.records.map((r: any) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
        this.table.push(...items);
        return { data: items, error: null };
      },
      run: async () => {
        const items = this.records.map((r: any) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
        this.table.push(...items);
        return { data: items, error: null };
      }
    };
  }

  async run() {
    const items = this.records.map((r: any) => ({ ...r, id: generateId(), created_at: new Date().toISOString() }));
    this.table.push(...items);
    return { data: items, error: null };
  }
}

class DeleteBuilder {
  private table: any[];
  private filters: Array<[string, any]> = [];

  constructor(table: any[]) {
    this.table = table;
  }

  eq(field: string, value: any): DeleteBuilder {
    this.filters.push([field, value]);
    return this;
  }

  async then(callback: any) {
    const idx = this.table.findIndex((row: any) => {
      return this.filters.every(([field, value]) => row[field] === value);
    });
    if (idx >= 0) {
      this.table.splice(idx, 1);
    }
    callback({ error: null });
    return this;
  }

  async run() {
    const idx = this.table.findIndex((row: any) => {
      return this.filters.every(([field, value]) => row[field] === value);
    });
    if (idx >= 0) {
      this.table.splice(idx, 1);
    }
    return { error: null };
  }
}

export const supabase = {
  from: (tableName: string) => {
    const table = mockDB[tableName] || [];
    
    return {
      select: (columns = '*') => new SelectBuilder(table),
      insert: (records: any[]) => new InsertBuilder(table, records),
      update: (values: any) => new UpdateBuilder(table, values),
      delete: () => new DeleteBuilder(table)
    };
  }
};
