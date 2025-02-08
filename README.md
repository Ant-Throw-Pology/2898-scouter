# 2898 Scouting App
> We are not affiliated with FIRST or FRC. **You** are responsible for following all rules when using this program. The developers of this program are **NOT** responsible for any rules broken during use of this program.

A scouting app written in HTML, CSS, and TypeScript by members of FRC team 2898.

Try the app here: https://ant-throw-pology.github.io/2898-scouter

An installer is available (for Linux, macOS, Windows, Crostini/ChromeOS Linux Mode) which will install the app to your computer: https://github.com/droid-kk11/2898-scouter-installer

## Contributing

We use [Bun](https://bun.sh/) as our build system.

To install dependencies:

```bash
bun install
```

To run, build the TypeScript:
```bash
bun run build
```

To continuously build when a file is changed (recommended when coding):
```bash
bun run build --watch
```

Then, open `build/index.html` in your web browser or serve the `build` directory with a file server.

This must be run every time you make a change. If you want `bun` to continuously check for changes, instead run:

```bash
bun run build --watch
```

### Adding an asset

* [ ] Add the asset under the `src` directory
* [ ] Import the asset in `index.ts`:
    ```ts
    import "./asset.png" with {type: "file"};
    ```
* [ ] Add the asset to the list of cached resources in `serviceworker.ts`