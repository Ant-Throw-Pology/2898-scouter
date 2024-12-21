import nodeutil from "node:util";
import type { FixedLengthArray, range } from ".";

interface StringMatcher {
    type: "string";
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
}
interface NumberMatcher {
    type: "number";
    min?: number;
    max?: number;
    maxPrecision?: number;
    maxDecimal?: number;
}
interface BigintMatcher {
    type: "bigint";
    min?: number;
    max?: number;
}
interface BooleanMatcher {
    type: "boolean";
}
interface SymbolMatcher {
    type: "symbol";
    description?: Matcher;
}
interface UndefinedMatcher {
    type: "undefined";
}
interface ObjectMatcher {
    type: "object";
    nullable?: boolean;
    properties?: {
        [x: string | number | symbol]: Matcher;
    };
    optionalProperties?: {
        [x: string | number | symbol]: Matcher;
    };
    patternProperties?: [RegExp, Matcher][];
    extraProperties?: Matcher;
}
interface FunctionMatcher {
    type: "function";
    name?: Matcher;
}
interface EnumMatcher {
    type: "enum";
    values: (string | number | bigint | boolean | symbol | null | undefined)[];
}
interface ValueMatcher {
    type: "value";
    value: string | number | bigint | boolean | symbol | null | undefined;
}
interface ClassMatcher {
    type: (new() => any) | {[Symbol.hasInstance](value: any): value is any};
}
interface UnionMatcher {
    type: "union";
    options: Matcher[];
}
interface ArrayMatcher {
    type: "array";
    items: Matcher;
    minLength?: number;
    maxLength?: number;
}

export type Matcher = {
    special?: ((value: unknown, name: string | undefined) => value is any) | ((value: unknown) => boolean)
} & (
    | StringMatcher
    | NumberMatcher
    | BigintMatcher
    | BooleanMatcher
    | SymbolMatcher
    | UndefinedMatcher
    | ObjectMatcher
    | FunctionMatcher
    | EnumMatcher
    | ValueMatcher
    | ClassMatcher
    | UnionMatcher
    | ArrayMatcher
);

export type ReverseMatcher<T extends Matcher> =
    T extends StringMatcher ? string :
    T extends NumberMatcher ? number :
    T extends BigintMatcher ? bigint :
    T extends BooleanMatcher ? boolean :
    T extends SymbolMatcher ? symbol :
    T extends UndefinedMatcher ? undefined :
    T extends ObjectMatcher ? (
        (T["properties"] extends {[x: string | number | symbol]: Matcher} ? {[k in keyof T["properties"]]: ReverseMatcher<T["properties"][k]>} : {}) &
        (T["optionalProperties"] extends {[x: string | number | symbol]: Matcher} ? {[k in keyof T["optionalProperties"]]?: ReverseMatcher<T["optionalProperties"][k]>} : {}) &
        (T["extraProperties"] extends Matcher ? {[x: string | number | symbol]: ReverseMatcher<T["extraProperties"]>} : {})
    ) | (T["nullable"] extends true ? null : never) :
    T extends FunctionMatcher ? (...args: any[]) => any :
    T extends EnumMatcher ? T["values"][number] :
    T extends ValueMatcher ? T["value"] :
    T extends ClassMatcher ? (
        T["type"] extends (new() => infer V) ? V :
        T["type"] extends {[Symbol.hasInstance](value: any): value is infer V} ? V : any
    ) :
    T extends UnionMatcher ? ReverseMatcher<T["options"][number]> :
    T extends ArrayMatcher ? ReverseMatcher<T["items"]>[] : never;

function* allEntries<T>(value: T): Generator<[keyof T, T[keyof T]], void, unknown> {
    for (const key of Object.getOwnPropertyNames(value)) {
        //@ts-ignore
        yield [key, value[key]];
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
        //@ts-ignore
        yield [key, value[key]];
    }
}

function indent(str: string, idt: string = "    ") {
    return str.split("\n").map(s => idt + s).join("\n");
}

