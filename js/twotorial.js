(function (w, d) {
    // Parsing Markdown with regex, what can go wrong?
    const ENTRY_REGEX = /\| (?<codename>[0-9A-Z]{3}(?:-\d{3})?) \| (?<filename>[^|]+) \| (?<version>[^|]+) \| \[(?<ident>[0-9A-Z]{3}-[0-9a-f]+_[0-9a-f]+)\]/gmu;

    const hexToBytes = function (hex) {
        const bytes = [];
        
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        
        return bytes;
    }

    /**
     * Get the game name 
     * @param {string} game 
     */
    async function loadTwoTorialSpicePatches(game) {
        const supported = await fetch("https://raw.githubusercontent.com/two-torial/sp2xpatcher/main/SUPPORTED.md")
            .then((r) => r.text());
        
        // I am honestly amazed at how well modern HTML parsers deal with not HTML.
        const doc = new DOMParser().parseFromString(supported, "text/html");
        const table = doc.evaluate(`//details[./summary[text() = "${game}"]]`, doc, null, XPathResult.ANY_TYPE, null).iterateNext();

        if (!table) {
            throw new Error(`Game not found: ${game}`);
        }

        const tableText = /** @type {string} */(table.innerText);

        // Each filename gets one patch container.
        const entriesByFilenames = {};

        for (const entry of tableText.matchAll(ENTRY_REGEX))  {
            if (!entriesByFilenames[entry.groups.filename]) {
                entriesByFilenames[entry.groups.filename] = [];
            }

            entriesByFilenames[entry.groups.filename].push({
                codename: entry.groups.codename,
                version: entry.groups.version,
                identifier: entry.groups.ident,
            });
        }

        const exampleFilename = Object.keys(entriesByFilenames)[0];
        const [exampleFilenameBase, exampleFilenameExt] = exampleFilename.split(".", 2);
        const warningEl = document.createElement("div");
        warningEl.style.borderColor = "#ffe69c";
        warningEl.style.borderWidth = "1px";
        warningEl.style.borderStyle = "solid"
        warningEl.style.backgroundColor = "#4d3a02";
        warningEl.className = "patchContainer";
        warningEl.innerHTML = `
        <h2>Hey, maybe try using <a href="https://two-torial.xyz/extras/patchsp2x/">spice2x remote patching</a>!</h2>
            It applies patches at runtime, keeping your data clean, but still letting you hard patch when necessary.
            No more ${exampleFilenameBase} (${Math.trunc(Math.random() * 100) + 1}).${exampleFilenameExt}.
        `;
        document.body.appendChild(warningEl);

        const patchersPromises = Object.entries(entriesByFilenames).map(async ([filename, patchsets]) => {
            const singleCodename = patchsets.every((p, _, ps) => ps[0].codename === p.codename); 
            const patchers = await Promise.all(
                patchsets.map(async (p) => {
                    const patches = [];
                    const spicePatches = await fetch(`https://sp2x.two-torial.xyz/${p.identifier}.json`).then((r) => r.json());

                    for (let i = 0; i < spicePatches.length; i++) {
                        const spicePatch = spicePatches[i];
                        const name = spicePatch.name;
                        const type = spicePatch.type;

                        if (!name || !type) {
                            if (i !== 0) {
                                console.warn("Invalid patch: Missing name/type", spicePatch);
                            }
                            
                            continue;
                        }

                        switch (type) {
                            case "memory": {
                                const patch = {
                                    name,
                                    tooltip: spicePatch.description,
                                    patches: spicePatch.patches.map((p) => ({
                                        offset: p.offset,
                                        off: hexToBytes(p.dataDisabled),
                                        on: hexToBytes(p.dataEnabled),
                                    })),
                                };

                                patches.push(patch);
                                break;
                            }
                            case "union": {
                                if (spicePatch.patches.some((p, _, ps) => ps[0].patch.offset !== p.patch.offset)) {
                                    console.warn("Could not convert union patch to BemaniPatcher: At least one patch in union has a different offset.", spicePatch.patches);
                                    continue;
                                }
                                
                                const patch = {
                                    type,
                                    name,
                                    tooltip: spicePatch.description,
                                    patches: spicePatch.patches.map((p) => ({
                                        name: p.name,
                                        patch: hexToBytes(p.patch.data),
                                    })),
                                };

                                patches.push(patch);
                                break;
                            }
                            default:
                                console.warn(`Unsupported patch type ${type}`, spicePatch);
                                break;
                        }
                    }


                    let displayVersion = p.version;

                    if (!singleCodename) {
                        displayVersion += ` (${p.codename})`;
                    }

                    return new Patcher(filename, displayVersion, patches);
                })
            );

            return patchers;
        });

        (await Promise.all(patchersPromises)).forEach((ps) => new PatchContainer(ps));
    }

    window.loadTwoTorialSpicePatches = loadTwoTorialSpicePatches;
})(window, document);
