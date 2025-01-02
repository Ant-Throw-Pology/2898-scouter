import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce, makeid, type CEOptions } from "./ce";

interface SeasonConfig {
    competition: string;
    scoring: string[];
    mobility: string[];
    bonusBool: string[];
    bonusScale: string[];
}

interface Team {
    number: string;
    name: string;
    location?: string;
}

interface Configuration extends SeasonConfig {
    teams: Team[];
}

interface PitScoutData {
    type: "pits";
    by: string;
    when: number;
    drivetrain: string;
    scoring: {[x: string]: string};
    mobility: {[x: string]: string};
    bonusBool: {[x: string]: boolean};
    bonusScale: {[x: string]: string};
    willChange?: number;
}

interface StandsScoutData {
    type: "stands";
    by: string;
    when: number;
    matchNumber: number;
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
    scoring: {[x: string]: string};
    mobility: {[x: string]: string};
    bonusBool: {[x: string]: boolean};
    bonusScale: {[x: string]: string};
}

type ScoutData = PitScoutData | StandsScoutData;

interface StorageData {
    config: Configuration;
    entries: {[x: string]: ScoutData[]}
}

const teamNumberRegex = /^\d+\w*$/;
const teamNumberNameRegex = /^(?<number>\d+\w*) (?<name>.*)$/;

let currentPanel = "onboarding-1";
let scouterName: string | undefined;
let scouterRole: "pits" | "stands" | undefined;
let directory: FileSystemDirectoryHandle | undefined;
let storageKey: string | undefined;
let configuration: Configuration | undefined;
let entries: {[x: string]: ScoutData[]} | undefined;
let storageData: StorageData | undefined;

