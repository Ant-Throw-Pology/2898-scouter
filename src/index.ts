import "./index.html" with {type: "file"};
import "./index.css" with {type: "file"};
import "./favicon.svg" with {type: "file"};
import "./bin.svg" with {type: "file"};
import "./manifest.webmanifest" with {type: "file"};
import "./favicon-512.png" with {type: "file"};
import "./favicon-192.png" with {type: "file"};
import "./screenshots/initial.png" with {type: "file"};
import "./screenshots/initial-mobile.png" with {type: "file"};
import "./help/configuration/teams-list-start.png" with {type: "file"};
import "./help/configuration/teams-list-end.png" with {type: "file"};
import { ce, makeid, type CEOptions } from "./ce";
import { Html5Qrcode } from "html5-qrcode";
import { toDataURL } from "qrcode";
import { parse, unparse } from 'papaparse';
import Color from "color";
import { gzip, ungzip } from "pako";
import { version } from "../package.json";
import { readHelp } from "./help" with {type: "macro"};

document.getElementById("version")!.innerText = (version.startsWith("canary") ? "" : "v") + version;
(document.getElementById("version") as HTMLAnchorElement).href = `https://github.com/Ant-Throw-Pology/2898-scouter/releases/tag/${version.startsWith("canary") ? "canary" : "v" + version}`;

const helpText = readHelp();

//#region Data Interfaces

interface ScoutItemBase {
    label: string;
    optional?: boolean;
}

interface SelectScoutItem extends ScoutItemBase {
    type: "select";
    options: string[];
}

interface ShortTextScoutItem extends ScoutItemBase {
    type: "short-text";
    suggestions?: string[];
}

interface TextScoutItem extends ScoutItemBase {
    type: "text";
}

interface NumberScoutItem extends ScoutItemBase {
    type: "number";
    min?: number;
    max?: number;
    default?: number;
    step?: number;
}

interface SliderScoutItem extends ScoutItemBase {
    type: "slider";
    min: number;
    max: number;
    default: number;
    step?: number;
}

interface CheckboxScoutItem extends ScoutItemBase {
    type: "checkbox";
}

type ScoutItem = SelectScoutItem | ShortTextScoutItem | TextScoutItem | NumberScoutItem | SliderScoutItem | CheckboxScoutItem;

interface ScoutSection {
    title: string;
    stands: boolean;
    pits: boolean;
    items: ScoutItem[];
}

interface SeasonConfig {
    competition: string;
    sections: ScoutSection[];
}

interface Team {
    number: string;
    name: string;
    location?: string;
}

interface Configuration extends SeasonConfig {
    teams: Team[];
}

interface BaseScoutData {
    by: string;
    when: number;
}

interface PitsScoutData extends BaseScoutData {
    type: "pits";
    drivetrain: string;
    leds: string;
    cycleTime: number;
    data: {[x: string]: {[x: string]: string | number | boolean}};
    willChange?: number;
}

interface StandsScoutData extends BaseScoutData {
    type: "stands";
    matchNumber: number;
    matchType: string;
    allianceScore: number;
    defenseNotes: string;
    offenseNotes: string;
    droppedItems: boolean;
    aStop: boolean;
    eStop: boolean;
    died: boolean;
    won: boolean;
    carried: boolean;
    wereCarried: boolean;
    cycleTime: number;
    driveRating: number;
    data: {[x: string]: {[x: string]: string | number | boolean}};
}

type ScoutData = PitsScoutData | StandsScoutData;

type TeamSpecificScoutData = ScoutData & {
    team: string;
};

interface StorageData {
    config: Configuration;
    entries: {[x: string]: ScoutData[]}
}

//#endregion

const teamNumberRegex = /^\d+\w*$/;
const teamNumberNameRegex = /^(?<number>\d+\w*) (?<name>.*)$/;

// I may have other things I want to host on subpaths under my GitHub Pages site that use localStorage, so I'm doing this to isolate them somewhat.
const STORAGE_PREFIX = "scouter:";

const SCOUT_DATA_PREFIX = "scoutdata:";
const SCOUT_CONF_PREFIX = "scoutconf:";

let currentPanel = "onboarding-1";
let scouterName: string | undefined;
let scouterRole: "pits" | "stands" | undefined;
let directory: FileSystemDirectoryHandle | undefined;
let storageKey: string | undefined;
let configuration: Configuration | undefined;
let entries: {[x: string]: ScoutData[]} | undefined;
let storageData: StorageData | undefined;

//#region Utilty functions

function capitalizeFirst(str: string) {
    str = str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([a-z])-([a-z])/gi, "$1 $2");
    return str[0].toUpperCase() + str.slice(1);
}

const panelHistory: string[] = [currentPanel];

async function switchToPanel(panel: string, detail?: any) {
    const el1 = document.getElementById("panel-" + currentPanel)!;
    const el2 = document.getElementById("panel-" + panel)!;
    el1.inert = true;
    await el1.animate([
        {opacity: 0}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
    el2.inert = false;
    panelHistory.push(currentPanel = panel);
    while (panelHistory.length > 10) panelHistory.shift();
    el2.dispatchEvent(new CustomEvent("transitionedto", {bubbles: false, cancelable: false, detail}));
    await el2.animate([
        {opacity: 1}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
}

async function back(detail?: any) {
    const lastPanel = panelHistory.pop();
    const panel = panelHistory.at(-1);
    if (panel) {
        await switchToPanel(panel);
    } else if (lastPanel) panelHistory.push(lastPanel);
}

function pulseColor(element: HTMLElement, color: string, animationOptions: KeyframeEffectOptions = {duration: 500}) {
    element.scrollIntoView({block: "center", inline: "center", behavior: "instant"});
    let e: Element | null = element;
    while (e && !(e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement)) e = e.firstElementChild || e.nextElementSibling;
    if (e) e.focus();
    else element.focus();
    return element.animate([
        {backgroundColor: Color(color).darken(0.6).toString(), color, borderColor: color},
        {backgroundColor: window.getComputedStyle(element).backgroundColor}
    ], animationOptions);
}

function throwAndPulseColorIf<T>(
    value: T,
    predicate: (value: T) => boolean,
    element: HTMLElement,
    color: string,
    toThrow: any,
    animationOptions: KeyframeEffectOptions = {duration: 500}
): T {
    if (predicate(value)) {
        pulseColor(element, color, animationOptions);
        throw toThrow;
    } else return value;
}

function kebabify(str: string) {
    return str.toLowerCase().replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "");
}

function makeAbilityFieldset(items: string[], selections: string[], idPrefix: string, element: HTMLElement, values?: {[x: string]: string}) {
    for (const item of items) {
        const index = kebabify(item);
        const name = idPrefix + index;
        element.appendChild(ce({
            name: "fieldset",
            dataset: {item, index},
            content: [
                {name: "legend", content: item},
                ...selections.flatMap((v, i) => {
                    const value = v.toLowerCase();
                    const id = `${name}-${value}`;
                    return [
                        ...(i > 0 ? [{name: "br" as "br"}] : []),
                        {
                            name: "input",
                            id,
                            attrs: {
                                type: "radio",
                                name,
                                value
                            },
                            checked: values && values[index] == value
                        },
                        {
                            name: "label",
                            htmlFor: id,
                            content: v
                        }
                    ] satisfies CEOptions[]
                })
            ]
        }));
    }
}

function masonry(elements: HTMLElement[], numCols: number, leadingRows: number = 0) {
    const heights = new Map(
        elements
            .map(el => [el, el.getBoundingClientRect().height] as [HTMLElement, number])
            .filter(v => v[1] > 0)
            .sort((a, b) => b[1] - a[1])
    );
    const columns: HTMLElement[][] = Array(numCols).fill(0).map(() => []);
    const whichColumn = new Map<HTMLElement, number>();
    const columnHeights = Array(numCols).fill(0);
    for (const [el, height] of heights) {
        const minHeight = Math.min(...columnHeights);
        const minIndex = columnHeights.lastIndexOf(minHeight);
        columns[minIndex].push(el);
        columnHeights[minIndex] += height;
        whichColumn.set(el, minIndex);
    }
    const topY = new Map<HTMLElement, number>();
    const bottomY = new Map<HTMLElement, number>();
    const rowLines = new Set([0]);
    for (const column of columns) {
        const indices = new Map(column.map(el => [el, elements.indexOf(el)]));
        column.sort((a, b) => (indices.get(a) || 0) - (indices.get(b) || 0));
        let y = 0;
        for (const el of column) {
            topY.set(el, y);
            y += heights.get(el) || 0;
            bottomY.set(el, y);
            rowLines.add(y);
        }
    }
    const rowLines2 = [...rowLines.values()].sort((a, b) => a - b);
    for (const el of heights.keys()) {
        const col = whichColumn.get(el) || 0;
        const top = topY.get(el) || 0;
        const bottom = bottomY.get(el) || 0;
        const topN = rowLines2.indexOf(top);
        const bottomN = rowLines2.indexOf(bottom);
        el.style.gridArea = `${topN + 1 + leadingRows} / ${col + 1} / ${bottomN + 1 + leadingRows} / ${col + 2}`;
    }
}

function flattenObject(obj: {[x: string]: any}, splitter: string = ".", _result: {[x: string]: any} = {}, _prefix: string = "") {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value == "object" && value !== null) {
            flattenObject(value, splitter, _result, _prefix + key + splitter);
        } else {
            _result[_prefix + key] = value;
        }
    }
    return _result;
}

function unFlattenObject(obj: {[x: string]: any}) {
    const result: {[x: string]: any} = {};
    for (const [key, value] of Object.entries(obj)) {
        const keys = key.split(".");
        if (keys.length > 1) {
            let o = result;
            for (const k of keys.slice(0, -1)) {
                o[k] ??= {};
                o = o[k];
            }
            o[keys[keys.length - 1]] = value;
        } else {
            result[keys[0]] = value;
        }
    }
    return result;
}

function getTeam(teamNumber: string) {
    return configuration?.teams.find(t => t.number === teamNumber);
}

function mean(arr: number[]) {
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
}

function objectArrayValues<T extends {[x: string]: any}>(objs: T[]): {[k in keyof T]: T[k][]} {
    const result: {[x: string]: any[]} = {};
    for (const obj of objs) {
        for (const [k, v] of Object.entries(obj)) {
            result[k] ??= [];
            result[k].push(v);
        }
    }
    //@ts-ignore
    return result;
}

function stringifyDate(date: Date | number) {
    return (typeof date == "number" ? new Date(date) : date).toLocaleString(undefined, {
        timeStyle: "long",
        dateStyle: "medium"
    });
}

function teamSort(a: string, b: string) {
    const aNumber = parseInt(a, 10);
    const aLetter = teamNumberRegex.exec(a)?.[2] || "";
    const bNumber = parseInt(b, 10);
    const bLetter = teamNumberRegex.exec(b)?.[2] || "";
    if (aNumber == bNumber) {
        if (aLetter < bLetter) return -1;
        else if (bLetter < aLetter) return 1;
        else return 0;
    } else return aNumber - bNumber;
}

//#endregion

//#region Storage management

async function saveConfiguration() {
    if (!configuration) return;
    if (directory) {
        const configFile = await directory.getFileHandle("config.json", {create: true});
        await new Blob([JSON.stringify(configuration)]).stream().pipeTo(await configFile.createWritable());
    } else if (storageKey) {
        storageData ??= {config: configuration, entries: {}};
        storageData.config = configuration;
        localStorage.setItem(storageKey, JSON.stringify(storageData));
    } else throw new Error("Unable to save. Neither storage option was present.");
}

async function saveEntry(team: Team, entry: ScoutData) {
    if (!storageData || !entries) return;
    entries[team.number] ??= [];
    entries[team.number].push(entry);
    if (storageData.entries !== entries) storageData.entries = entries;
    if (directory) {
        const filename = `${team.number}-${team.name.replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}-${entry.by.replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}-${new Date(entry.when).toLocaleString().replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}.json`;
        const file = await directory.getFileHandle(filename, {create: true});
        await new Blob([JSON.stringify({...entry, team})]).stream().pipeTo(await file.createWritable());
    } else if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(storageData));
    } else throw new Error("Unable to save. Neither storage option was present.");
}

