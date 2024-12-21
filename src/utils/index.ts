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

export function filled<T>(length: number, value: T): T[] {
    const arr = [];
    for (let i = 0; i < length; i++) arr.push(value);
    return arr;
}

export * from "./ce";
export * from "./req";
export * from "./validate";
export * from "./cases";
export * from "./value";