function sortLines() {
    const input = document.getElementById("input").value;
    const outputSection = document.getElementById("outputSection");
    const output = document.getElementById("output");

    if (!input.trim()) {
        alert("Prosím zadajte text!");
        return;
    }

    // Split by semicolon and trim whitespace
    const lines = input
        .split(";")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    // Sort lines alphabetically by first letter (case-insensitive)
    const sortedLines = lines.sort((a, b) => {
        const firstA = a.charAt(0).toLowerCase();
        const firstB = b.charAt(0).toLowerCase();
        return firstA.localeCompare(firstB, "sk");
    });

    // Display result
    output.textContent = sortedLines.join("\n");
    outputSection.classList.add("show");
}

// Allow sorting with Enter key (Ctrl+Enter for new line in textarea)
document.getElementById("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        sortLines();
    }
});
