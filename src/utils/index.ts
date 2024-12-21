import nodecrypto from "node:crypto";

/**
 * @template {Array<any>} A
 */
type Shift<A extends any[]> = ((...args: A) => void) extends ((...args: [A[0], ...infer R]) => void) ? R : never;
/**
 * @template {any[]} A
 * @template {number} N
 * @template {any[][]} P
 */
type GrowExpRev<A extends any[], N extends number, P extends any[][]> = A['length'] extends N ? A : [...A, ...P[0]][N] extends undefined ? GrowExpRev<[...A, ...P[0]], N, P> : GrowExpRev<A, N, Shift<P>>;
/**
 * @template {any[]} A
 * @template {number} N
 * @template {any[][]} P
 */
type GrowExp<A extends any[], N extends number, P extends any[][]> = A['length'] extends N ? A : A['length'] extends 8192 ? any[] : [...A, ...A][N] extends undefined ? GrowExp<[...A, ...A], N, [A, ...P]> : GrowExpRev<A, N, P>;
/**
 * @template T
 * @template I
 */
type MapItemType<T, I> = {
    [K in keyof T]: I;
};
/**
 * @template T
 * @template {number} N
 */
export type FixedLengthArray<T, N extends number> = N extends 0 ? [] : MapItemType<GrowExp<[0], N, []>, T>;

export function mixin<
    A extends {[x: string | number | symbol]: any},
    B extends {[x: string | number | symbol]: any},
    X extends PropertyKey[] | ((key: keyof B) => PropertyKey | boolean) | undefined
>(object: A, extent: B, exclude?: X): A & (
    X extends undefined ? B
    : X extends (infer x extends PropertyKey)[] ?
        {[k in keyof B as k extends x ? never : k]: B[k]}
    : X extends (key: keyof B) => PropertyKey | boolean ?
        {[k in keyof B as X extends (key: k) => infer R ? R extends true ? k : R extends PropertyKey ? R : never : never]: B[k]}
    : {}
) {
    for (let [k, v] of Object.entries(extent) as [PropertyKey, any][]) {
        if (k == "__proto__") continue;
        if (Array.isArray(exclude) && exclude.includes(k)) continue;
        if (typeof exclude == "function") {
            const res = exclude(k);
            if (typeof res == "boolean") {if (!res) continue;}
            else k = res;
        }
        //@ts-ignore
        object[k] = v;
    };
    //@ts-ignore
    return object;
}

/**
 * @param {number | string | string[]} base 
 * @param {number} len 
 */
export function makeid(base: number | string | string[], len: number) {
    let abc = typeof base == "string" || Array.isArray(base) ?
        base
    : typeof base == "number" && base <= 64 ?
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-=".slice(0, base)
    :
        (() => {throw new TypeError("invalid base")})();
    let str = "";
    for (let i = 0; i < len; i++) str += abc[Math.floor(Math.random() * abc.length)].toString();
    return str; 
}

export function range(...args:
    | [count: number]
    | [min: number, max: number | [number]]
    | [min: number, max: number | [number], step: number]
): number[] {
    const arr = [];
    if (args.length == 1) {
        for (let i = 0; i < args[0]; i++) arr.push(i);
    } else if (args.length == 2) {
        if (typeof args[1] == "number") {
            if (args[0] < args[1]) for (let i = args[0]; i < args[1]; i++) arr.push(i);
            else for (let i = args[0]; i > args[1]; i--) arr.push(i);
        } else {
            if (args[0] < args[1][0]) for (let i = args[0]; i <= args[1][0]; i++) arr.push(i);
            else for (let i = args[0]; i >= args[1][0]; i--) arr.push(i);
        }
    } else if (args.length == 3) {
        if (typeof args[1] == "number") {
            let step = Math.abs(args[2]);
            if (args[0] < args[1]) for (let i = args[0]; i < args[1]; i += step) arr.push(i);
            else for (let i = args[0]; i > args[1]; i -= step) arr.push(i);
        } else {
            let step = Math.abs(args[2]);
            if (args[0] < args[1][0]) for (let i = args[0]; i <= args[1][0]; i += step) arr.push(i);
            else for (let i = args[0]; i >= args[1][0]; i -= step) arr.push(i);
        }
    }
    return arr;
}

type plus1<X extends number> = [...FixedLengthArray<any, X>, any]["length"] & number;

export type range<min extends number, max extends number> =
    min extends max ? min
    : min | range<plus1<min>, max>;

export function filled<T>(length: number, value: T): T[] {
    const arr = [];
    for (let i = 0; i < length; i++) arr.push(value);
    return arr;
}

export function chop(input: string, remove: string) {
    const index = input.indexOf(remove);
    if (index == -1) return input;
    return input.slice(index + remove.length);
}

export type ValuesOf<T> = T[keyof T];

/**
 * @param {object} obj
 * @param {string} id
 * @returns {any}
 */
