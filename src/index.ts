import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce } from "./ce";

let currentPanel = "onboarding-1";
let directory: FileSystemDirectoryHandle | undefined;
let storageKey: string | undefined;

async function switchToPanel(panel: string) {
    const el1 = document.getElementById("panel-" + currentPanel)!;
    const el2 = document.getElementById("panel-" + panel)!;
    el1.inert = true;
    await el1.animate([
        {opacity: 0}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
    el2.inert = false;
    currentPanel = panel;
    el2.dispatchEvent(new Event("transitionedto", {bubbles: false, cancelable: false}));
    await el2.animate([
        {opacity: 1}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
}

document.getElementById("onboarding-1-continue")!.addEventListener("click", async () => {
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
    if (!role) {
        document.getElementById("onboarding-role-c")!.animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
        return;
    }
    await switchToPanel("onboarding-2");
});

document.getElementById("onboarding-storage-folder")!.addEventListener("click", async () => {
    try {
        directory = await window.showDirectoryPicker({
            id: "event-data-location"
        });
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

document.getElementById("onboarding-2-continue")!.addEventListener("click", () => {
    
});