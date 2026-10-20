<p align="center">
  <img src="icons/icon-128.png" width="96" alt="Export Bookmarks">
</p>

<h1 align="center">Export Bookmarks</h1>

<p align="center">
  A small Google Chrome extension that saves your bookmarks as JSON, HTML, or CSV.<br>
  Export everything, or just one folder.
</p>

<p align="center">
  <img alt="Version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-2563eb">
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-V3-1a73e8">
  <img alt="Google Chrome" src="https://img.shields.io/badge/Chrome-extension-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Open source" src="https://img.shields.io/badge/open%20source-MIT-16a34a">
  <img alt="Tests" src="https://img.shields.io/badge/tests-node%20--test-0f172a">
</p>

The popup, the extension name, and the toolbar tooltip are in English. Nothing leaves your browser: the file is written to Chrome’s downloads folder.

## Features

- Export **all bookmarks**, or **one folder** and everything inside it.
- Folder tree with a live count of bookmarks in each folder, subfolders included.
- Search that ignores case and accents, and still shows the folders above each match.
- Download as **JSON**, **HTML**, or **CSV**. **Basic** keeps titles, URLs, and folders. **Full** adds the Chrome properties that are present.
- Download names such as `bookmarks-10-19.json` or `bookmarks-Work-10-19.csv`.
- Light and dark theme. The popup follows the system until you pick one; the choice is remembered.
- Keyboard support for search and the folder tree.
- Manifest V3. The only permission is `bookmarks`.

## Install

Load the folder as an unpacked extension:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.

The toolbar icon is **Export Bookmarks**.

## Usage

Click the icon. The popup opens on **All**. The summary shows the folder, how many folders, and how many bookmarks. Choose **JSON**, **HTML**, or **CSV**, and **Basic** or **Full**, then click **Download**. The last format and detail are remembered.

Switch to **Folder** to search and pick a folder. Counts include bookmarks in subfolders. Choose a folder, then click **Download**.

| What you export | File name |
| --- | --- |
| All bookmarks | `bookmarks-MM-DD.json`, `.html`, or `.csv` |
| One folder | `bookmarks-<folder>-MM-DD.json`, `.html`, or `.csv` |

`MM-DD` is the local date on the machine that runs the export. Characters in the folder name that are not letters or numbers become hyphens.

### Keyboard

| Key | Where | Action |
| --- | --- | --- |
| Down | Search | Move into the folder tree |
| Up / Down | Tree | Move between rows |
| Up on the first row | Tree | Return to search |
| Right / Left | Tree | Expand or collapse the folder |
| Enter | Tree | Download the selected folder |

The button at the top right switches between light and dark.

## Export format

**Basic** is the default. A folder has `"type": "Folder"` and `children`. A bookmark has `title` and `url`. `exportedAt` is the local date, `YYYY-MM-DD`.

```json
{
  "exportedAt": "2026-10-19",
  "source": "Google Chrome",
  "bookmarks": [
    {
      "type": "Folder",
      "title": "Bookmarks bar",
      "children": [
        {
          "title": "MDN",
          "url": "https://developer.mozilla.org/"
        }
      ]
    }
  ]
}
```

**Full** keeps that shape and adds only the Chrome fields that exist on each node: `id`, `parentId`, `index`, `dateAdded`, `dateLastUsed`, `dateGroupModified`, `unmodifiable`, `folderType`, and `syncing`. In JSON the dates stay as the millisecond numbers Chrome stores.

**CSV Basic** is one row per bookmark, with `Folder`, `Title`, and `URL`. `Folder` is the parent path, such as `Bookmarks bar/Dev`. Empty folders are omitted. Commas, quotes, and line breaks are escaped, and the file starts with a UTF-8 BOM.

**CSV Full** also writes a row for each folder. Columns: `Type`, `Folder`, `Title`, `URL`, `Id`, `ParentId`, `Index`, `DateAdded`, `DateLastUsed`, `DateGroupModified`, `Unmodifiable`, `FolderType`. Dates are ISO-8601 UTC. Empty cells stay empty.

**HTML** is one page with nested lists. Folder names are headings, and `http` and `https` bookmarks are links. Any other URL is shown as text. **HTML Full** adds a line under each item for the extra fields that exist, with dates in ISO-8601 UTC.

## Privacy

The extension reads bookmarks only when you open the popup and export. The file stays in your downloads folder. There is no account, no analytics, and no network request of its own.

## Versions

| | |
| --- | --- |
| Extension | **1.0.0** (`manifest.json`) |
| Manifest | **3** |
| Locale | English (`_locales/en`) |
| Browser | Google Chrome, or another Chromium browser that loads Manifest V3 extensions |

## Development

Export logic lives in `lib/bookmarks.js` and does not depend on Chrome. Tests use the Node.js test runner:

```bash
npm test
```

Node.js is only needed to run tests. The extension itself has no build step.

```
manifest.json          extension manifest
popup.html             popup markup
popup.js               popup behavior
popup.css              popup styles
tema.js                theme, applied before first paint
lib/bookmarks.js       tree, JSON, CSV, HTML, file name
lib/i18n.js            English copy used by the popup
_locales/en/           name, description, and tooltip
icons/                 16, 32, 48, and 128 px
Icon.png               source artwork
tests/                 node:test
```

`Icon.png` is the original artwork. Chrome uses the sizes in `icons/`. If you replace the original, regenerate `icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png` from it.

## License

Open source under the [MIT License](LICENSE).
