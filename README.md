# [TWO-TORIAL](https://two-torial.xyz)'s Web Patcher

### URL: `https://patcher.two-torial.xyz/`

## About

This repo contains web patches to use with various non-bemani games. We have a [spice2x patcher](https://github.com/two-torial/sp2xpatcher/) for that.   
We'll be keeping the **repo public** and **url alive** for as long as possible, **feel free to [contibute patches](CONTRIBUTING.md)** for the community through pull requests!

## Usage

See our guide on [web patching](https://two-torial.xyz/extras/patchweb/) and use the url provided above.

## Submitting a new game

- Add the new game html, it is easiest to copy an existing game and modify it.
  The html should be named `[game][release].html` except IIDX because they just
  happen to be `[release].html` only...
- Modify the `<title>` tag and the `<h1>` tag to the name of the new game.
- Modify the patcher for the new DLL names/patches.
- Keep consistent indentation for the new patches. We will have to fix your PR if
  it contains poor formatting, which will delay the merging process.
- Modify `index.html` to add the new game. Sorting: alphabetical by game series,
  then in release order per game.
- Add a game image. 128x128px PNG files, please. Any blank space should be
  either white or transparent.