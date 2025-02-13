const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const prompts = ["echo", "exit", "type"];

function prompt() {
    rl.question("$ ", (answer) => {
        if (answer === "exit 0" || answer === "exit") {
            rl.close();
        } else if (answer.startsWith("echo ")) {
            console.log(answer.slice(5));
            prompt();
        } else if (answer.startsWith("type ")) {
            answernow = answer.slice(5);
            if (prompts.includes(answernow)) {
                console.log(answernow, "is a shell builtin");
                prompt();
            } else {
                console.log(answernow + ": not found");
                prompt();
            }
        } else {
            console.log(`${answer}: command not found`);
            prompt();
        }
    });
}

prompt();
