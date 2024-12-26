import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce } from "./utils";

document.getElementById("sid-continue")!.addEventListener("click", async () => {
    let role = (document.getElementById("scouter-role") as HTMLSelectElement).value;
    let sid = (document.getElementById("scouter-id") as HTMLElement);
    let tlist = (document.getElementById("teams-list") as HTMLElement);
    if (role === "pit") {
        //transition(sid, tlist);
        alert("Pit scouting mode is currently unavailable");
    }

    else if (role === "stand") {
        transition(sid, tlist);
    }

    else if (role === "head") {
        alert("Head scouting mode is currently unavailable.");
    }
});

async function transition(element1: HTMLElement, element2: HTMLElement) {
    element1.style.animationName = "fade-out";
    element1.style.animationDuration = "0.5s";
    element1.style.animationTimingFunction = "linear";
    await sleep(0.5);
    element1.style.display = "none";
    element2.style.animationName = "fade-in";
    element2.style.animationDuration = "0.5s";
    element2.style.animationTimingFunction = "linear";
    element2.style.display = "block";
    await sleep(0.5);
    return;
}

function sleep(sec: number) {
    let ms = sec * 1000;
    return new Promise(res => setTimeout(res, ms));
}

function greetUser(){
    let greeting = (document.getElementById("user-greeting") as HTMLHeadingElement).innerText;
    let name = (document.getElementById("s-name") as HTMLInputElement).value;
    let first_name = name.split(" ")[0];
    greeting = `Welcome. ${first_name}`;
}

function notImplemented(){
    alert("This function has not been implemented yet. Apologies.");
}