export function findns(obj: {[x: PropertyKey]: any}, id: string): any {
    if (id.split(":").length == 2) return obj[id];
    let k = Object.keys(obj);
    for (let i = 0; i < k.length; i++) {
        if (k[i].split(":")[1] == id) return obj[k[i]];
    }
    return obj[id];
}
/**
 * @param {object} obj
 * @param {string} id
 * @returns {string | undefined}
 */
export function getns(obj: {[x: PropertyKey]: any}, id: string): string | undefined {
    if (id.split(":").length == 2 && id in obj) return id;
    let k = Object.keys(obj);
    for (let i = 0; i < k.length; i++) {
        if (k[i].split(":")[1] == id) return k[i];
    }
}

/**
 * @param {string} id 
 * @param {string} ns 
 * @returns {string}
 */
export function addns(id: string, ns: string): string {
    if (id.split(":").length == 2) return id;
    else return `${ns}:${id}`;
}

export function SHA512(input: nodecrypto.BinaryLike) {
    const hash = nodecrypto.createHash("sha512");
    hash.update(input);
    return hash.digest('hex');
}

function iwsGet<T>(value: WeakRef<T & WeakKey> | {value: T} | undefined): T | undefined {
    if (value instanceof WeakRef) {
        return value.deref();
    } else if (typeof value == "object") {
        return value.value;
    } else return undefined;
}

function isWeakKey(value: any): value is WeakKey {
    return (typeof value == "symbol" && Symbol.keyFor(value) === undefined) || (typeof value == "object" && value !== null) || typeof value == "function";
}

export class IterableWeakSet<T> implements Set<T> {
    #items: (WeakRef<T & WeakKey> | {value: T} | undefined)[] = [];
    constructor(iterable?: Iterable<T> | IterableIterator<T> | null | undefined) {
        if (iterable) for (const item of iterable) {
            this.add(item);
        }
    }
    normalize() {
        this.#items = this.#items.filter(v => iwsGet(v) !== undefined);
    }
    add(value: T): this {
        if (!this.has(value)) this.#items.push(isWeakKey(value) ? new WeakRef(value) : {value});
        return this;
    }
    clear(): void {
        this.#items = [];
    }
    delete(value: T): boolean {
        let did = false;
        for (const [index, item] of this.#items.entries()) {
            const v = iwsGet(item);
            if (v === undefined) continue;
            if (v === value) {
                this.#items[index] = undefined;
                did = true;
            }
        }
        this.normalize();
        return did;
    }
    forEach(callbackfn: (value: T, value2: T, set: IterableWeakSet<T>) => void, thisArg?: any): void {
        for (const item of this.#items) {
            const v = iwsGet(item);
            if (v === undefined) continue;
            callbackfn.call(thisArg, v, v, this);
        }
        this.normalize();
    }
    has(value: T): boolean {
        for (const item of this.#items) {
            const v = iwsGet(item);
            if (v === undefined) continue;
            if (v === value) {
                return true;
            }
        }
        this.normalize();
        return false;
    }
    get size(): number {
        let count = 0;
        for (const item of this.#items) {
            const v = iwsGet(item);
            if (v === undefined) continue;
            count++;
        }
        this.normalize();
        return count;
    }
    entries(): IterableIterator<[T, T]> {
        return (function*(that) {
            for (const item of that.#items) {
                const v = iwsGet(item);
                if (v === undefined) continue;
                yield [v, v];
            }
        })(this);
    }
    keys(): IterableIterator<T> {
        return (function*(that) {
            for (const item of that.#items) {
                const v = iwsGet(item);
                if (v === undefined) continue;
                yield v;
            }
        })(this);
    }
    values(): IterableIterator<T> {
        return (function*(that) {
            for (const item of that.#items) {
                const v = iwsGet(item);
                if (v === undefined) continue;
                yield v;
            }
        })(this);
    }
    union<U>(other: ReadonlySetLike<U>): IterableWeakSet<T | U> {
        return new IterableWeakSet(new Set(this).union(other));
    }
    intersection<U>(other: ReadonlySetLike<U>): IterableWeakSet<T & U> {
        return new IterableWeakSet(new Set(this).intersection(other));
    }
    difference<U>(other: ReadonlySetLike<U>): IterableWeakSet<T> {
        return new IterableWeakSet(new Set(this).difference(other));
    }
    symmetricDifference<U>(other: ReadonlySetLike<U>): IterableWeakSet<T | U> {
        return new IterableWeakSet(new Set(this).symmetricDifference(other));
    }
    isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
        return new Set(this).isSubsetOf(other);
    }
    isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
        return new Set(this).isSupersetOf(other);
    }
    isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
        return new Set(this).isDisjointFrom(other);
    }
    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }
    [Symbol.toStringTag]: string = "IterableWeakSet";
}

export * from "./ce";
export * from "./req";
export * from "./validate";
export * from "./cases";
export * from "./value";