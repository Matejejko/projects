// Minimal Shell with fewer libraries
const fs = require("fs");
const { execFileSync } = require("child_process");

process.stdin.setEncoding("utf8");
let input = "";
const builtins = ["echo", "exit", "type", "pwd", "cd", "cat"];

function prompt() {
    process.stdout.write("$ ");
}

process.stdin.on("data", (chunk) => {
    input += chunk;
    if (input.includes("\n")) {
        const command = input.trim();
        input = "";
        handleCommand(command);
        prompt();
    }
});

function handleCommand(input) {
    if (!input) return;

    if (input.includes(">")) {
        handleRedirection(input);
        return;
    }

    const args =
        input
            .match(/(['"])(?:(?=(\\?))\2.)*?\1|\S+/g)
            ?.map((arg) => arg.replace(/^['"]|['"]$/g, "")) || [];
    const command = args[0];
    const commandArgs = args.slice(1);

    switch (command) {
        case "exit":
            console.log("Bye!");
            process.exit(0);
        case "echo":
            console.log(commandArgs.join(" "));
            break;
        case "pwd":
            console.log(process.cwd());
            break;
        case "cd":
            changeDirectory(commandArgs);
            break;
        case "type":
            showType(commandArgs[0]);
            break;
        case "cat":
            catFiles(commandArgs);
            break;
        default:
            runExternal(command, commandArgs);
    }
}

function changeDirectory(args) {
    const target = args[0] || process.env.HOME;
    try {
        process.chdir(target);
    } catch {
        console.log(`cd: ${target}: No such file or directory`);
    }
}

function showType(cmd) {
    if (builtins.includes(cmd)) {
        console.log(`${cmd} is a shell builtin`);
    } else {
        const paths = process.env.PATH.split(":");
        for (const p of paths) {
            const fullPath = p + "/" + cmd;
            if (fs.existsSync(fullPath)) {
                console.log(`${cmd} is ${fullPath}`);
                return;
            }
        }
        console.log(`${cmd}: not found`);
    }
}

function catFiles(files) {
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, "utf8");
            process.stdout.write(content);
        } catch {
            console.log(`cat: ${file}: No such file or cannot read`);
        }
    }
}

function runExternal(cmd, args) {
    const paths = process.env.PATH.split(":");
    for (const p of paths) {
        const fullPath = p + "/" + cmd;
        if (fs.existsSync(fullPath)) {
            try {
                execFileSync(fullPath, args, { stdio: "inherit" });
            } catch (err) {
                console.log(`Error executing command: ${err.message}`);
            }
            return;
        }
    }
    console.log(`${cmd}: command not found`);
}

function handleRedirection(input) {
    const [cmdStr, fileStr] = input.split(">").map((s) => s.trim());
    const args =
        cmdStr
            .match(/(['"])(?:(?=(\\?))\2.)*?\1|\S+/g)
            ?.map((arg) => arg.replace(/^['"]|['"]$/g, "")) || [];
    const cmd = args[0];
    const cmdArgs = args.slice(1);
    try {
        const result = execFileSync(cmd, cmdArgs, { encoding: "utf8" });
        fs.writeFileSync(fileStr, result);
    } catch {
        console.log(
            `Redirection failed: cannot execute or write to ${fileStr}`
        );
    }
}
