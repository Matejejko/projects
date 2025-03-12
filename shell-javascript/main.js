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
        // Check if the command starts with a quote (single or double)
        if (answer.startsWith("'") || answer.startsWith('"')) {
            let quotedCommand, remainingArgs;

            if (answer.startsWith("'")) {
                // For single quotes - find the matching closing quote
                const endQuotePos = answer.indexOf("'", 1);
                if (endQuotePos > 0) {
                    quotedCommand = answer.substring(1, endQuotePos);
                    remainingArgs = answer.substring(endQuotePos + 1).trim();
                }
            } else if (answer.startsWith('"')) {
                // For double quotes - find the matching closing quote
                const endQuotePos = answer.indexOf('"', 1);
                if (endQuotePos > 0) {
                    quotedCommand = answer.substring(1, endQuotePos);
                    remainingArgs = answer.substring(endQuotePos + 1).trim();
                }
            }

            if (quotedCommand) {
                // Split remaining arguments by spaces (could be enhanced to handle quoted args)
                const args = remainingArgs
                    ? remainingArgs.split(/\s+/).filter(Boolean)
                    : [];

                // Look for the executable in PATH
                const paths = process.env.PATH.split(path.delimiter);
                let found = false;

                for (const p of paths) {
                    const fullPath = path.join(p, quotedCommand);
                    if (
                        fs.existsSync(fullPath) &&
                        fs.statSync(fullPath).isFile()
                    ) {
                        found = true;
                        try {
                            const baseName = path.basename(fullPath);
                            execFileSync(fullPath, args, {
                                stdio: "inherit",
                                argv0: baseName, // Use basename for argv[0]
                            });
                        } catch (error) {
                            console.error(
                                `Error executing command: ${error.message}`
                            );
                        }
                        prompt();
                        return;
                    }
                }

                if (!found) {
                    console.log(`${quotedCommand}: command not found`);
                    prompt();
                    return;
                }
            }
        }
        const arguments = answer.split(" ");
        const command = arguments[0];
        const commandArguments = arguments.slice(1);

        // Handle built-in commands
        if (command === "exit") {
            rl.close();
        } else if (command === "echo") {
            const match = answer.match(/^echo\s+(['].*['])$/);
            const match2 = answer.match(/^echo\s+(["].*["])$/);
            if (match) {
                const UNformattedStr = answer.slice(5).replace(/'/g, "");
                console.log(UNformattedStr);
                prompt();
            } else if (match2) {
                const formattedStr = answer
                    .slice(6)
                    .replace(/ {2,}"/g, '" ') // Fix multiple spaces before quotes
                    .replace(/\\\\"/g, "\\\\")
                    .replace(/(?<!\\)"/g, "") // Remove unescaped quotes
                    .replace(/(?<!\\)\\/g, ""); // Remove unescaped backslashes
                console.log(formattedStr);
                prompt();
            } else {
                console.log(
                    answer.slice(5).replace(/ {2,}/g, " ").replace(/\\/g, "")
                );
                prompt();
            }
        } else if (command === "type") {
            const cmdToCheck = commandArguments[0];
            if (prompts.includes(cmdToCheck)) {
                console.log(cmdToCheck, "is a shell builtin");
                prompt();
                return;
            } else {
                let found = false;
                const paths = process.env.PATH.split(path.delimiter);
                for (const p of paths) {
                    const fullPath = path.join(p, cmdToCheck);
                    if (
                        fs.existsSync(fullPath) &&
                        fs.statSync(fullPath).isFile()
                    ) {
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
        } else if (command === "pwd") {
            console.log(process.cwd());
            prompt();
            return;
        } else if (command === "cd") {
            if (commandArguments.length === 0) {
                process.chdir(process.env.HOME);
                prompt();
                return;
            } else if (commandArguments[0] === "~") {
                process.chdir(process.env.HOME);
                prompt();
                return;
            } else {
                let found = false;
                if (fs.existsSync(commandArguments[0])) {
                    found = true;
                    process.chdir(commandArguments[0]);
                    prompt();
                    return;
                }
                if (!found) {
                    console.log(
                        `cd: ${commandArguments[0]}: No such file or directory`
                    );
                    prompt();
                    return;
                }
            }
        } else if (command === "cat") {
            // Properly split input while preserving quoted strings (single and double quotes)
            const filePaths =
                answer
                    .match(/(['"])(?:(?=(\\?))\2.)*?\1|\S+/g)
                    ?.map((arg) => arg.replace(/^['"]|['"]$/g, "")) || [];

            const filesToRead = filePaths.slice(1); // Remove "cat" itself
            if (filesToRead.length === 0) {
                prompt(); // If no file is provided, return to prompt
                return;
            }

            let output = "";
            for (const filePath of filesToRead) {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    output += fs.readFileSync(filePath, "utf8"); // No newline, just concatenate
                }
            }
            process.stdout.write(output.trim() + "\n"); // Print output without extra newlines
            setTimeout(prompt, 0);
        } else {
            let found = false;
            const paths = process.env.PATH.split(path.delimiter);
            for (const pathEnv of paths) {
                const fullPath2 = path.join(pathEnv, command);
                if (
                    fs.existsSync(fullPath2) &&
                    fs.statSync(fullPath2).isFile()
                ) {
                    found = true;
                    const baseName = path.basename(fullPath2);
                    try {
                        execFileSync(fullPath2, commandArguments, {
                            stdio: "inherit",
                            argv0: baseName, // Use basename for argv[0]
                        });
                    } catch (error) {
                        console.error(
                            `Error executing command: ${error.message}`
                        );
                    }
                    break;
                }
            }
            if (!found) {
                console.log(`${command}: command not found`);
            }
            prompt();
            return;
        }
    });
}

prompt();