async function removeEntry(team: Team, entry: ScoutData) {
    if (!storageData || !entries) return;
    if (storageData.entries !== entries) storageData.entries = entries;
    entries[team.number] && (entries[team.number] = entries[team.number].filter(e => e !== entry));
    if (directory) {
        const filename = `${team.number}-${team.name.replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}-${entry.by.replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}-${new Date(entry.when).toLocaleString().replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "")}.json`;
        try {
            await directory.removeEntry(filename);
        } catch (e) {
            if (!(e instanceof DOMException && e.name == "NotFoundError")) throw e;
        }
    } else if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(storageData));
    }
}

//#endregion

//#region Type checkers

function checkTeam(value: unknown): value is Team {
    return typeof value == "object" && value !== null &&
        "number" in value && typeof value.number == "string" &&
        "name" in value && typeof value.name == "string" && (
            !("location" in value) ||
            typeof value.location == "undefined" ||
            typeof value.location == "string"
        )
}

function checkItem(value: unknown): value is ScoutItem {
    return typeof value == "object" && value !== null &&
        "label" in value && typeof value.label == "string" &&
        "type" in value && typeof value.type == "string" && (
            value.type == "select" && "options" in value && Array.isArray(value.options) && value.options.every(v => typeof v == "string") ||
            value.type == "short-text" && (!("suggestions" in value) || typeof value.suggestions == "undefined" || Array.isArray(value.suggestions) && value.suggestions.every(v => typeof v == "string")) ||
            value.type == "text" ||
            value.type == "number" && (!("min" in value) || typeof value.min == "undefined" || typeof value.min == "number") && (!("default" in value) || typeof value.default == "undefined" || typeof value.default == "number") && (!("max" in value) || typeof value.max == "undefined" || typeof value.max == "number") && (!("step" in value) || typeof value.step == "undefined" || typeof value.step == "number") ||
            value.type == "slider" && "min" in value && typeof value.min == "number" && "default" in value && typeof value.default == "number" && "max" in value && typeof value.max == "number" && (!("step" in value) || typeof value.step == "undefined" || typeof value.step == "undefined") ||
            value.type == "checkbox"
        )
}

function checkSection(value: unknown): value is ScoutSection {
    return typeof value == "object" && value !== null &&
        "title" in value && typeof value.title == "string" &&
        "stands" in value && typeof value.stands == "boolean" &&
        "pits" in value && typeof value.pits == "boolean" &&
        "items" in value && Array.isArray(value.items) && value.items.every(checkItem)
}

function checkConfiguration(value: unknown): value is Configuration {
    return typeof value == "object" && value !== null &&
        "competition" in value && typeof value.competition == "string" &&
        "sections" in value && Array.isArray(value.sections) && value.sections.every(checkSection) &&
        "teams" in value && Array.isArray(value.teams) && value.teams.every(checkTeam)
}

function checkEntry(value: unknown): value is ScoutData {
    return typeof value == "object" && value !== null && (
        (
            "type" in value && value.type === "pits" &&
            "by" in value && typeof value.by == "string" &&
            "when" in value && typeof value.when == "number" &&
            "data" in value && typeof value.data == "object" && value.data !== null && Object.entries(value.data).every(([, v2]) => Object.entries(v2).every(([k3, v3]) => typeof v3 == "string" || typeof v3 == "number" || typeof v3 == "boolean")) &&
            "drivetrain" in value && typeof value.drivetrain == "string" &&
            "leds" in value && typeof value.leds == "string" &&
            "cycleTime" in value && typeof value.cycleTime == "number" && (
                !("willChange" in value) ||
                typeof value.willChange == "undefined" ||
                typeof value.willChange == "number"
            )
        ) || (
            "type" in value && value.type === "stands" &&
            "by" in value && typeof value.by == "string" &&
            "when" in value && typeof value.when == "number" &&
            "data" in value && typeof value.data == "object" && value.data !== null && Object.entries(value.data).every(([, v2]) => Object.entries(v2).every(([k3, v3]) => typeof v3 == "string" || typeof v3 == "number" || typeof v3 == "boolean")) &&
            "matchNumber" in value && typeof value.matchNumber == "number" &&
            "matchType" in value && typeof value.matchType == "string" &&
            "allianceScore" in value && typeof value.allianceScore == "number" &&
            "defenseNotes" in value && typeof value.defenseNotes == "string" &&
            "offenseNotes" in value && typeof value.offenseNotes == "string" &&
            "droppedItems" in value && typeof value.droppedItems == "boolean" &&
            "died" in value && typeof value.died == "boolean" &&
            "won" in value && typeof value.won == "boolean" &&
            "carried" in value && typeof value.carried == "boolean" &&
            "wereCarried" in value && typeof value.wereCarried == "boolean" &&
            "cycleTime" in value && typeof value.cycleTime == "number" &&
            "driveRating" in value && typeof value.driveRating == "number"
        )
    )
}

function checkEntries(value: unknown): value is {[x: string]: ScoutData[]} {
    return typeof value == "object" && value !== null && Object.entries(value).every(([k, v]) => Array.isArray(v) && v.every(checkEntry));
}

function checkStorageData(value: unknown): value is StorageData {
    return typeof value == "object" && value !== null &&
        "config" in value && checkConfiguration(value.config) &&
        "entries" in value && checkEntries(value.entries);
}

//#endregion

//#region Help

document.getElementById("help-button")!.addEventListener("click", function createHelpDialog(this: any) {
    document.getElementById("help-dialog-c")?.remove();
    const dialog = ce({
        name: "div",
        id: "help-dialog-c",
        events: {
            click() {
                this.remove();
                document.getElementById("header")!.inert = false;
                document.getElementById("panels")!.inert = false;
            }
        }
    });
    document.body.appendChild(dialog);
    document.getElementById("header")!.inert = true;
    document.getElementById("panels")!.inert = true;
    Array.from(dialog.children).forEach(el => el.remove());
    const relevantArticles = Object.entries(helpText[currentPanel] || {});
    const otherArticles = Object.entries(helpText).map(([group, articles]) => group != currentPanel ? Object.entries(articles) : []).flat(1);
    function prepareArticles(articles: [string, string][]): CEOptions[] {
        return articles.map(([title, content]) => ({
            name: "a",
            class: "help-article",
            content: title,
            contentAsHTML: true,
            href: "javascript:void 0;",
            events: {
                click() {
                    document.getElementById("help-dialog-c")?.remove();
                    const dialog = ce({
                        name: "div",
                        id: "help-dialog-c",
                        events: {
                            click() {
                                this.remove();
                                document.getElementById("header")!.inert = false;
                                document.getElementById("panels")!.inert = false;
                            }
                        }
                    });
                    document.body.appendChild(dialog);
                    document.getElementById("header")!.inert = true;
                    document.getElementById("panels")!.inert = true;
                    Array.from(dialog.children).forEach(el => el.remove());
                    dialog.appendChild(ce({
                        name: "div",
                        class: "help-dialog",
                        content: [
                            {
                                name: "h1",
                                class: "help-header",
                                content: [
                                    {
                                        name: "button",
                                        content: "\xd7",
                                        attrs: {title: "Exit Help"}
                                    },
                                    title,
                                    {
                                        name: "button",
                                        content: "\xab",
                                        attrs: {title: "Back"}
                                    }
                                ],
                                contentAsHTML: true
                            },
                            content.replace(/<h1>[^<]+<\/h1>/i, "").trim()
                        ],
                        contentAsHTML: true,
                        events: {
                            click(event) {
                                event.stopPropagation();
                                if (event.target instanceof HTMLButtonElement) {
                                    document.getElementById("help-dialog-c")?.remove();
                                    document.getElementById("header")!.inert = false;
                                    document.getElementById("panels")!.inert = false;
                                    if (event.target.innerText.includes("\xab")) createHelpDialog();
                                }
                            }
                        }
                    }));
                }
            }
        } satisfies CEOptions));
    }
    dialog.appendChild(ce({
        name: "div",
        class: "help-dialog",
        content: [
            {
                name: "h1",
                class: "help-header",
                content: [
                    {
                        name: "button",
                        content: "\xd7",
                        attrs: {title: "Exit Help"},
                        events: {
                            click() {
                                dialog.remove();
                                document.getElementById("header")!.inert = false;
                                document.getElementById("panels")!.inert = false;
                            }
                        }
                    },
                    "Help"
                ],
            } as CEOptions
        ].concat(relevantArticles.length > 0 ? [
            {name: "h2", content: "Relevant articles"},
            ...prepareArticles(relevantArticles),
            {name: "h2", content: "Other articles"},
            ...prepareArticles(otherArticles)
        ] as CEOptions[] : prepareArticles(otherArticles)),
        events: {click(event) {event.stopPropagation();}}
    }));
});

//#endregion

//#region Panel: Onboarding 1

document.getElementById("onboarding-1-next")!.addEventListener("click", async () => {
    const name = (document.getElementById("onboarding-name") as HTMLInputElement).value;
    if (!name) {
        pulseColor(document.getElementById("onboarding-name")!, "#f00");
        return;
    }
    const role = Array.from(document.querySelectorAll<HTMLInputElement>("input[name=onboarding-role]")).find(el => el.checked)?.value;
    if (role !== "stands" && role !== "pits") {
        pulseColor(document.getElementById("onboarding-role-c")!, "#f00");
        return;
    }
    scouterName = name;
    scouterRole = role;
    await switchToPanel("onboarding-2");
});

//#endregion

//#region Panel: Onboarding 2

document.getElementById("panel-onboarding-2")!.addEventListener("transitionedto", () => {
    {
        const entries = Object.entries(localStorage).map(([k, v]) => {
            try {
                const isData = checkStorageData(JSON.parse(v));
                const isPrefixed = k.startsWith(STORAGE_PREFIX);
                if (!isPrefixed && isData) {
                    const newKey = STORAGE_PREFIX + k;
                    console.log(`Renaming key '${k}' to '${newKey}'`);
                    localStorage.setItem(newKey, v);
                    localStorage.removeItem(k);
                    return [newKey, v] as [string, StorageData];
                }
                if (isPrefixed && isData) return [k, v] as [string, StorageData];
            } catch (e) {}
            return undefined;
        }).filter(e => typeof e != "undefined");
        const el = document.getElementById("onboarding-storage-local-items") as HTMLDataListElement;
        el.childNodes.forEach(n => n.remove());
        for (const [key] of entries) {
            el.appendChild(ce({
                name: "option",
                content: key.replace(STORAGE_PREFIX, "")
            }));
        }
    }
    directory = storageKey = configuration = entries = storageData = undefined;
});

document.getElementById("onboarding-storage-folder")!.addEventListener("click", async () => {
    try {
        if (typeof window.showDirectoryPicker != "function") {
            document.getElementById("onboarding-2-folder-unsupported")!.classList.remove("hidden");
            return;
        }
        directory = await window.showDirectoryPicker({
            id: "event-data-location"
        });
        const configFile = await directory.getFileHandle("config.json", {create: false}).catch(() => undefined);
        if (configFile) {
            try {
                configuration = JSON.parse(await (await configFile.getFile()).text());
            } catch (e) {
                configuration = undefined;
            }
            if (!checkConfiguration(configuration)) {
                await switchToPanel("configuration");
                return;
            }
            entries = {};
            storageData = {config: configuration, entries};
            for await (const entry of directory.values()) {
                try {
                    if (entry instanceof FileSystemFileHandle) {
                        const file = await entry.getFile();
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (!checkEntry(data)) continue;
                        if (!("team" in data) || !checkTeam(data.team)) continue;
                        const team = data.team;
                        delete data.team;
                        entries[team.number] ??= [];
                        entries[team.number].push(data);
                    }
                } catch (e) {}
            }
            await switchToPanel("teams");
        } else {
            await switchToPanel("configuration");
        }
    } catch (e) {
        if (!String(e).match(/abort/i)) throw e; // discard Promise rejections caused by the user changing their mind
    }
});

