const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const prompts = ["echo", "exit", "type", "pwd", "cd"];

function prompt() {
    rl.question("$ ", (answer) => {
        const arguments = answer.split(" ");
        const command = arguments[0];
        const commandArguments = arguments.slice(1);
        if (command === "exit") {
            rl.close();
        } 
        else if (command === "echo") {
            console.log(answer.slice(5));
            prompt();
        } 
        else if (command === "type") {
            const cmdToCheck = commandArguments[0];
            if (prompts.includes(cmdToCheck)) {
                console.log(cmdToCheck, "is a shell builtin");
                prompt();
                return;
            } 
            else {
                let found = false;
                const paths = process.env.PATH.split(path.delimiter);
                for (const p of paths) {
                    const fullPath = path.join(p, cmdToCheck);
                    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                        console.log(`${cmdToCheck} is ${fullPath}`);
                        found = true;
                        prompt();
                        return;
                    }
                }
                if (!found) {
                    console.log(`${cmdToCheck}: not found`);
                    prompt();
                    return;
                }
            }
        }
        else if (command === "pwd") {
            console.log(process.cwd());
            prompt();
            return;
        }
        else if (command === "cd") {
            if (commandArguments.length === 0) {
                process.chdir(process.env.HOME);
                prompt();
                return;
            }
            else if (commandArguments[0] === "~") {
                process.chdir(process.env.HOME);
                prompt();
                return;
            }
            else {
                let found = false;
                if(fs.existsSync(commandArguments[0])){
                    found=true;
                    process.chdir(commandArguments[0]);
                    prompt();
                    return;
                }
                if (!found){
                    console.log(`cd: ${commandArguments[0]}: No such file or directory`);
                    prompt();
                    return;
                }
            }            
        }
        else {
            let found = false;
            const paths = process.env.PATH.split(path.delimiter);
            for (const pathEnv of paths) {
                const fullPath2 = path.join(pathEnv, command);
                if (fs.existsSync(fullPath2) && fs.statSync(fullPath2).isFile()) {
                    found = true;
                    const programName = path.basename(fullPath2);
                    execFileSync(programName, commandArguments, { encoding: "utf-8", stdio: "inherit" });
                    prompt();
                    return;
                }
            }
            if (!found) {
                console.log(`${command}: command not found`);
                prompt();
                return;
            }

        }
    });
}

prompt();
