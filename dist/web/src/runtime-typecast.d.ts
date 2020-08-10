import { ObjectDict } from './ObjectDict';
export declare function isRecord(obj: unknown): obj is ObjectDict;
export declare function isFunction(obj: unknown): obj is Function;
export declare function isBoolean(obj: unknown): obj is boolean;
export declare function isString(obj: unknown): obj is string;
export declare function isNumber(obj: unknown): obj is number;
export declare function isIndex(obj: unknown): obj is Index;
export declare function isArray(obj: unknown): obj is unknown[];
export declare function isUndefined(obj: unknown): obj is undefined;
export declare function isNullish(obj: unknown): obj is null | undefined;
export declare function asString(obj: unknown, fallback?: string): string;
export declare function asNumber(obj: unknown, fallback?: number): number;
export declare function makeString(obj: unknown): string;
export declare function makeNumber(obj: unknown): number;
export declare function makeBoolean(obj: unknown): boolean;
export declare type Index = number | string;
export declare function asIndex(obj: unknown, fallback?: Index): Index;
export declare function asIndexable(obj: unknown, fallback?: Record<Index, unknown>): Record<Index, unknown>;
export declare function asBoolean(obj: unknown, fallback?: boolean): boolean;
export declare function asArray(obj: unknown, fallback?: unknown[]): unknown[];
export declare function asRecord(obj: unknown, fallback?: ObjectDict): ObjectDict;
export declare function asFunction(obj: unknown, fallback?: Function): Function;
export declare function asArrayRecursive<T>(obj: unknown, visitor: (obj: unknown) => T, fallback?: T[]): T[];
export declare function asRecordRecursive<T>(obj: unknown, visitor: (obj: unknown) => T, fallback?: ObjectDict<T>): ObjectDict<T>;
export declare function asOptString(obj: unknown): string | undefined;
export declare function asOptNumber(obj: unknown): number | undefined;
export declare function asOptIndex(obj: unknown): Index | undefined;
export declare function asOptIndexable(obj: unknown): Record<Index, unknown> | undefined;
export declare function asOptBoolean(obj: unknown): boolean | undefined;
export declare function asOptArray(obj: unknown): unknown[] | undefined;
export declare function asOptRecord(obj: unknown): ObjectDict | undefined;
export declare function asOptFunction(obj: unknown): Function | undefined;
export declare function asOptArrayRecursive<T>(obj: unknown, visitor: (obj: unknown) => T): T[] | undefined;
export declare function asOptRecordRecursive<T>(obj: unknown, visitor: (obj: unknown) => T): ObjectDict<T> | undefined;