async function switchToPanel(panel: string, detail?: any) {
    const el1 = document.getElementById("panel-" + currentPanel)!;
    const el2 = document.getElementById("panel-" + panel)!;
    el1.inert = true;
    await el1.animate([
        {opacity: 0}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
    el2.inert = false;
    currentPanel = panel;
    el2.dispatchEvent(new CustomEvent("transitionedto", {bubbles: false, cancelable: false, detail}));
    await el2.animate([
        {opacity: 1}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
}

async function saveConfiguration() {
    if (!configuration) return;
    if (directory) {
        const configFile = await directory.getFileHandle("config.json", {create: true});
        await new Blob([JSON.stringify(configuration)]).stream().pipeTo(await configFile.createWritable());
    } else if (storageKey) {
        storageData ??= {config: configuration, entries: {}};
        storageData.config = configuration;
        localStorage.setItem(storageKey, JSON.stringify(storageData));
    }
}

document.getElementById("onboarding-1-next")!.addEventListener("click", async () => {
    const name = (document.getElementById("onboarding-name") as HTMLInputElement).value;
    if (!name) {
        document.getElementById("onboarding-name")!.animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
        return;
    }
    const role = Array.from(document.querySelectorAll<HTMLInputElement>("input[name=onboarding-role]")).find(el => el.checked)?.value;
    if (role !== "stands" && role !== "pits") {
        document.getElementById("onboarding-role-c")!.animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
        return;
    }
    scouterName = name;
    scouterRole = role;
    await switchToPanel("onboarding-2");
});

document.getElementById("onboarding-storage-folder")!.addEventListener("click", async () => {
    try {
        directory = await window.showDirectoryPicker({
            id: "event-data-location"
        });
        const configFile = await directory.getFileHandle("config.json", {create: false}).catch(() => undefined);
        if (configFile) {
            configuration = JSON.parse(await (await configFile.getFile()).text())
            await switchToPanel("teams");
        } else {
            await switchToPanel("configuration");
        }
    } catch (e) {
        if (!String(e).match(/abort/i)) throw e; // discard Promise rejections caused by the user changing their mind
    }
});

document.getElementById("panel-onboarding-2")!.addEventListener("transitionedto", () => {
    const keys = Object.keys(localStorage).filter(v => v !== "color-mode");
    const el = document.getElementById("onboarding-storage-local-items") as HTMLDataListElement;
    el.childNodes.forEach(n => n.remove());
    for (const key of keys) {
        el.appendChild(ce({
            name: "option",
            content: key
        }));
    }
});

document.getElementById("onboarding-2-next")!.addEventListener("click", async () => {
    const key = (document.getElementById("onboarding-storage-local-item") as HTMLInputElement).value;
    if (!key) {
        (document.getElementById("onboarding-storage-local-item") as HTMLInputElement).animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
        return;
    }
    storageKey = key;
    let data: unknown;
    try {
        data = JSON.parse(localStorage.getItem(key) || "");
    } catch (e) {}
    if (
        typeof data == "object" && data !== null &&
        "config" in data && typeof data.config == "object" && data.config !== null &&
        "competition" in data.config && typeof data.config.competition == "string" &&
        "scoring" in data.config && Array.isArray(data.config.scoring) && data.config.scoring.every(v => typeof v == "string") &&
        "mobility" in data.config && Array.isArray(data.config.mobility) && data.config.mobility.every(v => typeof v == "string") &&
        "bonusBool" in data.config && Array.isArray(data.config.bonusBool) && data.config.bonusBool.every(v => typeof v == "string") &&
        "bonusScale" in data.config && Array.isArray(data.config.bonusScale) && data.config.bonusScale.every(v => typeof v == "string") &&
        "teams" in data.config && Array.isArray(data.config.teams) && data.config.teams.every(((t: unknown) =>
            typeof t == "object" && t !== null &&
            "number" in t && typeof t.number == "string" &&
            "name" in t && typeof t.name == "string" && (
                !("location" in t) ||
                typeof t.location == "undefined" ||
                typeof t.location == "string"
            )
        )) &&
        "entries" in data && typeof data.entries == "object" && data.entries !== null &&
        Object.entries(data.entries).every(([k, v]) => Array.isArray(v) && v.every((s: unknown) =>
            typeof s == "object" && s !== null && (
                (
                    "type" in s && s.type === "pits" &&
                    "by" in s && typeof s.by == "string" &&
                    "when" in s && typeof s.when == "number" &&
                    "scoring" in s && typeof s.scoring == "object" && s.scoring !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "mobility" in s && typeof s.mobility == "object" && s.mobility !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "bonusBool" in s && typeof s.bonusBool == "object" && s.bonusBool !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "boolean") &&
                    "bonusScale" in s && typeof s.bonusScale == "object" && s.bonusScale !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "drivetrain" in s && typeof s.drivetrain == "string"
                ) || (
                    "type" in s && s.type === "stands" &&
                    "by" in s && typeof s.by == "string" &&
                    "when" in s && typeof s.when == "number" &&
                    "scoring" in s && typeof s.scoring == "object" && s.scoring !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "mobility" in s && typeof s.mobility == "object" && s.mobility !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "bonusBool" in s && typeof s.bonusBool == "object" && s.bonusBool !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "boolean") &&
                    "bonusScale" in s && typeof s.bonusScale == "object" && s.bonusScale !== null && Object.entries(s).every(([k2, v2]) => typeof v2 == "string") &&
                    "matchNumber" in s && typeof s.matchNumber == "number" &&
                    "allianceScore" in s && typeof s.allianceScore == "number" &&
                    "defenseNotes" in s && typeof s.defenseNotes == "string" &&
                    "offenseNotes" in s && typeof s.offenseNotes == "string" &&
                    "droppedItems" in s && typeof s.droppedItems == "boolean" &&
                    "died" in s && typeof s.died == "boolean" &&
                    "won" in s && typeof s.won == "boolean" &&
                    "carried" in s && typeof s.carried == "boolean" &&
                    "wereCarried" in s && typeof s.wereCarried == "boolean" &&
                    "cycleTime" in s && typeof s.cycleTime == "number" &&
                    "driveRating" in s && typeof s.driveRating == "number"
                )
            )
        ))
    ) {
        storageData = data as StorageData;
        configuration = data.config as Configuration;
        await switchToPanel("teams");
    } else {
        await switchToPanel("configuration");
    }
});

document.getElementById("config-create")!.addEventListener("click", async () => {
    await switchToPanel("create-configuration");
});

[
    document.getElementById("create-score-targets-c")!,
    document.getElementById("create-mobility-c")!,
    document.getElementById("create-bonus-bool-c")!,
    document.getElementById("create-bonus-scale-c")!,
].forEach(el => el.addEventListener("click", function(this: HTMLDivElement) {
    (this.lastElementChild as HTMLElement).focus();
}));

[
    document.getElementById("create-score-targets")!,
    document.getElementById("create-mobility")!,
    document.getElementById("create-bonus-bool")!,
    document.getElementById("create-bonus-scale")!,
].forEach(el => el.addEventListener("input", function(this: HTMLSpanElement) {
    let nodes = Array.from(this.childNodes);
    nodes = nodes.slice((nodes.findLastIndex(n => n.nodeType == Node.ELEMENT_NODE) + 1));
    let text = nodes.map(n => (n as Text).data).join("");
    if (text.endsWith("\n")) text = text.slice(0, -1);
    if (text.includes("\n")) {
        for (const n of nodes.slice(0, -1)) n.remove();
        this.parentElement!.insertBefore(ce({
            name: "span",
            class: "target",
            content: [
                text.replace(/\n/g, ""),
                {
                    name: "button",
                    attrs: {
                        title: "Remove"
                    },
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
                        click() {
                            this.parentElement!.remove();
                        }
                    }
                }
            ]
        }), this);
    }
}));

document.getElementById("create-cancel")!.addEventListener("click", async () => {
    await switchToPanel("configuration");
});

document.getElementById("create-done")!.addEventListener("click", async () => {
    const competition = (document.getElementById("create-competition") as HTMLInputElement).value;
    if (!competition) {
        (document.getElementById("create-competition") as HTMLInputElement).animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
        return;
    }
    const scoring = Array.from(document.querySelectorAll("#create-score-targets-c > span.target"))
        .map(el =>
            Array.from(el.childNodes)
                .filter(n => n.nodeType == Node.TEXT_NODE)
                .map(n => (n as Text).data).join("")
        );
    const mobility = Array.from(document.querySelectorAll("#create-mobility-c > span.target"))
        .map(el =>
            Array.from(el.childNodes)
                .filter(n => n.nodeType == Node.TEXT_NODE)
                .map(n => (n as Text).data).join("")
        );
    const bonusBool = Array.from(document.querySelectorAll("#create-bonus-bool-c > span.target"))
        .map(el =>
            Array.from(el.childNodes)
                .filter(n => n.nodeType == Node.TEXT_NODE)
                .map(n => (n as Text).data).join("")
        );
    const bonusScale = Array.from(document.querySelectorAll("#create-bonus-scale-c > span.target"))
        .map(el =>
            Array.from(el.childNodes)
                .filter(n => n.nodeType == Node.TEXT_NODE)
                .map(n => (n as Text).data).join("")
        );
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
                        scoring,
                        mobility,
                        bonusBool,
                        bonusScale
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

(document.getElementById("preset-frc-2024-crescendo") as HTMLInputElement).value = JSON.stringify({
    competition: "FRC 2024: Crescendo",
    scoring: ["Speaker", "Amp", "Climb", "Trap", "Harmony", "Triple Harmony"],
    mobility: ["Under Stage"],
    bonusBool: [],
    bonusScale: []
} satisfies SeasonConfig);

(document.getElementById("preset-bunnybots-2024-balloon-a-palooza") as HTMLInputElement).value = JSON.stringify({
    competition: "Bunnybots 2024: Balloon-a-Palooza",
    scoring: ["Low Zone", "Tote"],
    mobility: [],
    bonusBool: ["Empty Corral Quickly", "Minibot"],
    bonusScale: []
} satisfies SeasonConfig);

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
    const value = (document.getElementById("config-teams") as HTMLInputElement).value.trim();
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
    if (teams.length < 1) return;
    configuration = {
        ...seasonConfig,
        teams
    };
    await saveConfiguration();
    await switchToPanel("teams");
});

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
    for (const [index, team] of configuration.teams.entries()) {
        const teamEntries = entries[team.number] || [];
        teamEntries.sort((a, b) => b.when - a.when);
        const latestPitsEntry = teamEntries.filter(e => e.type == "pits").at(0);
        let pitScouted = latestPitsEntry ? "Done" : "";
        if (latestPitsEntry?.willChange) pitScouted = `Changes at ${latestPitsEntry.willChange}`;
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
            style: {gridRow: `${index + 2}`, gridColumn: "5"},
            attrs: {tabindex: "0", title: `View all entries for ${team.number}: ${team.name}`},
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
});