//@ts-ignore
export function validate<T extends Matcher, V>(value: V, type: T, logName?: string, logFn?: (log: string) => void): value is ReverseMatcher<T> {
    if (!logFn || !logName) logFn = () => {};
    if (type.type == "string") {
        if (typeof value != "string") return logFn(`${logName} (${value}) must be a string`), false;
        if (typeof type.minLength == "number" && value.length < type.minLength)
            return logFn(`${logName} (${value}) must be ${type.minLength} characters or longer`), false;
        if (typeof type.maxLength == "number" && value.length > type.maxLength)
            return logFn(`${logName} (${value}) must be ${type.maxLength} characters or shorter`), false;
        if (type.pattern && !type.pattern.test(value)) return logFn(`${logName} (${value}) must match ${nodeutil.inspect(type.pattern)}`), false;
    } else if (type.type == "number") {
        if (typeof value != "number") return logFn(`${logName} (${value}) must be a number`), false;
        if ((typeof type.min == "number" || typeof type.min == "bigint") && value < type.min)
            return logFn(`${logName} (${value}) must be greater than or equal to ${type.min}`), false;
        if ((typeof type.max == "number" || typeof type.max == "bigint") && value > type.max)
            return logFn(`${logName} (${value}) must be less than or equal to ${type.max}`), false;
        if (typeof type.maxDecimal == "number" && value % 1 > type.maxDecimal) return logFn(`${logName} (${value}) must have a decimal portion (x modulo 1) less than ${type.maxDecimal}`), false;
        if (typeof type.maxPrecision == "number" && value % 10 ** -type.maxPrecision !== 0) return logFn(`${logName} (${value}) must be only precise to integer multiples of ${10 ** -type.maxPrecision}`), false;
    } else if (type.type == "bigint") {
        if (typeof value != "bigint") return logFn(`${logName} (${value}) must be a bigint`), false;
        if ((typeof type.min == "number" || typeof type.min == "bigint") && value < type.min)
            return logFn(`${logName} (${value}) must be greater than or equal to ${type.min}`), false;
        if ((typeof type.max == "number" || typeof type.max == "bigint") && value > type.max)
            return logFn(`${logName} (${value}) must be less than or equal to ${type.max}`), false;
    } else if (type.type == "boolean") {
        if (typeof value != "boolean") return logFn(`${logName} (${value}) must be a boolean`), false;
    } else if (type.type == "symbol") {
        if (typeof value != "symbol") return logFn(`${logName} (${value}) must be a symbol`), false;
        if (typeof type.description == "object" && !validate(value.description, type.description, logName ? logName + ".description" : undefined, logFn))
            return false;
    } else if (type.type == "undefined") {
        if (typeof value != "undefined") return logFn(`${logName} (${value}) must be undefined`), false;
    } else if (type.type == "object") {
        if (typeof value != "object") return logFn(`${logName} (${value}) must be an object`), false;
        if (value === null) {
            if (!type.nullable) return logFn(`${logName} (${value}) must not be null`), false;
        } else {
            if (type.properties) for (const [key, val] of allEntries(type.properties)) {
                //@ts-ignore
                if (!(key in value)) return logFn(`${logName} (${value}) must have property '${String(key)}'`), false;
                if (!validate((value as any)[key], val, logName + (typeof key == "symbol" ? `[Symbol(${key.description})]` : typeof key == "number" ? `[${key}]` : key.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? `.${key}` : `[${nodeutil.inspect(key)}]`), logFn)) return false;
            }
            if (type.optionalProperties) for (const [key, val] of allEntries(type.optionalProperties)) {
                if (!(key in value)) continue;
                let n = logName + (typeof key == "symbol" ? `[Symbol(${key.description})]` : typeof key == "number" ? `[${key}]` : key.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? `.${key}` : `[${nodeutil.inspect(key)}]`), errors: string[] = [];
                if (!validate((value as any)[key], val, n, (log) => {errors.push(log)})) return logFn(`${n} must either not be present or match this:\n${indent(errors.join("\n"), "> ")}`), false;
            }
            if (type.extraProperties) for (const [key, val] of allEntries(value as any)) {
                if (type.properties && key in type.properties) continue;
                if (type.optionalProperties && key in type.optionalProperties) continue;
                if (!validate(val, type.extraProperties, logName + (typeof key == "symbol" ? `[Symbol(${key.description})]` : typeof key == "number" ? `[${key}]` : key.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? `.${key}` : `[${nodeutil.inspect(key)}]`), logFn)) return false;
            }
        }
    } else if (type.type == "function") {
        if (typeof value != "function") return logFn(`${logName} (${value}) must be a function`), false;
        if (typeof type.name == "object" && !validate(value.name, type.name, logName + ".name", logFn)) return false;
    } else if (type.type == "enum") {
        let matched = false;
        for (const m of type.values) {
            if (value === m) {
                matched = true;
                break;
            }
        }
        if (!matched) return logFn(`${logName} (${value}) must be strictly equal to one of the following values:\n${nodeutil.inspect(type.values)}`), false;
    } else if (type.type == "value") {
        if (value !== type.value) return logFn(`${logName} (${value}) must be strictly equal to ${nodeutil.inspect(type.value)}`), false;
    } else if (type.type == "union") {
        let matched = false;
        const errors: string[][] = [];
        for (const [index, option] of type.options.entries()) {
            if (validate(value, option, logName, (log) => {errors[index] ??= []; errors[index].push(log);})) {
                matched = true;
                break;
            }
        }
        if (!matched) return logFn(`${logName} must match one of these:\n${errors.map(e => indent(e.join("\n"), "> ")).join("\n---\n")}`), false;
    } else if (type.type == "array") {
        if (!Array.isArray(value)) return logFn(`${logName} (${value})`), false;
        if (typeof type.minLength == "number" && value.length < type.minLength)
            return logFn(`${logName} (${value}) must have at least ${type.minLength} elements`), false;
        if (typeof type.maxLength == "number" && value.length > type.maxLength)
            return logFn(`${logName} (${value}) must have at most ${type.maxLength} elements`), false;
        for (const [index, item] of value.entries()) {
            if (!validate(item, type.items, logName + `[${index}]`, logFn)) return false;
        }
    } else if (Symbol.hasInstance in type.type || typeof type.type == "function") {
        if (!(value instanceof type.type)) return logFn(`${logName} (${value}) must be an instance of ${typeof type.type == "function" ? type.type.name : nodeutil.inspect(type.type)}`), false;
    } else throw new Error("Invalid schema");
    if (type.special) return type.special(value, logName);
    else return true;
}

export default {validate};