document.getElementById("onboarding-2-next")!.addEventListener("click", async () => {
    const key = (document.getElementById("onboarding-storage-local-item") as HTMLInputElement).value;
    if (!key) {
        pulseColor(document.getElementById("onboarding-storage-local-item")!, "#f00");
        return;
    }
    storageKey = STORAGE_PREFIX + key;
    let data: unknown;
    try {
        data = JSON.parse(localStorage.getItem(storageKey) || "");
    } catch (e) {}
    if (checkStorageData(data)) {
        storageData = data;
        configuration = data.config;
        entries = data.entries;
        await switchToPanel("teams");
    } else {
        await switchToPanel("configuration");
    }
});

//#endregion

//#region Panel: Select Configuration

document.getElementById("config-back")!.addEventListener("click", async () => {
    await back();
});

document.getElementById("config-import")!.addEventListener("click", async () => {
    await switchToPanel("import-configuration");
});

document.getElementById("config-create")!.addEventListener("click", async () => {
    await switchToPanel("create-configuration");
});

document.getElementById("config-teams")!.addEventListener("input", function(this: HTMLTextAreaElement) {
    const teamsDisplay = document.getElementById("config-teams-display")!;
    Array.from(teamsDisplay.children).forEach(el => el.remove());
    const value = this.value.trim();
    const split = value.includes("\n\n") ? value.split("\n\n").map(v => v.split("\n")) : value.split("\n").map(v => v.split("\t"));
    const teams = [];
    for (const item of split) {
        if (item.length < 1 || item.length > 3) continue;
        let [teamNumber, teamName, location] = item;
        if (!teamNumberRegex.test(teamNumber)) {
            if (!teamName && teamNumberNameRegex.test(teamNumber)) {
                const i = teamNumber.indexOf(" ");
                teamName = teamNumber.slice(i + 1);
                teamNumber = teamNumber.slice(0, i);
            } else continue;
        }
        teams.push({number: teamNumber, name: teamName, location});
    }
    teamsDisplay.appendChild(ce({
        name: "table",
        content: [
            {
                name: "tr",
                content: [
                    {
                        name: "th",
                        content: "Team Number"
                    },
                    {
                        name: "th",
                        content: "Team Name"
                    },
                    {
                        name: "th",
                        content: "Location"
                    }
                ]
            },
            ...teams.map(team => ({
                name: "tr",
                content: [
                    {
                        name: "td",
                        content: team.number
                    },
                    {
                        name: "td",
                        content: team.name
                    },
                    {
                        name: "td",
                        content: team.location
                    }
                ]
            } satisfies CEOptions))
        ]
    }));
});

document.getElementById("config-next")!.addEventListener("click", async () => {
    const seasonConfig: SeasonConfig | null = JSON.parse(Array.from(document.querySelectorAll<HTMLInputElement>("input[name=config-preset]")).find(el => el.checked)?.value || "null");
    if (!seasonConfig) return;
    const value = (document.getElementById("config-teams") as HTMLTextAreaElement).value.trim();
    const split = value.includes("\n\n") ? value.split("\n\n").map(v => v.split("\n")) : value.split("\n").map(v => v.split("\t"));
    const teams = [];
    for (const item of split) {
        if (item.length < 1 || item.length > 3) continue;
        let [teamNumber, teamName, location] = item;
        if (!teamNumberRegex.test(teamNumber)) {
            if (!teamName && teamNumberNameRegex.test(teamNumber)) {
                const i = teamNumber.indexOf(" ");
                teamName = teamNumber.slice(i + 1);
                teamNumber = teamNumber.slice(0, i);
            } else continue;
        }
        teams.push({number: teamNumber, name: teamName, location});
    }
    if (teams.length < 1) {
        pulseColor(document.getElementById("config-teams")!, "#f00");
        return;
    }
    configuration = {
        ...seasonConfig,
        teams
    };
    await saveConfiguration();
    await switchToPanel("teams");
});

//#endregion

//#region Panel: Import Config from QR Code

let configReader: Html5Qrcode | undefined;

document.getElementById("import-config-back")!.addEventListener("click", async () => {
    if (configReader) {
        configReader.stop();
        configReader = undefined;
    }
    await switchToPanel("teams");
});

document.getElementById("panel-import-configuration")!.addEventListener("transitionedto", async () => {
    configReader = new Html5Qrcode("import-config-reader");
    const scanned = new Set<string>();
    const codes: {[x: number]: string[]} = {};
    await configReader.start(
        {
            facingMode: "environment" // prefer environment, but also prefer having camera over no camera
        },
        {
            fps: 10
        },
        (text, result) => {
            (async () => {
                console.log(text);
                if (!text.startsWith(SCOUT_CONF_PREFIX)) return;
                text = text.slice(SCOUT_CONF_PREFIX.length);
                if (scanned.has(text)) return; // ignore duplicates
                scanned.add(text);
                const m = text.match(/^(\d+)\/(\d+):/);
                if (!m) return;
                const n = +m[1], total = +m[2];
                codes[total] ??= Array(total).fill(undefined);
                codes[total][n - 1] ??= text.slice(m.length);
                if (codes[total].every(c => typeof c != "undefined")) {
                    const data = codes[total].join("");
                    const arr = new Uint8Array(data.length);
                    for (let i = 0; i < data.length; i++) {
                        arr[i] = data.charCodeAt(i);
                    }
                    console.log(arr);
                    const unzipped = ungzip(arr, {to: "string"});
                    console.log(unzipped);
                    const conf = JSON.parse(unzipped);
                    if (!checkConfiguration(conf)) return;
                    configuration = conf;
                    await saveConfiguration();
                    if (configReader) {
                        configReader.stop();
                        configReader = undefined;
                    }
                    await switchToPanel("teams");
                }
            })();
        },
        (err) => {}
    );
});

//#endregion

//#region Panel: Create Configuration

