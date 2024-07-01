# [TWO-TORIAL](https://two-torial.xyz)'s Web Patcher

### URL: [https://patcher.two-torial.xyz/](https://patcher.two-torial.xyz/)

## About

This repo contains web patches for games incompatible with [spice2x](https://spice2x.github.io/). See our [spice2x patcher](https://github.com/two-torial/sp2xpatcher/) for those.   
We'll be keeping the **repo public** and **url alive** for as long as possible, **feel free to [contibute](#Contributing)** for the community through pull requests!

## Usage

See our guide on [web patching](https://two-torial.xyz/extras/patchweb/) and use the url provided above.

## Contributing

### A new game

- Add the new game html, it is easiest to copy an existing game and modify it.
- Modify the `<title>` tag and the `<h1>` tag to the name of the new game.
- Modify the patcher for the new DLL names/patches.
- Keep indentation consistent. We will have to fix your PR if it contains poor formatting, which will delay the merging process.
- Modify `index.html` to add the new game. Sorting: alphabetical by game series, then in release order per game.
- Add a game image. 128x128px PNG files, please. Any blank space should be either white or transparent.
- Create a pull request.

### Patches for an existing game

- Open the game's html.
- If necessary: add a new PatchContainer.
- If necessary: add a new Patcher.
- Add your patches following the existing format.
- Create a pull request.
