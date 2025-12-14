declare class QueryBuilder {
    private table;
    private filters;
    private limitCount?;
    constructor(table: any[]);
    eq(field: string, value: any): QueryBuilder;
    limit(count: number): QueryBuilder;
    protected applyFilters(): any[];
    single(): Promise<{
        data: any;
        error: {
            message: string;
        };
    } | {
        data: any;
        error: any;
    }>;
    run(): Promise<{
        data: any[];
        error: any;
    }>;
    then(callback: any): Promise<void>;
    catch(callback: any): Promise<this>;
}
declare class SelectBuilder extends QueryBuilder {
    constructor(table: any[]);
    run(): Promise<{
        data: any[];
        error: any;
    }>;
}
declare class UpdateBuilder {
    private table;
    private updates;
    private filters;
    constructor(table: any[], updates: any);
    eq(field: string, value: any): UpdateBuilder;
    select(): {
        single: () => Promise<{
            data: any;
            error: any;
        } | {
            data: any;
            error: {
                message: string;
            };
        }>;
    };
}
declare class InsertBuilder {
    private table;
    private records;
    constructor(table: any[], records: any[]);
    select(): {
        single: () => Promise<{
            data: any;
            error: any;
        }>;
        async: () => Promise<{
            data: any[];
            error: any;
        }>;
        run: () => Promise<{
            data: any[];
            error: any;
        }>;
    };
    run(): Promise<{
        data: any[];
        error: any;
    }>;
}
declare class DeleteBuilder {
    private table;
    private filters;
    constructor(table: any[]);
    eq(field: string, value: any): DeleteBuilder;
    then(callback: any): Promise<this>;
    run(): Promise<{
        error: any;
    }>;
}
export declare const supabase: {
    from: (tableName: string) => {
        select: (columns?: string) => SelectBuilder;
        insert: (records: any[]) => InsertBuilder;
        update: (values: any) => UpdateBuilder;
        delete: () => DeleteBuilder;
    };
};
export {};