function createSectionItemTypeChange(item: HTMLDivElement) {
    Array.from(item.children).slice(5).forEach(el => el.remove());
    switch (item.querySelector<HTMLSelectElement>(".create-section-item-type-select")!.value) {
        case "select": {
            item.appendChild(ce({
                name: "div",
                class: "create-section-item-options",
                content: [
                    {
                        name: "label",
                        content: [
                            "List choices here, one per line.",
                            {
                                name: "textarea",
                                rows: 4,
                                class: "create-section-item-select-options",
                                value: "Consistently\nGenerally\nRarely\nNever",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    }
                ]
            }));
            break;
        }
        case "short-text": {
            item.appendChild(ce({
                name: "div",
                class: "create-section-item-options",
                content: [
                    {
                        name: "label",
                        content: [
                            "List optional suggestions here, one per line.",
                            {
                                name: "textarea",
                                rows: 4,
                                class: "create-section-item-short-text-suggestions",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    }
                ]
            }));
            break;
        }
        case "text": break;
        case "number": {
            item.appendChild(ce({
                name: "div",
                class: "create-section-item-options",
                content: [
                    {
                        name: "label",
                        content: [
                            "Minimum value (optional) ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-number-min",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Default value (optional) ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-number-default",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Maximum value (optional) ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-number-max",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Step between values (optional) ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-number-step",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    }
                ]
            }));
            break;
        }
        case "slider": {
            item.appendChild(ce({
                name: "div",
                class: "create-section-item-options",
                content: [
                    {
                        name: "label",
                        content: [
                            "Minimum value ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-slider-min",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Default value ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-slider-default",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Maximum value ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-slider-max",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    },
                    {
                        name: "label",
                        content: [
                            "Step between values (optional) ",
                            {
                                name: "input",
                                type: "number",
                                class: "create-section-item-slider-step",
                                attrs: {name: makeid(16, 64)}
                            }
                        ]
                    }
                ]
            }));
            break;
        }
        case "checkbox": break;
    }
}

function createSectionAddItem(section: HTMLDivElement) {
    const item = section.querySelector(".create-section-items")!.insertBefore(ce({
        name: "div",
        class: "create-section-item",
        content: [
            {
                name: "label",
                content: [
                    "Label ",
                    {
                        name: "input",
                        style: {display: "inline"},
                        class: "create-section-item-label",
                        type: "text",
                        attrs: {name: makeid(16, 64)}
                    }
                ]
            },
            {
                name: "label",
                content: [
                    "Type ",
                    {
                        name: "select",
                        class: "create-section-item-type-select",
                        style: {display: "inline"},
                        content: [
                            {name: "option", value: "select", content: "Choice"},
                            {name: "option", value: "short-text", content: "Short Text", selected: true},
                            {name: "option", value: "text", content: "Text"},
                            {name: "option", value: "number", content: "Number"},
                            {name: "option", value: "slider", content: "Number Slider"},
                            {name: "option", value: "checkbox", content: "Checkbox"}
                        ],
                        attrs: {name: makeid(16, 64)},
                        events: {change() {createSectionItemTypeChange(item)}}
                    }
                ]
            },
            {
                name: "button",
                class: "create-section-item-remove",
                content: "\xd7",
                events: {click() {item.remove();}}
            },
            {
                name: "button",
                class: "create-section-item-add-before",
                content: "+",
                events: {click() {createAddSection(section)}}
            },
            {
                name: "button",
                class: "create-section-item-reorder",
                content: "\u21c5",
                events: {click() {
                    section.querySelector(".create-section-items")!.insertBefore(item, item.previousElementSibling);
                }}
            }
        ]
    }), section.querySelector(".create-section-add-item"));
    createSectionItemTypeChange(item);
}

function createAddSection(before: Node | null = null) {
    const titleName = makeid(16, 64), standsName = makeid(16, 64), pitsName = makeid(16, 64);
    const section = document.querySelector(".create-sections")!.insertBefore(ce({
        name: "div",
        class: "create-section",
        content: [
            {
                name: "input",
                type: "text",
                class: "create-section-title",
                attrs: {name: titleName}
            },
            {
                name: "label",
                content: [
                    {
                        name: "input",
                        type: "checkbox",
                        class: "create-section-show-in-stands",
                        checked: true,
                        attrs: {name: standsName}
                    },
                    "Stands"
                ]
            },
            {
                name: "label",
                content: [
                    {
                        name: "input",
                        type: "checkbox",
                        class: "create-section-show-in-pits",
                        checked: true,
                        attrs: {name: pitsName}
                    },
                    "Pits"
                ]
            },
            {
                name: "button",
                class: "create-section-remove",
                content: "\xd7",
                events: {click() {section.remove();}}
            },
            {
                name: "button",
                class: "create-section-add-before",
                content: "+",
                events: {click() {createAddSection(section)}}
            },
            {
                name: "button",
                class: "create-section-reorder",
                content: "\u21c5",
                events: {click() {
                    document.querySelector(".create-sections")!.insertBefore(section, section.previousElementSibling);
                }}
            },
            {
                name: "div",
                class: "create-section-items",
                content: [
                    {
                        name: "button",
                        class: "create-section-add-item",
                        content: "+",
                        events: {click() {createSectionAddItem(section)}}
                    }
                ]
            }
        ]
    }), before);
    section.scrollIntoView();
    createSectionAddItem(section);
}

document.getElementById("panel-create-configuration")!.addEventListener("transitionedto", () => {
    Array.from(document.getElementById("create-sections-c")!.children).forEach(el => el.remove());
    document.getElementById("create-sections-c")!.appendChild(ce({
        name: "div",
        class: "create-sections"
    }));
    document.getElementById("create-sections-c")!.appendChild(ce({
        name: "button",
        class: "create-add-section",
        content: "+",
        events: {click() {createAddSection()}}
    }));
    createAddSection();
});

document.getElementById("create-cancel")!.addEventListener("click", async () => {
    await switchToPanel("configuration");
});

document.getElementById("create-done")!.addEventListener("click", async () => {
    const competition = (document.getElementById("create-competition") as HTMLInputElement).value;
    if (!competition) {
        pulseColor(document.getElementById("create-competition")!, "#f00");
        return;
    }
    const id = makeid(16, 16);
    (document.getElementById("config-presets")!.appendChild(ce({
        name: "span",
        content: [
            {
                name: "input",
                attrs: {
                    type: "radio",
                    name: "config-preset",
                    value: JSON.stringify({
                        competition,
                        sections: Array.from(document.querySelector(".create-sections")?.querySelectorAll(".create-section") || []).map(section => ({
                            title: throwAndPulseColorIf(
                                section.querySelector<HTMLInputElement>(".create-section-title")?.value || "",
                                v => !v,
                                section.querySelector<HTMLInputElement>(".create-section-title")!,
                                "#f00",
                                0
                            ),
                            items: Array.from(section.querySelectorAll<HTMLDivElement>(".create-section-item")).map(item => {
                                const result: Partial<ScoutItem> = {
                                    label: throwAndPulseColorIf(
                                        item.querySelector<HTMLInputElement>(".create-section-item-label")?.value || "",
                                        v => !v,
                                        item.querySelector<HTMLInputElement>(".create-section-item-label")!,
                                        "#f00",
                                        0
                                    ),
                                    type: throwAndPulseColorIf(
                                        item.querySelector<HTMLInputElement>(".create-section-item-type-select")?.value || "",
                                        v => !v,
                                        item.querySelector<HTMLInputElement>(".create-section-item-type-select")!,
                                        "#f00",
                                        0
                                    ) as ScoutItem["type"]
                                };
                                switch (result.type) {
                                    case "select": {
                                        result.options = item.querySelector<HTMLTextAreaElement>(".create-section-item-select-options")!.value.trim().split("\n").map(v => v.trim())
                                        if (!result.options) pulseColor(item.querySelector<HTMLTextAreaElement>(".create-section-item-select-options")!, "#f00");
                                        break;
                                    }
                                    case "short-text": {
                                        result.suggestions = item.querySelector<HTMLTextAreaElement>(".create-section-item-short-text-suggestions")!.value.trim().split("\n").map(v => v.trim()) || undefined;
                                        break;
                                    }
                                    case "text": break;
                                    case "number": {
                                        result.min = +item.querySelector<HTMLInputElement>(".create-section-item-number-min")!.value;
                                        if (isNaN(result.min)) result.min = undefined;
                                        result.default = +item.querySelector<HTMLInputElement>(".create-section-item-number-default")!.value;
                                        if (isNaN(result.default)) result.default = undefined;
                                        result.max = +item.querySelector<HTMLInputElement>(".create-section-item-number-max")!.value;
                                        if (isNaN(result.max)) result.max = undefined;
                                        result.step = +item.querySelector<HTMLInputElement>(".create-section-item-number-step")!.value;
                                        if (isNaN(result.step)) result.step = undefined;
                                        break;
                                    }
                                    case "slider": {
                                        result.min = +item.querySelector<HTMLInputElement>(".create-section-item-slider-min")!.value;
                                        if (isNaN(result.min)) pulseColor(item.querySelector<HTMLInputElement>(".create-section-item-slider-min")!, "#f00");
                                        result.default = +item.querySelector<HTMLInputElement>(".create-section-item-slider-default")!.value;
                                        if (isNaN(result.default)) pulseColor(item.querySelector<HTMLInputElement>(".create-section-item-slider-default")!, "#f00");
                                        result.max = +item.querySelector<HTMLInputElement>(".create-section-item-slider-max")!.value;
                                        if (isNaN(result.max)) pulseColor(item.querySelector<HTMLInputElement>(".create-section-item-slider-max")!, "#f00");
                                        result.step = +item.querySelector<HTMLInputElement>(".create-section-item-slider-step")!.value;
                                        if (isNaN(result.step)) result.step = undefined;
                                        break;
                                    }
                                    case "checkbox": break;
                                }
                                return result as ScoutItem;
                            }),
                            stands: section.querySelector<HTMLInputElement>(".create-section-show-in-stands")!.checked,
                            pits: section.querySelector<HTMLInputElement>(".create-section-show-in-pits")!.checked
                        } satisfies ScoutSection))
                    } satisfies SeasonConfig),
                    id: "preset-" + id
                }
            },
            {
                name: "label",
                htmlFor: "preset-" + id,
                content: competition
            }
        ]
    })).firstElementChild as HTMLElement).click();
    await switchToPanel("configuration");
});

//#endregion

//#region Panel: Teams List

document.getElementById("panel-teams")!.addEventListener("transitionedto", () => {
    const teamsList = document.getElementById("teams-list")!;
    Array.from(teamsList.children).forEach(el => el.remove());
    if (!configuration) return;
    entries ??= {};
    teamsList.appendChild(ce({name: "span", class: "teams-list-header", content: "#"}));
    teamsList.appendChild(ce({name: "span", class: "teams-list-header", content: "Name"}));
    teamsList.appendChild(ce({name: "span", class: "teams-list-header", content: "Stands Entries"}));
    teamsList.appendChild(ce({name: "span", class: "teams-list-header", content: "Pit Scouted / By"}));
    teamsList.appendChild(ce({name: "span", class: "teams-list-header"}));
    const now = Date.now();
    for (const [index, team] of configuration.teams.entries()) {
        const teamEntries = (entries[team.number] || []).toSorted((a, b) => b.when - a.when);
        const latestPitsEntry = teamEntries.filter(e => e.type == "pits").at(0);
        let pitScouted = latestPitsEntry ? "Done" : "";
        if (latestPitsEntry?.willChange) {
            if (latestPitsEntry.willChange > now) {
                let diff = latestPitsEntry.willChange - now;
                const parts: [string, number][] = [
                    ["ms", 1000],
                    ["s", 60],
                    ["m", 60],
                    ["h", 24],
                    ["d", 7],
                    ["w", 52],
                    ["y", 1000],
                    ["m", Infinity]
                ];
                const values: [string, number][] = [];
                for (const [unit, count] of parts) {
                    values.push([unit, diff % count]);
                    diff = Math.floor(diff / count);
                    if (diff === 0) break;
                }
                pitScouted = `Changes in ${values.reverse().slice(0, 2).map(([unit, val]) => `${val}${unit}`).join(" ")}`;
            } else pitScouted = "Revisit";
        }
        if (pitScouted && latestPitsEntry?.by) pitScouted += " / " + latestPitsEntry?.by;
        teamsList.appendChild(ce({
            name: "span",
            style: {gridRow: `${index + 2}`, gridColumn: "1"},
            content: team.number
        }));
        teamsList.appendChild(ce({
            name: "span",
            style: {gridRow: `${index + 2}`, gridColumn: "2"},
            content: team.name
        }));
        teamsList.appendChild(ce({
            name: "span",
            style: {textAlign: "center", gridRow: `${index + 2}`, gridColumn: "3"},
            content: teamEntries.filter(e => e.type == "stands").length.toString()
        }));
        teamsList.appendChild(ce({
            name: "span",
            style: {textAlign: "right", gridRow: `${index + 2}`, gridColumn: "4"},
            content: pitScouted
        }));
        teamsList.appendChild(ce({
            name: "button",
            style: {gridRow: `${index + 2}`, gridColumn: "5", marginInline: "1ch"},
            attrs: {title: `View all entries for ${team.number}: ${team.name}`},
            content: [
                {
                    name: "svg:svg",
                    attrs: {
                        xmlns: "http://www.w3.org/2000/svg",
                        viewBox: "0 0 16 16",
                    },
                    content: [
                        {
                            name: "svg:path",
                            attrs: {
                                d: "M2,2 L14,2 M2,8 L14,8 M2,14 L14,14",
                            },
                            style: {
                                stroke: "var(--color)",
                                strokeWidth: "1"
                            }
                        }
                    ],
                }
            ],
            events: {
                async click() {
                    await switchToPanel("team-entries", team);
                }
            }
        }));
        teamsList.appendChild(ce({
            name: "div",
            class: "teams-list-row-bg",
            style: {gridRow: `${index + 2}`, gridColumn: "1 / -1"},
            attrs: {tabindex: "0", title: `Scout team ${team.number}: ${team.name}`},
            events: {
                async click() {
                    await switchToPanel("scout-" + scouterRole, team);
                },
                keydown(event) {
                    if (event.key == "Enter" || event.key == " ") {
                        event.preventDefault();
                        this.click();
                    }
                },
            }
        }));
    }
    if (storageKey) document.getElementById("teams-remove-data")!.style.removeProperty("display");
    else document.getElementById("teams-remove-data")!.style.display = "none";
});

document.getElementById("teams-export-config")!.addEventListener("click", async () => {
    await switchToPanel("export-configuration");
});

document.getElementById("teams-skip-list")!.addEventListener("click", () => {
    document.getElementById("teams-import-csv")!.focus();
});

document.getElementById("teams-back")!.addEventListener("click", async () => {
    await back();
});

document.getElementById("teams-import-csv")!.addEventListener("click", async () => {
    await switchToPanel("import-csv");
});

document.getElementById("teams-export-csv")!.addEventListener("click", async () => {
    await switchToPanel("export-csv");
});

document.getElementById("teams-import-qr")!.addEventListener("click", async () => {
    await switchToPanel("import-qr");
});

document.getElementById("teams-export-qr")!.addEventListener("click", async () => {
    await switchToPanel("export-qr");
});

let removeDataProgress = 0, removeDataThen = 0, removeDataHeld = new Set<string>(), removeDataCycleRunning = false;

document.getElementById("teams-remove-data")!.addEventListener("pointerdown", (event) => {
    removeDataHeld.add("pointer-" + event.pointerId);
    if (!removeDataCycleRunning) {
        removeDataThen = Date.now() * 0.001;
        requestAnimationFrame(removeDataCycle);
        removeDataCycleRunning = true;
    }
});

document.getElementById("teams-remove-data")!.addEventListener("pointerup", (event) => {
    removeDataHeld.delete("pointer-" + event.pointerId);
});

document.getElementById("teams-remove-data")!.addEventListener("pointerleave", (event) => {
    removeDataHeld.delete("pointer-" + event.pointerId);
});

document.getElementById("teams-remove-data")!.addEventListener("contextmenu", (event) => {
    if (event instanceof PointerEvent && event.pointerType !== "mouse") {
        event.preventDefault(); // Prevents long-press context menu
    }
});

document.getElementById("teams-remove-data")!.addEventListener("keydown", (event) => {
    if (event.code == "Enter" || event.code == "Space") {
        removeDataHeld.add("keyboard-" + event.code.toLowerCase());
        if (!removeDataCycleRunning) {
            removeDataThen = Date.now() * 0.001;
            requestAnimationFrame(removeDataCycle);
            removeDataCycleRunning = true;
        }
    }
});

document.getElementById("teams-remove-data")!.addEventListener("keyup", (event) => {
    if (event.code == "Enter" || event.code == "Space") {
        removeDataHeld.delete("keyboard-" + event.code.toLowerCase());
    }
});

window.addEventListener("blur", () => {
    removeDataHeld.clear();
});

function removeDataCycle() {
    const now = Date.now() * 0.001;
    const delta = now - removeDataThen;
    removeDataThen = now;
    removeDataCycleRunning = false;
    if (removeDataHeld.size > 0) removeDataProgress += 0.35 * delta;
    else removeDataProgress *= Math.pow(0.01, delta);
    A: {
        if (removeDataHeld.size == 0 && removeDataProgress < 0.01) {
            removeDataProgress = 0;
            break A;
        }
        if (removeDataProgress >= 1) {
            removeDataProgress = 1;
            removeDataHeld.clear();
            
            // actually do the thing
            if (storageKey) {
                localStorage.removeItem(storageKey);
                storageKey = configuration = entries = storageData = undefined;
                switchToPanel("onboarding-2");
            }
        }
        requestAnimationFrame(removeDataCycle);
        removeDataCycleRunning = true;
    }
    document.getElementById("teams-remove-data")!.style.setProperty("--gr-pc", removeDataProgress * 100 + "%");
}

//#endregion

//#region Panel: Export Configuration to QR Code

document.getElementById("export-config-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

(document.getElementById("export-config-pixelate") as HTMLInputElement).addEventListener("input", function () {
    document.getElementById("export-config-images")!.classList[this.checked ? "remove" : "add"]("unpixelated")
});

document.getElementById("panel-export-configuration")!.addEventListener("transitionedto", async () => {
    if (!configuration) throw new Error();
    const imgSection = document.getElementById("export-config-images")!;
    Array.from(imgSection.children).forEach(el => el.remove());
    const conf = JSON.stringify(configuration);
    const gzipped = gzip(conf, {level: 9});
    let code = "";
    for (let i = 0; i < gzipped.length; i++) {
        code += String.fromCharCode(gzipped[i]);
    }
    let urls: string[], count = 1;
    while (true) {
        try {
            urls = [];
            for (let i = 0; i < count; i++) {
                urls.push(await toDataURL(`${SCOUT_CONF_PREFIX}${i + 1}/${count}:${code.slice(Math.floor(i * code.length / count), Math.floor((i + 1) * code.length / count))}`, {
                    errorCorrectionLevel: "L"
                }));
            }
            break;
        } catch (e) {
            if (!String(e).toLowerCase().includes("too big to be stored in a qr code")) throw e;
            count++;
        }
    }
    for (const url of urls) {
        imgSection.appendChild(ce({
            name: "img",
            src: url
        }));
    }
});

//#endregion

//#region Panel: Entries for Team

document.getElementById("panel-team-entries")!.addEventListener("transitionedto", (event) => {
    const team = (event as CustomEvent<Team>).detail;
    document.getElementById("entries-header")!.innerText = `Entries for ${team.number}: ${team.name}`;
    const entriesList = document.getElementById("entries-list")!;
    Array.from(entriesList.children).forEach(el => el.remove());
    if (!entries || !entries[team.number] || entries[team.number].length < 1) {
        entriesList.classList.add("no-entries");
        entriesList.appendChild(ce({
            name: "p",
            content: "No Entries"
        }));
        return;
    }
    entriesList.classList.remove("no-entries");
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Type"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Scouter"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "When"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Changes"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header"}));
    for (const entry of entries[team.number].toSorted((a, b) => a.when - b.when)) {
        entriesList.appendChild(ce({name: "span", content: capitalizeFirst(entry.type)}));
        entriesList.appendChild(ce({name: "span", content: entry.by}));
        entriesList.appendChild(ce({name: "span", content: stringifyDate(entry.when)}));
        entriesList.appendChild(ce({name: "span", content: entry.type == "pits" && entry.willChange && stringifyDate(entry.willChange) || "-"}));
        const blinkDuration = 8 + Math.random() * 18;
        entriesList.appendChild(ce({
            name: "span",
            content: [
                {
                    name: "button",
                    attrs: {title: "Remove this entry"},
                    content: [
                        {
                            name: "svg:svg",
                            attrs: {
                                xmlns: "http://www.w3.org/2000/svg",
                                viewBox: "0 0 16 16",
                            },
                            content: [
                                {
                                    name: "svg:path",
                                    attrs: {
                                        d: "M2,2 L14,14 M14,2 L2,14",
                                    },
                                    style: {
                                        stroke: "var(--color)",
                                        strokeWidth: "1"
                                    }
                                }
                            ],
                        }
                    ],
                    events: {
                        async click() {
                            await removeEntry(team, entry);
                            // Refresh the teams list
                            document.getElementById("panel-team-entries")!.dispatchEvent(new CustomEvent("transitionedto", {
                                bubbles: false,
                                cancelable: false,
                                detail: team
                            }));
                        }
                    }
                },
                " ",
                {
                    name: "button",
                    attrs: {title: "View this entry"},
                    content: [
                        {
                            name: "svg:svg",
                            attrs: {
                                xmlns: "http://www.w3.org/2000/svg",
                                viewBox: "0 0 16 16",
                            },
                            content: [
                                {
                                    name: "svg:path",
                                    attrs: {
                                        d: "M2,8 Q8,2,14,8 Q8,14,2,8 Z",
                                        fill: "none"
                                    },
                                    style: {
                                        stroke: "var(--color)",
                                        strokeWidth: "1"
                                    }
                                },
                                {
                                    name: "svg:mask",
                                    attrs: {
                                        id: "blink-mask-" + blinkDuration
                                    },
                                    content: [
                                        {
                                            name: "svg:rect",
                                            attrs: {
                                                x: "0",
                                                y: "0",
                                                width: "16",
                                                height: "16",
                                                fill: "#fff"
                                            }
                                        },
                                        {
                                            name: "svg:rect",
                                            attrs: {
                                                x: "0",
                                                y: "0",
                                                width: "16",
                                                height: "0",
                                                fill: "#000"
                                            },
                                            content: [
                                                {
                                                    name: "svg:animate",
                                                    attrs: {
                                                        attributeName: "height",
                                                        values: "0;0;0;".repeat(Math.round(blinkDuration)) + "16;0",
                                                        dur: blinkDuration + "s",
                                                        repeatCount: "indefinite"
                                                    }
                                                }
                                            ]
                                        },
                                    ]
                                },
                                {
                                    name: "svg:circle",
                                    attrs: {
                                        cx: "8",
                                        cy: "8",
                                        r: "2",
                                        fill: "var(--color)",
                                        mask: `url(#blink-mask-${blinkDuration})`
                                    }
                                }
                            ],
                        }
                    ],
                    events: {
                        async click() {
                            await switchToPanel("view-" + entry.type, {entry, team});
                        }
                    }
                }
            ]
        }));
    }
});

document.getElementById("entries-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

document.getElementById("entries-new")!.addEventListener("click", async () => {
    const teamNumber = (document.getElementById("entries-header")!.innerText.match(/\d+\w*/) || "")[0];
    await switchToPanel("scout-" + scouterRole, getTeam(teamNumber));
});

//#endregion

//#region Panel: View Stands Entry

document.getElementById("panel-view-stands")!.addEventListener("transitionedto", function(this: HTMLDivElement, event) {
    const {team, entry} = (event as CustomEvent<{team: Team, entry: StandsScoutData}>).detail;
    if (!configuration) return;
    document.getElementById("view-stands-header-1")!.innerText = `Entry by ${entry.by}`;
    document.getElementById("view-stands-header-2")!.innerText = `at ${stringifyDate(entry.when)}`;
    document.getElementById("view-stands-header-3")!.innerText = `for ${team.number}: ${team.name}`;
    document.getElementById("view-stands-match-number")!.innerText = String(entry.matchNumber);
    document.getElementById("view-stands-match-type")!.innerText = capitalizeFirst(entry.matchType);
    document.getElementById("view-stands-alliance-score")!.innerText = String(entry.allianceScore);
    document.getElementById("view-stands-won")!.dataset.checked = String(entry.won);
    document.getElementById("view-stands-carried")!.dataset.checked = String(entry.carried);
    document.getElementById("view-stands-were-carried")!.dataset.checked = String(entry.wereCarried);
    document.getElementById("view-stands-a-stopped")!.dataset.checked = String(entry.aStop);
    document.getElementById("view-stands-e-stopped")!.dataset.checked = String(entry.eStop);
    document.getElementById("view-stands-died")!.dataset.checked = String(entry.died);
    document.getElementById("view-stands-dropped-items")!.dataset.checked = String(entry.droppedItems);
    document.getElementById("view-stands-drive-rating")!.innerText = String(entry.driveRating);
    document.getElementById("view-stands-cycle-time")!.innerText = String(entry.cycleTime);
    const footer = document.getElementById("view-stands-footer")!;
    document.querySelectorAll("#panel-view-stands > .view-section.view-section-seasonal").forEach(el => el.remove());
    const secMatch = document.getElementById("view-stands-sec-match")!;
    const secDriving = document.getElementById("view-stands-sec-driving")!;
    const sections = [secMatch, secDriving];
    for (const [title, items] of Object.entries(entry.data)) {
        const el = ce({
            name: "div",
            class: ["view-section", "view-section-seasonal"],
            content: [
                {name: "h2", content: title}
            ]
        });
        sections.push(el);
        document.getElementById("panel-view-stands")!.insertBefore(el, footer);
        for (const [label, value] of Object.entries(items)) {
            el.appendChild(ce({
                name: "p",
                content: [
                    {name: "strong", content: `${label}:`},
                    ` ${typeof value == "undefined" ? "-" : value}`
                ]
            }));
        }
    }
    masonry(sections, 2, 1);
});

document.getElementById("view-stands-back-1")!.addEventListener("click", async () => {
    const teamNumber = document.getElementById("view-stands-header-3")!.innerText.match(/for (\d+\w*): /)?.[1] || "";
    await switchToPanel("team-entries", getTeam(teamNumber));
});

document.getElementById("view-stands-back-2")!.addEventListener("click", async () => {
    const teamNumber = document.getElementById("view-stands-header-3")!.innerText.match(/for (\d+\w*): /)?.[1] || "";
    await switchToPanel("team-entries", getTeam(teamNumber));
});

//#endregion

//#region Panel: View Pits Entry

document.getElementById("panel-view-pits")!.addEventListener("transitionedto", function(this: HTMLDivElement, event) {
    const {team, entry} = (event as CustomEvent<{team: Team, entry: PitsScoutData}>).detail;
    if (!configuration) return;
    document.getElementById("view-pits-header-1")!.innerText = `Entry by ${entry.by}`;
    document.getElementById("view-pits-header-2")!.innerText = `at ${stringifyDate(entry.when)}`;
    document.getElementById("view-pits-header-3")!.innerText = `for ${team.number}: ${team.name}`;
    document.getElementById("view-pits-drivetrain")!.innerText = entry.drivetrain;
    document.getElementById("view-pits-leds")!.innerText = entry.leds;
    document.getElementById("view-pits-cycle-time")!.innerText = String(entry.cycleTime);
    document.getElementById("view-pits-will-change")!.dataset.checked = String(entry.willChange);
    document.getElementById("view-pits-will-change-at")!.innerText = entry.willChange && stringifyDate(entry.willChange) || "";
    const footer = document.getElementById("view-pits-footer")!;
    document.querySelectorAll("#panel-view-pits > .view-section.view-section-seasonal").forEach(el => el.remove());
    const secRobot = document.getElementById("view-pits-sec-robot")!;
    const sections = [secRobot];
    for (const [title, items] of Object.entries(entry.data)) {
        const el = ce({
            name: "div",
            class: ["view-section", "view-section-seasonal"],
            content: [
                {name: "h2", content: title}
            ]
        });
        sections.push(el);
        document.getElementById("panel-view-pits")!.insertBefore(el, footer);
        for (const [label, value] of Object.entries(items)) {
            el.appendChild(ce({
                name: "p",
                content: [
                    {name: "strong", content: `${label}:`},
                    ` ${typeof value == "undefined" ? "-" : value}`
                ]
            }));
        }
    }
    masonry(sections, 2, 1);
});

document.getElementById("view-pits-back-1")!.addEventListener("click", async () => {
    const teamNumber = document.getElementById("view-pits-header-3")!.innerText.match(/for (\d+\w*): /)?.[1] || "";
    await switchToPanel("team-entries", getTeam(teamNumber));
});

document.getElementById("view-pits-back-2")!.addEventListener("click", async () => {
    const teamNumber = document.getElementById("view-pits-header-3")!.innerText.match(/for (\d+\w*): /)?.[1] || "";
    await switchToPanel("team-entries", getTeam(teamNumber));
});

//#endregion

//#region Panel: Scout (Stands)

document.getElementById("panel-scout-stands")!.addEventListener("transitionedto", (event) => {
    const team = (event as CustomEvent<Team>).detail;
    if (!configuration) return;
    document.getElementById("scout-stands-team-number")!.innerText = team.number;
    document.getElementById("scout-stands-team-name")!.innerText = team.name;
    document.getElementById("scout-stands-team-location")!.innerText = team.location || "";
    (document.getElementById("scout-stands-match-number") as HTMLInputElement).value = "";
    (document.getElementById("scout-stands-match-type") as HTMLSelectElement).value = "";
    (document.getElementById("scout-stands-alliance-score") as HTMLInputElement).value = "";
    (document.getElementById("scout-stands-won") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-carried") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-were-carried") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-a-stopped") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-e-stopped") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-died") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-dropped-items") as HTMLInputElement).checked = false;
    (document.getElementById("scout-stands-defense-notes") as HTMLTextAreaElement).value = "";
    (document.getElementById("scout-stands-offense-notes") as HTMLTextAreaElement).value = "";
    (document.getElementById("scout-stands-drive-rating") as HTMLInputElement).value = "";
    (document.getElementById("scout-stands-cycle-time") as HTMLInputElement).value = "";
    const footer = document.getElementById("scout-stands-footer");
    document.querySelectorAll("#panel-scout-stands > .scout-section.scout-section-seasonal").forEach(el => el.remove());
    const secMatch = document.getElementById("scout-stands-sec-match")!;
    const secDriving = document.getElementById("scout-stands-sec-driving")!;
    const sections = [secMatch, secDriving];
    for (const section of configuration.sections) {
        if (!section.stands) continue;
        const el = ce({
            name: "div",
            class: ["scout-section", "scout-section-seasonal"],
            dataset: {title: section.title},
            content: [
                {name: "h2", content: section.title}
            ]
        });
        sections.push(el);
        document.getElementById("panel-scout-stands")!.insertBefore(el, footer);
        for (const item of section.items) {
            const name = makeid(16, 64);
            switch (item.type) {
                case "number": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "number",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name},
                                min: item.min?.toString(),
                                value: item.default?.toString(),
                                max: item.max?.toString(),
                                step: item.step?.toString()
                            }
                        ]
                    }));
                    break;
                }
                case "select": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "select",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name},
                                content: item.options.map(opt => ({
                                    name: "option",
                                    content: opt
                                } satisfies CEOptions))
                            }
                        ]
                    }));
                    break;
                }
                case "text": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "textarea",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name}
                            }
                        ]
                    }));
                    break;
                }
                case "short-text": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "text",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name},
                            }
                        ]
                    }));
                    if (item.suggestions) {
                        el.lastElementChild!.lastElementChild!.setAttribute("list", "scout-stands-list-" + name),
                        el.lastElementChild!.appendChild(ce({
                            name: "datalist",
                            id: "scout-stands-list-" + name,
                            content: item.suggestions.map(opt => ({
                                name: "option",
                                content: opt
                            } satisfies CEOptions))
                        }));
                    }
                    break;
                }
                case "slider": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "range",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name},
                                min: item.min.toString(),
                                value: item.default.toString(),
                                max: item.max.toString(),
                                step: item.step?.toString()
                            }
                        ]
                    }));
                    break;
                }
                case "checkbox": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-stands-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "checkbox",
                                dataset: {label: item.label},
                                id: "scout-stands-" + name,
                                attrs: {name: "scout-stands-" + name},
                            }
                        ]
                    }));
                    break;
                }
            }
        }
    }
    masonry(sections, 2, 1);
});

