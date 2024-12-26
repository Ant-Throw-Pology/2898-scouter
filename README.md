# 2898 Scouting App
> We are not affiliated with FIRST or FRC. **You** are responsible for following all rules when using this program. The developers of this program are **NOT** responsible for any rules broken during use of this program.

A scouting app written in HTML, CSS, and Typescript. Currently only available as a webpage. In the future, hopefully a version that can download to computers will be available.

## Contributing
We use `bun` as our build system.
To install dependencies:

```bash
bun install
```

To run, build the TypeScript:
```bash
bun run build
```
Open `build/index.html` in your web browser.

This must be run every time you make a change. If you want `bun` to continuously check for changes, instead run:
```bash
bun run build --watch
```
And then every time you save a file and reload `build/index.html`, the changes will instantly appear.
