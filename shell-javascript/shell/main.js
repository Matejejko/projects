const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { getAIWithHistory } = require("./uwuai.js");

let chatMode = false;
let memoryContext = {
    history: [],
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const builtinCommands = {
    exit: handleExit,
    pwd: handlePwd,
    echo: handleEcho,
    type: handleType,
    cd: handleCd,
    cat: handleCat,
    mommy: handleMommy,
};

function handleExit() {
    console.log("\x1b[38;2;255;182;193m%s\x1b[0m", "bwie UwU");
    setTimeout(() => {
        rl.close();
    }, 200);
}

function handlePwd() {
    console.log(process.cwd());
    prompt();
    return;
}

function handleEcho(answer, args) {
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
        console.log(answer.slice(5).replace(/ {2,}/g, " ").replace(/\\/g, ""));
        prompt();
    }
}

function handleType(answer, args) {
    const cmdToCheck = args[0];
    if (Object.keys(builtinCommands).includes(cmdToCheck)) {
        console.log(
            "\x1b[38;2;226;0;116m%s\x1b[0m",
            `${cmdToCheck} is a shell builtin`
        );
        prompt();
        return;
    } else {
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
            console.log(`${cmdToCheck}: not found :(`);
            prompt();
            return;
        }
    }
}

function handleCd(answer, args) {
    if (args.length === 0 || args[0] === "~") {
        process.chdir(process.env.HOME);
        prompt();
        return;
    } else if (args[0] === "~") {
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
}

function handleCat(answer, args) {
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
}

function executeExternalCommand(command, args) {
    const paths = process.env.PATH.split(path.delimiter);

    for (const pathEnv of paths) {
        const fullPath = path.join(pathEnv, command);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const baseName = path.basename(fullPath);
            try {
                execFileSync(fullPath, args, {
                    stdio: "inherit",
                    argv0: baseName, // Use basename for argv[0]
                });
            } catch (error) {
                console.log(`Error executing command: ${error.message}`);
            }
            prompt();
            return true;
        }
    }
    console.log(`${command}: command not found`);
    prompt();
    return false;
}

function handleCommandWithRedirection(answer) {
    const redirectionParts = answer.replace(/\d+>(?=\s|$)/g, ">").split(">");
    const commandWithArgs = redirectionParts[0].trim().replace(/'/g, "");
    const redirectTarget = redirectionParts[1].trim();

    if (!redirectTarget) {
        console.error("Error: No file specified for redirection");
        prompt();
        return;
    }

    // Check if there's a file descriptor specified (like 1> or 2>)
    const descriptorMatch = redirectTarget.match(/^(\d+)?\s*(.*)/);
    const fileDescriptor = descriptorMatch[1]
        ? parseInt(descriptorMatch[1])
        : 1; // Default to stdout (1)
    const fileName = descriptorMatch[2].trim();

    // Split command into program and arguments
    const commandParts = commandWithArgs.split(/\s+/);
    const command = commandParts[0];
    const commandArguments = commandParts.slice(1);

    try {
        // Execute command with arguments
        const result = execFileSync(command, commandArguments, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        });
        // Write result to file
        fs.writeFileSync(fileName, result);
        prompt(); // Return to prompt after successful redirection
    } catch (error) {
        if (error.stdout) {
            fs.writeFileSync(fileName, error.stdout); // Partial output from stdout
        }
        if (error.stderr) {
            console.error(error.stderr.toString()); // Print errors to console
        }
        prompt();
        return;
    }
    // Validate input
    if (!fileName) {
        console.error("Error: No file specified for redirection");
        prompt(); // Return to prompt
        return;
    }
    if (fileDescriptor !== 1) {
        console.error("Error: Only stdout redirection (1>) is supported");
        prompt(); // Return to prompt
        return;
    }
}

function handleQuotedCommand(answer) {
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
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                found = true;
                try {
                    const baseName = path.basename(fullPath);
                    execFileSync(fullPath, args, {
                        stdio: "inherit",
                        argv0: baseName, // Use basename for argv[0]
                    });
                } catch (error) {
                    console.error(`Error executing command: ${error.message}`);
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

function processCommand(answer) {
    if (chatMode) {
        handleChatMode(answer);
        return;
    }
    // Handle quoted executable commands first
    if (answer.startsWith("'") || answer.startsWith('"')) {
        handleQuotedCommand(answer);
        return;
    }

    // Handle redirection
    if (answer.includes(">")) {
        handleCommandWithRedirection(answer);
        return;
    }

    const arguments = answer.split(" ");
    const command = arguments[0];
    const commandArguments = arguments.slice(1);

    // Check if it's a builtin command
    if (builtinCommands[command]) {
        builtinCommands[command](answer, commandArguments);
        return;
    }

    // Try to execute as an external command
    executeExternalCommand(command, commandArguments);
}

function handleMommy(answer, args) {
    chatMode = true;
    memoryContext.history = [];
    const msg = answer.slice(8).trim();
    if (msg) {
        handleChatMode(msg);
    } else {
        console.log(
            "\x1b[38;2;255;182;193mbwie UwU:\x1b[0m What is it bu-bu-bu-buzerant 👻."
        );
        prompt();
    }
}

function handleChatMode(input) {
    if (input.trim().toLowerCase() === "exit") {
        chatMode = false;
        memoryContext.history = [];
        console.log("\x1b[38;2;255;182;193mbwie UwU:\x1b[0m See you later.");
        prompt();
        return;
    }

    memoryContext.history.push({ role: "user", content: input });
    if (memoryContext.history.length > 20) {
        memoryContext.history = memoryContext.history.slice(-20);
    }

    console.log("\x1b[38;2;255;182;193mbwie UwU\x1b[0m is thinking... ✨");
    getAIWithHistory(memoryContext.history).then((reply) => {
        memoryContext.history.push({ role: "assistant", content: reply });
        console.log("\x1b[38;2;255;182;193mbwie UwU:\x1b[0m", reply);
        prompt();
    });
}

function prompt() {
    if (chatMode) {
        rl.question("\x1b[38;2;226;0;116mchatting<3 \x1b[0m", processCommand);
    } else {
        rl.question("\x1b[38;2;226;0;116m<3 \x1b[0m", processCommand);
    }
}
prompt();