document.getElementById("scout-stands-back")!.addEventListener("click", async () => {
    await back();
});

(document.getElementById("scout-stands-save") as HTMLButtonElement).addEventListener("click", async function() {
    if (!entries) return;
    this.disabled = true;
    try {
        const teamNumber = document.getElementById("scout-stands-team-number")!.innerText;
        const entry: StandsScoutData = {
            type: "stands",
            by: scouterName || "(untitled scouter)",
            when: Date.now(),
            matchNumber: throwAndPulseColorIf(
                (document.getElementById("scout-stands-match-number") as HTMLInputElement).valueAsNumber,
                isNaN,
                document.getElementById("scout-stands-match-number")!,
                "#f00",
                0
            ),
            matchType: throwAndPulseColorIf(
                (document.getElementById("scout-stands-match-type") as HTMLSelectElement).value,
                v => v.length == 0,
                document.getElementById("scout-stands-match-type")!,
                "#f00",
                0
            ),
            allianceScore: throwAndPulseColorIf(
                (document.getElementById("scout-stands-alliance-score") as HTMLInputElement).valueAsNumber,
                isNaN,
                document.getElementById("scout-stands-alliance-score")!,
                "#f00",
                0
            ),
            won: (document.getElementById("scout-stands-won") as HTMLInputElement).checked,
            carried: (document.getElementById("scout-stands-carried") as HTMLInputElement).checked,
            wereCarried: (document.getElementById("scout-stands-were-carried") as HTMLInputElement).checked,
            aStop: (document.getElementById("scout-stands-a-stopped") as HTMLInputElement).checked,
            eStop: (document.getElementById("scout-stands-e-stopped") as HTMLInputElement).checked,
            died: (document.getElementById("scout-stands-died") as HTMLInputElement).checked,
            droppedItems: (document.getElementById("scout-stands-dropped-items") as HTMLInputElement).checked,
            defenseNotes: throwAndPulseColorIf(
                (document.getElementById("scout-stands-defense-notes") as HTMLTextAreaElement).value,
                v => v.length == 0,
                document.getElementById("scout-stands-defense-notes")!,
                "#f00",
                0
            ),
            offenseNotes: throwAndPulseColorIf(
                (document.getElementById("scout-stands-offense-notes") as HTMLTextAreaElement).value,
                v => v.length == 0,
                document.getElementById("scout-stands-offense-notes")!,
                "#f00",
                0
            ),
            driveRating: throwAndPulseColorIf(
                (document.getElementById("scout-stands-drive-rating") as HTMLInputElement).valueAsNumber,
                isNaN,
                document.getElementById("scout-stands-drive-rating")!,
                "#f00",
                0
            ),
            cycleTime: throwAndPulseColorIf(
                (document.getElementById("scout-stands-cycle-time") as HTMLInputElement).valueAsNumber,
                isNaN,
                document.getElementById("scout-stands-cycle-time")!,
                "#f00",
                0
            ),
            data: Object.fromEntries(Array.from(document.querySelectorAll<HTMLDivElement>("#panel-scout-stands .scout-section-seasonal")).map(sec =>
                [sec.dataset.title || "", Object.fromEntries(Array.from(sec.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")).map(el => [
                    el.dataset.label || "",
                    el instanceof HTMLInputElement ?
                        el.type == "checkbox" ? el.checked
                        : el.type == "number" || el.type == "range" ? +el.value
                        : el.value
                    : el.value
                ]))]
            ))
        };
        const team = getTeam(teamNumber);
        if (!team) return;
        await saveEntry(team, entry);
        await switchToPanel("teams");
    } catch (e) {
        if (typeof e != "number") throw e;
    } finally {
        this.disabled = false;
    }
});

