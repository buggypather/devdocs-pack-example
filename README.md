# DevDocs doc pack: Dev Notes

An example [doc pack](https://github.com/buggypather/devdocs/blob/main-custom-docs/docs/doc-packs.md):
documentation you can add to DevDocs by pasting this repository's address under
**Preferences → Doc packs**.

## Editing

The pages are plain HTML in `src/notes/`. After changing them, rebuild and commit:

```sh
node build.mjs
```

`build.mjs` writes `docs.json` and the `notes/` folder (`index.json`, `db.json` and the pages),
which is what DevDocs downloads. Each folder in `src/` is one doc, described by its `doc.json`.
