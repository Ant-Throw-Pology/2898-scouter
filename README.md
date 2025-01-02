# 2898 Scouting App
> We are not affiliated with FIRST or FRC. **You** are responsible for following all rules when using this program. The developers of this program are **NOT** responsible for any rules broken during use of this program.

A scouting app written in HTML, CSS, and Typescript. Currently only available as a webpage. We plan to make this an installable application, eventually.

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

Then, open `build/index.html` in your web browser or serve the `build` directory with a file server.

This must be run every time you make a change. If you want `bun` to continuously check for changes, instead run:

```bash
bun run build --watch
```