//#endregion

//#region Panel: Scout (Pits)

document.getElementById("panel-scout-pits")!.addEventListener("transitionedto", (event) => {
    const team = (event as CustomEvent<Team>).detail;
    if (!configuration || !entries) return;
    document.getElementById("scout-pits-team-number")!.innerText = team.number;
    document.getElementById("scout-pits-team-name")!.innerText = team.name;
    document.getElementById("scout-pits-team-location")!.innerText = team.location || "";
    const latestPitsEntry = (entries[team.number] || []).filter(e => e.type == "pits").toSorted((a, b) => b.when - a.when).at(0);
    (document.getElementById("scout-pits-drivetrain") as HTMLInputElement).value = latestPitsEntry?.drivetrain || "";
    (document.getElementById("scout-pits-leds") as HTMLInputElement).value = latestPitsEntry?.leds || "";
    (document.getElementById("scout-pits-cycle-time") as HTMLInputElement).value = String(latestPitsEntry?.cycleTime || "");
    (document.getElementById("scout-pits-will-change") as HTMLInputElement).checked = false;
    (document.getElementById("scout-pits-will-change-at") as HTMLInputElement).value = "";
    const footer = document.getElementById("scout-pits-footer");
    document.querySelectorAll("#panel-scout-pits > .scout-section.scout-section-seasonal").forEach(el => el.remove());
    const secRobot = document.getElementById("scout-pits-sec-robot")!;
    const sections = [secRobot];
    for (const section of configuration.sections) {
        if (!section.pits) continue;
        const el = ce({
            name: "div",
            class: ["scout-section", "scout-section-seasonal"],
            dataset: {title: section.title},
            content: [
                {name: "h2", content: section.title}
            ]
        });
        sections.push(el);
        document.getElementById("panel-scout-pits")!.insertBefore(el, footer);
        for (const item of section.items) {
            const name = makeid(16, 64);
            switch (item.type) {
                case "number": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "number",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name},
                                min: item.min?.toString(),
                                value: item.default?.toString(),
                                max: item.max?.toString(),
                                step: item.step?.toString()
                            }
                        ]
                    }));
                    break;
                }
                case "select": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "select",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name},
                                content: item.options.map(opt => ({
                                    name: "option",
                                    content: opt
                                } satisfies CEOptions))
                            }
                        ]
                    }));
                    break;
                }
                case "text": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "textarea",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name}
                            }
                        ]
                    }));
                    break;
                }
                case "short-text": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "text",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name},
                            }
                        ]
                    }));
                    if (item.suggestions) {
                        el.lastElementChild!.lastElementChild!.setAttribute("list", "scout-pits-list-" + name),
                        el.lastElementChild!.appendChild(ce({
                            name: "datalist",
                            id: "scout-pits-list-" + name,
                            content: item.suggestions.map(opt => ({
                                name: "option",
                                content: opt
                            } satisfies CEOptions))
                        }));
                    }
                    break;
                }
                case "slider": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "range",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name},
                                min: item.min.toString(),
                                value: item.default.toString(),
                                max: item.max.toString(),
                                step: item.step?.toString()
                            }
                        ]
                    }));
                    break;
                }
                case "checkbox": {
                    el.appendChild(ce({
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "label",
                                htmlFor: "scout-pits-" + name,
                                content: item.label
                            },
                            {
                                name: "input",
                                type: "checkbox",
                                dataset: {label: item.label},
                                id: "scout-pits-" + name,
                                attrs: {name: "scout-pits-" + name},
                            }
                        ]
                    }));
                    break;
                }
            }
        }
    }
    masonry(sections, 2, 1);
});

document.getElementById("scout-pits-back")!.addEventListener("click", async () => {
    await back();
});

(document.getElementById("scout-pits-will-change-at") as HTMLInputElement).addEventListener("change", function() {
    (document.getElementById("scout-pits-will-change") as HTMLInputElement).checked = this.value > "";
});

