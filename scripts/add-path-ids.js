const fs = require("fs");
const path = require("path");

// Read the SVG file
const svgPath = path.join(__dirname, "../client/public/map-transparent.svg");
const svgContent = fs.readFileSync(svgPath, "utf8");

// Create a counter for unique IDs
let pathCounter = 0;

// Replace each path element with a path that has a unique ID
const modifiedContent = svgContent.replace(/<path([^>]*)>/g, (match, attributes) => {
    pathCounter++;
    return `<path id="path-${pathCounter}"${attributes}>`;
});

// Write the modified content back to the file
fs.writeFileSync(svgPath, modifiedContent);

console.log(`Added ${pathCounter} unique IDs to paths in the SVG file.`);