document.getElementById("panel-team-entries")!.addEventListener("transitionedto", (event) => {
    const team = (event as CustomEvent<Team>).detail;
    document.getElementById("entries-header")!.innerText = `Entries for ${team.number}: ${team.name}`;
    const entriesList = document.getElementById("entries-list")!;
    Array.from(entriesList.children).forEach(el => el.remove());
    if (!entries || !entries[team.number] || entries[team.number].length < 1) {
        entriesList.appendChild(ce({
            name: "p",
            style: {
                fontStyle: "italic",
                color: "color-mix(in srgb, var(--bg), var(--color) 60%)",
                gridRow: "1",
                gridColumn: "1 / -1",
                margin: "auto"
            },
            content: "No Entries"
        }));
        return;
    }
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "#"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Name"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Stands Entries"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header", content: "Pit Scouted / By"}));
    entriesList.appendChild(ce({name: "span", class: "teams-list-header"}));
    for (const entry of entries[team.number]) {
        // TODO
    }
});

document.getElementById("entries-back")!.addEventListener("click", async () => {
    await switchToPanel("teams");
});

function makeAbilityFieldset(items: string[], idPrefix: string, element: HTMLElement) {
    for (const item of items) {
        const index = item.toLowerCase().replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "");
        const id = idPrefix + index;
        element.appendChild(ce({
            name: "fieldset",
            dataset: {item, index},
            content: [
                {name: "legend", content: item},
                ...[
                    "Consistently",
                    "Generally",
                    "Rarely",
                    "Never"
                ].flatMap((v, i) => {
                    const value = v.toLowerCase();
                    const name = `${id}-${value}`;
                    return [
                        ...(i > 0 ? [{name: "br" as "br"}] : []),
                        {
                            name: "input",
                            id: name,
                            attrs: {
                                type: "radio",
                                name,
                                value
                            }
                        },
                        {
                            name: "label",
                            htmlFor: name,
                            content: v
                        }
                    ] satisfies CEOptions[]
                })
            ]
        }));
    }
}