(document.getElementById("scout-pits-save") as HTMLButtonElement).addEventListener("click", async function() {
    if (!entries) return;
    this.disabled = true;
    try {
        function getSectionEntries(section: string) {
            return Object.fromEntries(
                Array.from(document.querySelectorAll<HTMLFieldSetElement>(`#scout-pits-sec-${section} > fieldset`))
                    .map(el => [
                        el.dataset.index,
                        (throwAndPulseColorIf(
                            Array.from(el.children)
                                .find(el2 => el2 instanceof HTMLInputElement && el2.checked) || (willChange ? "" : undefined),
                            v => !willChange && v === undefined,
                            el,
                            "#f00",
                            0
                        ) as HTMLInputElement).value
                    ])
            );
        }
        const teamNumber = document.getElementById("scout-pits-team-number")!.innerText;
        const willChange = (document.getElementById("scout-pits-will-change") as HTMLInputElement).checked && new Date((document.getElementById("scout-pits-will-change-at") as HTMLInputElement).value).getTime() || undefined;
        const entry: PitsScoutData = {
            type: "pits",
            by: scouterName || "(untitled scouter)",
            when: Date.now(),
            drivetrain: throwAndPulseColorIf(
                (document.getElementById("scout-pits-drivetrain") as HTMLInputElement).value,
                v => !willChange && v.length == 0,
                document.getElementById("scout-pits-drivetrain")!,
                "#f00",
                0
            ),
            leds: (document.getElementById("scout-pits-leds") as HTMLTextAreaElement).value || "None present",
            cycleTime: throwAndPulseColorIf(
                (document.getElementById("scout-pits-cycle-time") as HTMLInputElement).valueAsNumber || (willChange ? 0 : NaN),
                v => isNaN(v),
                document.getElementById("scout-pits-cycle-time")!,
                "#f00",
                0
            ),
            data: Object.fromEntries(Array.from(document.querySelectorAll<HTMLDivElement>("#panel-scout-pits .scout-section-seasonal")).map(sec =>
                [sec.dataset.title || "", Object.fromEntries(Array.from(sec.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")).map(el => [
                    el.dataset.label || "",
                    el instanceof HTMLInputElement ?
                        el.type == "checkbox" ? el.checked
                        : el.type == "number" || el.type == "range" ? +el.value
                        : el.value
                    : el.value
                ]))]
            )),
            willChange
        };
        const team = getTeam(teamNumber);
        if (!team) return;
        await saveEntry(team, entry);
        await switchToPanel("teams");
    } catch (e) {
        if (typeof e != "number") throw e;
    } finally {
        this.disabled = false;
    }
});

//#endregion

//#region Panel: Import CSV

async function importCsv(file: File) {
    let columns: string[], i = 0;
    parse(file, {
        async step(results, parser) {
            const data = results.data as string[];
            if (i++ == 0) {columns = data; return;}
            const row: {[x: string]: unknown} = Object.fromEntries(data.map((v, i) => [columns[i], v] as [string, string]));
            row.droppedItems = row.droppedItems == "" ? undefined : row.droppedItems != "false";
            row.aStop = row.aStop == "" ? undefined : row.aStop != "false";
            row.eStop = row.eStop == "" ? undefined : row.eStop != "false";
            row.died = row.died == "" ? undefined : row.died != "false";
            row.won = row.won == "" ? undefined : row.won != "false";
            row.carried = row.carried == "" ? undefined : row.carried != "false";
            row.wereCarried = row.wereCarried == "" ? undefined : row.wereCarried != "false";
            row.matchNumber = row.matchNumber == "" ? undefined : Number(row.matchNumber);
            row.allianceScore = row.allianceScore == "" ? undefined : Number(row.allianceScore);
            row.cycleTime = Number(row.cycleTime);
            row.driveRating = row.driveRating == "" ? undefined : Number(row.driveRating);
            row.willChange = row.willChange == "" ? undefined : Number(row.willChange);
            row.when = Number(row.when);
            for (const k of Object.keys(row)) {
                if (k.startsWith("otherBool.")) {
                    row[k] = row[k] != "false";
                }
            }
            const entry = unFlattenObject(row);
            entry.scoring ??= {};
            entry.mobility ??= {};
            entry.otherBool ??= {};
            entry.otherScale ??= {};
            if (!checkEntry(entry) || !("team" in entry) || typeof entry.team != "string") return;
            entries ??= {};
            const team = getTeam(entry.team);
            if (!team) return;
            await saveEntry(team, entry);
        },
    });
}

let bin: HTMLImageElement | undefined, binTimeout: number | undefined;

document.getElementById("panel-import-csv")!.addEventListener("drop", async (event) => {
    event.preventDefault();
    if (bin) {
        bin.animate([
            {opacity: 0}
        ], 300).finished.then(() => {
            bin?.remove();
            bin = undefined;
        });
    }
    if (!event.dataTransfer) return;
    if (event.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        await Promise.all(Array.from(event.dataTransfer.items).map(async (item, i) => {
            // If dropped items aren't files, reject them
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (!file || file.type != "text/csv") return;
                await importCsv(file);
            }
        }));
    } else {
        // Use DataTransfer interface to access the file(s)
        await Promise.all(Array.from(event.dataTransfer.files).map(async (file, i) => {
            if (file.type != "text/csv") return;
            await importCsv(file);
        }));
    }
});

document.getElementById("panel-import-csv")!.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!bin) bin = document.body.appendChild(ce({
        name: "img",
        src: "bin.svg",
        class: "import-csv-bin",
        style: {
            top: event.clientY + 50 + "px",
            left: event.clientX - 100 + "px"
        }
    }));
    bin.animate([{opacity: 1}], 100);
    if (binTimeout) clearTimeout(binTimeout);
    bin.style.top = event.clientY + 50 + "px";
    bin.style.left = event.clientX - 100 + "px";
    binTimeout = +setTimeout(() => {
        bin?.animate([
            {opacity: 0}
        ], 300).finished.then(() => {
            bin?.remove();
            bin = undefined;
        });
    }, 5000);
});

