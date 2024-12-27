import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce } from "./utils";

let currentPanel = "onboarding-1";

async function switchToPanel(panel: string) {
    const el1 = document.getElementById("panel-" + currentPanel)!;
    const el2 = document.getElementById("panel-" + panel)!;
    await el1.animate([
        {opacity: 0}
    ], {duration: 150, easing: "ease", fill: "both"}).finished;
    el1.inert = true;
    el2.inert = false;
    currentPanel = panel;
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
    }
    const role = Array.from(document.querySelectorAll<HTMLInputElement>("input[name=onboarding-role]")).find(el => el.checked)?.value;
    if (!role) {
        document.getElementById("onboarding-role-c")!.animate([
            {backgroundColor: "#f00", color: "#f00"},
            {},
        ], {
            duration: 300,
        });
    }
    await switchToPanel("onboarding-2");
});