document.getElementById("panel-scout-stands")!.addEventListener("transitionedto", (event) => {
    const team = (event as CustomEvent<Team>).detail;
    if (!configuration) return;
    document.getElementById("scout-stands-team-number")!.innerText = team.number;
    document.getElementById("scout-stands-team-name")!.innerText = team.name;
    document.getElementById("scout-stands-team-location")!.innerText = team.location || "";
    const secScoring = document.getElementById("scout-stands-sec-scoring")!;
    const secMobility = document.getElementById("scout-stands-sec-mobility")!;
    const secBonus = document.getElementById("scout-stands-sec-bonus")!;
    const secMatch = document.getElementById("scout-stands-sec-match")!;
    const secDriving = document.getElementById("scout-stands-sec-driving")!;
    const sections = [
        secMatch,
        secDriving,
        secScoring,
        secMobility,
        secBonus
    ];
    Array.from(secScoring.children).forEach(el => el.remove());
    Array.from(secMobility.children).forEach(el => el.remove());
    Array.from(secBonus.children).forEach(el => el.remove());
    if (configuration.scoring.length > 0) {
        secScoring.appendChild(ce({name: "h2", content: "Scoring"}));
        secScoring.style.removeProperty("display");
        makeAbilityFieldset(configuration.scoring, "scout-stands-scoring-", secScoring);
    } else secScoring.style.display = "none";
    if (configuration.mobility.length > 0) {
        secMobility.appendChild(ce({name: "h2", content: "Mobility"}));
        secMobility.style.removeProperty("display");
        makeAbilityFieldset(configuration.mobility, "scout-stands-mobility-", secMobility);
    } else secMobility.style.display = "none";
    if (configuration.bonusBool.length + configuration.bonusScale.length > 0) {
        secBonus.appendChild(ce({name: "h2", content: "Bonus"}));
        secBonus.style.removeProperty("display");
        if (configuration.bonusBool.length > 0) {
            secBonus.appendChild(ce({
                name: "div",
                class: "scout-checkboxes-row",
                content: configuration.bonusBool.map(item => {
                    const index = item.toLowerCase().replace(/[^\w]/g, "-").replace(/-+/g, "-").replace(/^-*|-*$/g, "");
                    const id = `scout-stands-bonus-bool-${index}`;
                    return {
                        name: "div",
                        class: "scout-row",
                        content: [
                            {
                                name: "input",
                                id,
                                attrs: {
                                    type: "checkbox",
                                    name: "id",
                                }
                            },
                            {
                                name: "label",
                                htmlFor: id,
                                content: item
                            }
                        ]
                    } satisfies CEOptions<"div">;
                })
            }));
        }
        makeAbilityFieldset(configuration.bonusScale, "scout-stands-bonus-scale-", secBonus);
    } else secBonus.style.display = "none";
    // DIY Masonry layout
    const heights = new Map(
        sections
            .map(el => [el, el.getBoundingClientRect().height] as [HTMLElement, number])
            .filter(v => v[1] > 0)
            .sort((a, b) => b[1] - a[1])
    );
    const columns: HTMLElement[][] = [[], []];
    const whichColumn = new Map<HTMLElement, number>();
    const columnHeights = [0, 0];
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
        const indices = new Map(column.map(el => [el, sections.indexOf(el)]));
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
    for (const el of [...heights.keys()].sort((a, b) => (topY.get(a) || 0) - (topY.get(b) || 0))) {
        const col = whichColumn.get(el) || 0;
        const top = topY.get(el) || 0;
        const bottom = bottomY.get(el) || 0;
        const topN = rowLines2.indexOf(top);
        const bottomN = rowLines2.indexOf(bottom);
        el.style.gridArea = `${topN + 2} / ${col + 1} / ${bottomN + 2} / ${col + 2}`;
    }
});