document.getElementById("import-csv-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

document.getElementById("import-csv-open")!.addEventListener("click", () => {
    ce({
        name: "input",
        type: "file",
        multiple: true,
        accept: ".csv",
        events: {
            change() {
                if (!this.files) return;
                Array.from(this.files).forEach((file) => {
                    importCsv(file);
                });
            },
        }
    }).click();
});

//#endregion

//#region Panel: Export CSV

const frequencyMap: {[x: string]: number} = {
    never: 0,
    rarely: 1,
    generally: 2,
    consistently: 3
};

const frequencyMapReverse = [
    "never",
    "rarely",
    "generally",
    "consistently"
];

const mobilityMap: {[x: string]: number} = {
    never: 0,
    sometimes: 1,
    always: 2
};

const mobilityMapReverse = [
    "never",
    "sometimes",
    "always"
];

function sortEntries(a: TeamSpecificScoutData, b: TeamSpecificScoutData) {
    const teamSorted = teamSort(a.team, b.team);
    if (teamSorted !== 0) return teamSorted;
    return a.when - b.when;
}

const exportFilters: {[x: string]: (data: TeamSpecificScoutData[]) => TeamSpecificScoutData[]} = {
    allEntries(data) {
        const {pits: pitsEntries, stands: standsEntries} = Object.groupBy(data, e => e.type);
        return (pitsEntries || []).sort(sortEntries).concat((standsEntries || []).sort(sortEntries));
    },
    allPits(data) {
        return data.filter(e => e.type == "pits").sort(sortEntries);
    },
    allStands(data) {
        return data.filter(e => e.type == "stands").sort(sortEntries);
    },
    latestPits(data) {
        const pitsEntries = data.filter(e => e.type == "pits");
        const entriesMap: {[team: string]: PitsScoutData & {team: string}} = {};
        for (const e of pitsEntries) {
            if (entriesMap[e.team]) {
                if (entriesMap[e.team].when < e.when) entriesMap[e.team] = e;
            } else entriesMap[e.team] = e;
        }
        return Object.values(entriesMap);
    },
    latestStands(data) {
        const standsEntries = data.filter(e => e.type == "stands");
        const entriesMap: {[team: string]: StandsScoutData & {team: string}} = {};
        for (const e of standsEntries) {
            if (entriesMap[e.team]) {
                if (entriesMap[e.team].when < e.when) entriesMap[e.team] = e;
            } else entriesMap[e.team] = e;
        }
        return Object.values(entriesMap);
    },
    // standsAggregation(data) {
    //     const standsEntries = data.filter(e => e.type == "stands");
    //     const entriesMap: {[team: string]: (StandsScoutData & {team: string})[]} = {};
    //     for (const e of standsEntries) {
    //         entriesMap[e.team] ??= [];
    //         entriesMap[e.team].push(e);
    //     }
    //     return Object.entries(entriesMap).map(([team, entries]) => {
    //         const by = entries.map(e => e.by).filter((val, idx, arr) => arr.indexOf(val) === idx);
    //         const matchNumbers = entries.map(e => e.matchNumber).filter((val, idx, arr) => arr.indexOf(val) === idx);
    //         const matchTypes = entries.map(e => e.matchType).filter((val, idx, arr) => arr.indexOf(val) === idx);
    //         return {
    //             by: by.length == 1 ? by[0] : by.length == 0 ? "(none)" : "(various)",
    //             type: "stands",
    //             when: Math.max(...entries.map(e => e.when)),
    //             team,
    //             matchNumber: matchNumbers.length == 1 ? matchNumbers[0] : matchNumbers.length == 0 ? -2 : -1,
    //             matchType: matchTypes.length == 1 ? matchTypes[0] : matchTypes.length == 0 ? "(none)" : "(various)",
    //             allianceScore: mean(entries.map(e => e.allianceScore)),
    //             defenseNotes: entries.map(e => e.defenseNotes > "" ? `(${e.by} ${stringifyDate(e.when)})\n${e.defenseNotes}` : undefined).filter(v => v).join("\n\n"),
    //             offenseNotes: entries.map(e => e.offenseNotes > "" ? `(${e.by} ${stringifyDate(e.when)})\n${e.offenseNotes}` : undefined).filter(v => v).join("\n\n"),
    //             droppedItems: Boolean(Math.round(mean(entries.map(e => e.droppedItems).map(v => +v)))),
    //             aStop: Boolean(Math.round(mean(entries.map(e => e.aStop).map(v => +v)))),
    //             eStop: Boolean(Math.round(mean(entries.map(e => e.eStop).map(v => +v)))),
    //             died: Boolean(Math.round(mean(entries.map(e => e.died).map(v => +v)))),
    //             won: Boolean(Math.round(mean(entries.map(e => e.won).map(v => +v)))),
    //             carried: Boolean(Math.round(mean(entries.map(e => e.carried).map(v => +v)))),
    //             wereCarried: Boolean(Math.round(mean(entries.map(e => e.wereCarried).map(v => +v)))),
    //             cycleTime: mean(entries.map(e => e.cycleTime)),
    //             driveRating: mean(entries.map(e => e.driveRating)),
    //             scoring: Object.fromEntries(
    //                 Object.entries(objectArrayValues(entries.map(e => e.scoring)))
    //                     .map(([key, values]) =>
    //                         [
    //                             key,
    //                             frequencyMapReverse[Math.round(mean(values.map(v => frequencyMap[v] || 0)))]
    //                         ] as [string, string]
    //                     )
    //             ),
    //             mobility: Object.fromEntries(
    //                 Object.entries(objectArrayValues(entries.map(e => e.mobility)))
    //                     .map(([key, values]) =>
    //                         [
    //                             key,
    //                             mobilityMapReverse[Math.round(mean(values.map(v => mobilityMap[v] || 0)))]
    //                         ] as [string, string]
    //                     )
    //             ),
    //             otherBool: Object.fromEntries(
    //                 Object.entries(objectArrayValues(entries.map(e => e.otherBool)))
    //                     .map(([key, values]) =>
    //                         [
    //                             key,
    //                             !!Math.round(mean(values.map(v => +v)))
    //                         ] as [string, boolean]
    //                     )
    //             ),
    //             otherScale: Object.fromEntries(
    //                 Object.entries(objectArrayValues(entries.map(e => e.otherScale)))
    //                     .map(([key, values]) =>
    //                         [
    //                             key,
    //                             frequencyMapReverse[Math.round(mean(values.map(v => frequencyMap[v] || 0)))]
    //                         ] as [string, string]
    //                     )
    //             )
    //         } satisfies StandsScoutData & {team: string};
    //     })
    // }
};

async function exportCsv(
    progressBar: HTMLProgressElement = document.getElementById("export-csv-progress") as HTMLProgressElement,
    status: HTMLElement = document.getElementById("export-csv-status")!
) {
    if (!configuration) throw new Error();
    const filter = exportFilters[(document.getElementById("export-csv-filter") as HTMLInputElement).value] || (data => data);
    const data = filter(Object.entries(entries!).flatMap(([k, vs]) => vs.map(v => ({...v, team: k})))).map(e => flattenObject(e, "/"));
    const columns = [
        "by",
        "when",
        "type",
        "team",
        "matchNumber",
        "matchType",
        "allianceScore",
        "defenseNotes",
        "offenseNotes",
        "droppedItems",
        "aStop",
        "eStop",
        "died",
        "won",
        "carried",
        "wereCarried",
        "cycleTime",
        "driveRating",
        "drivetrain",
        "leds",
        "willChange",
        ...configuration.sections.flatMap(s => s.items.map(i => s.title + "/" + i.label)).filter((val, idx, arr) => arr.indexOf(val) === idx),
    ];
    const targetTime = 5;
    let chunkSize = 10;
    const strings = [columns.join(",")];
    progressBar.max = data.length;
    progressBar.value = 0;
    const timeStart = performance.now();
    let i = 0;
    for (; i < data.length;) {
        // stringify one chunk of data, time how long it took
        const timeStart = performance.now();
        const slice = data.slice(i, i + chunkSize);
        const part = unparse(slice, {columns, header: false, newline: "\n"});
        strings.push("\n" + part);
        const timeEnd = performance.now();
        const diff = timeEnd - timeStart;
        // update chunkSize to get closer to targetTime, hopefully
        const timePerRow = diff / slice.length;
        chunkSize = Math.max(1, Math.round(targetTime / timePerRow));
        i += slice.length;
        progressBar.value = i;
        status.innerText = `${i} of ${data.length} rows done`;
        await new Promise((resolve) => setTimeout(resolve));
    }
    const timeEnd = performance.now();
    const blob = new Blob(strings, {type: "text/plain"});
    status.innerText = `Exported ${data.length} rows (${blob.size} bytes) in ${(timeEnd - timeStart).toFixed(1)}ms`;
    return blob;
}

document.getElementById("export-csv-copy")!.addEventListener("click", async () => {
    try {
        (document.getElementById("export-csv-copy") as HTMLButtonElement).disabled = true;
        (document.getElementById("export-csv-download") as HTMLButtonElement).disabled = true;
        const blob = await exportCsv();
        
        await navigator.clipboard.write([
            new ClipboardItem({
                "text/plain": blob
            })
        ]);
        
        pulseColor(document.getElementById("export-csv-copy")!, "#0f0");
        
    } finally {
        (document.getElementById("export-csv-copy") as HTMLButtonElement).disabled = false;
        (document.getElementById("export-csv-download") as HTMLButtonElement).disabled = false;
    }
});

document.getElementById("export-csv-download")!.addEventListener("click", async () => {
    try {
        (document.getElementById("export-csv-copy") as HTMLButtonElement).disabled = true;
        (document.getElementById("export-csv-download") as HTMLButtonElement).disabled = true;
        const blob = new Blob([await exportCsv()], {type: "text/csv"});
        
        const blobUrl = URL.createObjectURL(blob);
        const a = ce({
            name: "a",
            href: blobUrl,
            download: "scouted.csv"
        });
        
        a.click();
        
    } finally {
        (document.getElementById("export-csv-copy") as HTMLButtonElement).disabled = false;
        (document.getElementById("export-csv-download") as HTMLButtonElement).disabled = false;
    }
});

document.getElementById("export-csv-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

//#endregion

//#region Panel: Import from QR Code

let qrReader: Html5Qrcode | undefined;

document.getElementById("import-qr-back")!.addEventListener("click", async () => {
    if (qrReader) {
        qrReader.stop();
        qrReader = undefined;
    }
    await switchToPanel("teams");
});

document.getElementById("panel-import-qr")!.addEventListener("transitionedto", async () => {
    qrReader = new Html5Qrcode("import-qr-reader");
    const scanned = new Set<string>();
    await qrReader.start(
        {
            facingMode: "environment" // prefer environment, but also prefer having camera over no camera
        },
        {
            fps: 10
        },
        (text, result) => {
            (async () => {
                if (!text.startsWith(SCOUT_DATA_PREFIX)) return;
                text = text.slice(SCOUT_DATA_PREFIX.length);
                if (scanned.has(text)) return; // ignore duplicates
                scanned.add(text);
                const arr = new Uint8Array(text.length);
                for (let i = 0; i < text.length; i++) {
                    arr[i] = text.charCodeAt(i);
                }
                const unzipped = ungzip(arr);
                const file = new File([unzipped], "qrcode.csv", {type: "text/csv"});
                await importCsv(file);
            })();
        },
        (err) => {}
    );
});

//#endregion

//#region Panel: Export to QR Code

document.getElementById("export-qr-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

document.getElementById("export-qr-generate")!.addEventListener("click", async () => {
    if (!configuration) throw new Error();
    const data = Object.entries(entries!).flatMap(([k, vs]) => vs.map(v => ({...v, team: k}))).map(e => flattenObject(e, "/"));
    const columns = [
        "by",
        "when",
        "type",
        "team",
        "matchNumber",
        "matchType",
        "allianceScore",
        "defenseNotes",
        "offenseNotes",
        "droppedItems",
        "aStop",
        "eStop",
        "died",
        "won",
        "carried",
        "wereCarried",
        "cycleTime",
        "driveRating",
        "drivetrain",
        "leds",
        "willChange",
        ...configuration.sections.flatMap(s => s.items.map(i => s.title + "/" + i.label)).filter((val, idx, arr) => arr.indexOf(val) === idx),
    ];
    const size = 4000;
    let chunk = columns.join(",");
    const imgSection = document.getElementById("export-qr-images")!;
    Array.from(imgSection.children).forEach(el => el.remove());
    if (data.length == 0) {
        imgSection.appendChild(ce({
            name: "p",
            content: "You don't have any entries to export!"
        }));
        return;
    }
    async function makeCode(toCode: string) {
        const gzipped = gzip(toCode, {level: 9});
        let code = SCOUT_DATA_PREFIX;
        for (let i = 0; i < gzipped.length; i++) {
            code += String.fromCharCode(gzipped[i]);
        }
        const url = await toDataURL(code, {
            errorCorrectionLevel: "L"
        });
        imgSection.appendChild(ce({
            name: "img",
            src: url
        }));
    }
    for (const item of data) {
        let toCode: string | undefined;
        if (chunk.length < size) {
            const part = unparse([item], {columns, header: false, newline: "\n"});
            if (chunk.length + 1 + part.length <= size) {
                chunk += "\n" + part;
            } else {
                toCode = chunk;
                chunk = columns.join(",") + "\n" + part;
            }
        } else {
            toCode = chunk;
            chunk = columns.join(",");
        }
        if (toCode) {
            await makeCode(toCode);
        }
    }
    if (chunk.length > columns.join(",").length) {
        await makeCode(chunk);
    }
});

//#endregion

//#region Built-In Season Presets

(document.getElementById("preset-frc-2024-crescendo") as HTMLInputElement).value = JSON.stringify({
    competition: "FRC 2024: Crescendo",
    sections: [
        {
            title: "Scoring",
            items: [
                {label: "Shoot into Speaker", type: "checkbox"},
                {label: "Score into Amp", type: "checkbox"},
                {label: "Score in Auto", type: "select", options: ["No", "Once", "Twice or More"]}
            ],
            stands: true,
            pits: true
        },
        {
            title: "Intake",
            items: [
                {label: "Intake from Source", type: "checkbox"},
                {label: "Intake from Ground", type: "checkbox"}
            ],
            stands: true,
            pits: true
        },
        {
            title: "Intake",
            items: [
                {label: "Fit under Stage", type: "select", options: ["No", "Sometimes (arm is down, etc.)", "Always"]},
            ],
            stands: true,
            pits: true
        },
        {
            title: "Endgame",
            items: [
                {label: "Climb", type: "checkbox"},
                {label: "Trap Note", type: "checkbox"},
                {label: "Harmonize", type: "select", options: ["No", "Normal", "Triple"]}
            ],
            stands: true,
            pits: true
        }
    ],
} satisfies SeasonConfig);

(document.getElementById("preset-bunnybots-2024-balloon-a-palooza") as HTMLInputElement).value = JSON.stringify({
    competition: "Bunnybots 2024: Balloon-a-Palooza",
    sections: [
        {
            title: "Scoring",
            items: [
                {label: "Low Zone", type: "checkbox"},
                {label: "Tote", type: "checkbox"},
                {label: "Empty Corral Quickly", type: "checkbox"}
            ],
            stands: true,
            pits: true
        },
    ],
} satisfies SeasonConfig);

(document.getElementById("preset-frc-2025-reefscape") as HTMLInputElement).value = JSON.stringify({
    competition: "FRC 2025: Reefscape",
    sections: [
        {
            title: "Reef",
            items: [
                {label: "Coral in Trough (L1)", type: "number", min: 0, default: 0, step: 1},
                {label: "Coral on L2", type: "number", min: 0, default: 0, step: 1},
                {label: "Coral on L3", type: "number", min: 0, default: 0, step: 1},
                {label: "Coral on L4", type: "number", min: 0, default: 0, step: 1},
                {label: "Coral Scored in Auto", type: "number", min: 0, default: 0, step: 1}
            ],
            stands: true,
            pits: false
        },
        {
            title: "Reef",
            items: [
                {label: "Coral in Trough (L1)", type: "checkbox"},
                {label: "Coral on L2", type: "checkbox"},
                {label: "Coral on L3", type: "checkbox"},
                {label: "Coral on L4", type: "checkbox"},
                {label: "Coral Scoring in Auto", type: "checkbox"}
            ],
            stands: false,
            pits: true
        },
        {
            title: "Intake",
            items: [
                {label: "Coral from Coral Station", type: "checkbox"},
                {label: "Coral from Ground", type: "checkbox"},
                {label: "Algae from Reef", type: "select", options: ["No", "Remove", "Remove and Hold"]},
                {label: "Algae from Ground", type: "select", options: ["No", "Only when stacked", "Yes"]},
                {label: "Coral Preloaded", type: "checkbox"}
            ],
            stands: true,
            pits: false
        },
        {
            title: "Intake",
            items: [
                {label: "Coral from Coral Station", type: "checkbox"},
                {label: "Coral from Ground", type: "checkbox"},
                {label: "Algae from Reef", type: "select", options: ["No", "Remove", "Remove and Hold"]},
                {label: "Algae from Ground", type: "select", options: ["No", "Only when stacked", "Yes"]}
            ],
            stands: false,
            pits: true
        },
        {
            title: "Scoring Algae",
            items: [
                {label: "Algae in Processor", type: "number", min: 0, default: 0, step: 1},
                {label: "Algae in Net from Processor", type: "number", min: 0, default: 0, step: 1},
                {label: "Algae in Net from Robot", type: "number", min: 0, default: 0, step: 1}
            ],
            stands: true,
            pits: false
        },
        {
            title: "Scoring Algae",
            items: [
                {label: "Algae in Processor", type: "checkbox"},
                {label: "Algae in Net from Processor", type: "checkbox"},
                {label: "Algae in Net from Robot", type: "checkbox"}
            ],
            stands: false,
            pits: true
        },
        {
            title: "Endgame",
            items: [
                {label: "Endgame Strategy", type: "select", options: ["None/Keep scoring normally", "Park", "Shallow Cage", "Deep Cage"]},
                {label: "Endgame Successful", type: "checkbox"}
            ],
            stands: true,
            pits: false
        },
        {
            title: "Endgame",
            items: [
                {label: "Endgame Strategy", type: "select", options: ["None/Keep scoring normally", "Park", "Shallow Cage", "Deep Cage"]},
            ],
            stands: false,
            pits: true
        }
    ]
} satisfies SeasonConfig);

//#endregion

//#region Register Service Worker

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register("./serviceworker.js", {scope: "/2898-scouter/"});
        } catch (err) {} // probably a file:// url, in which case they don't need a SW
    });
}

//#endregion