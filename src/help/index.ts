import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "marked";

export function readHelp() {
    const result: {[x: string]: {[x: string]: string}} = {};
    // I'd do this with promises but `bun build` hangs when I do, see https://github.com/oven-sh/bun/issues/7611
    for (const dir of readdirSync(import.meta.dir)) {
        if (dir.includes(".")) continue;
        result[dir] = {};
        for (const item of readdirSync(join(import.meta.dir, dir))) {
            const html = parse(readFileSync(join(import.meta.dir, dir, item), {encoding: "utf-8"}), {async: false});
            const title = html.match(/<h1>([^<]+)<\/h1>/)?.[1].trim() || item;
            result[dir][title] = html;
        }
    }
    return result;
}