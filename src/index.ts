import "./index.html" with {type: "asset"};
import "./index.css" with {type: "asset"};
import { ce } from "./utils";

document.getElementById("sid-continue")!.addEventListener("click", () => {
    let role = (document.getElementById("scouter-role") as HTMLSelectElement).value;
    if (role === "pit") {
        alert("Pit scouter mode is currently unavailable.");
    }

    else {
        alert("You have entered stand scouting mode! This should do something (soon).");
    }
});
