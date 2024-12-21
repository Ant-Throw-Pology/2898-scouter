import { IterableWeakSet } from ".";

const valueStack: Value<any>[] = [];

const gone = Symbol();

export class Value<T> {
    #value: T | typeof gone = gone;
    #source: (() => T) | undefined;
    #dirty: boolean = true;
    #downstream = new IterableWeakSet<Value<any>>();
    #watchers = new Set<(value: T) => void>();
    constructor(value: T | (() => T)) {
        if (typeof value == "function") {
            this.#source = value as () => T;
        } else {
            this.#value = value;
        }
    }
    static #dirtify(value: Value<any>) {
        value.#dirty = true;
        for (const item of value.#downstream) {
            Value.#dirtify(item);
        }
        for (const cb of value.#watchers) {
            cb(value.get());
        }
    }
    static watch<T>(value: Value<T>, callback: (value: T) => void, init: boolean = false) {
        value.#watchers.add(callback);
        if (init) callback(value.get());
    }
    static unwatch<T>(value: Value<T>, callback: (value: T) => void) {
        value.#watchers.delete(callback);
    }
    static str(strings: TemplateStringsArray, ...values: any[]) {
        return new Value(() => {
            let str = strings[0] || "";
            for (let i = 0; i < values.length; i++) {
                if (values[i] instanceof Value) str += String(values[i].get());
                else str += String(values[i]);
                str += strings[i + 1] || "";
            }
            return str;
        });
    }
    get(): T {
        const top = valueStack.at(-1);
        if (top) {
            top.#downstream.add(this);
        }
        if (this.#source === undefined) {
            return this.#value as T;
        } else if (this.#dirty || this.#value === gone) {
            return this.#accessSource();
        } else return this.#value as T;
    }
    set(value: T) {
        if (typeof this.#source == "function") throw new TypeError("Value must be a source");
        this.#value = value;
        Value.#dirtify(this);
    }
    #accessSource() {
        if (typeof this.#source !== "function") throw new TypeError("Value.#accessSource: Value.#source is not a function");
        valueStack.push(this);
        try {
            return this.#value = this.#source();
        } finally {
            if (valueStack.pop() !== this) console.error("PANIC!!!!!");
        }
    }
    [Symbol.toPrimitive]() {
        return this.get();
    }
    toString() {
        return String(this.get());
    }
    valueOf() {
        return this.get();
    }
}