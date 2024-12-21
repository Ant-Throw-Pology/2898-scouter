import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce } from "./utils";

document.getElementById("sid-continue")!.addEventListener("click", async () => {
    let role = (document.getElementById("scouter-role") as HTMLSelectElement).value;
    if (role === "pit") {
        alert("Pit scouter mode is currently unavailable.");
    }

    else {
        await sleep(2);
        alert("You have entered stand scouting mode! This should do something (soon).");
    }
});

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