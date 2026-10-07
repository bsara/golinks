<img src="/images/icon.png" width=80 />

## golinks

> [!NOTE]
> This is a fork of [jkulton/golinks](https://github.com/jkulton/golinks). Major differences from the original:
>
> - golinks are opened with the omnibox keyword `go` + <kbd>Space</kbd> instead of `go/` URLs, so the extension doesn't need `declarativeNetRequest` redirect rules
> - As you type, the omnibox suggests golinks by fuzzy match and shows the URL of each
> - Text after a slash is appended to the golink's URL (`go gh/bsara/golinks` opens `https://github.com/bsara/golinks`)
> - `go links` or `go /` opens the index
> - Shared golinks can be loaded from a remote CSV URL, such as a Google Sheet. Personal golinks override remote ones with the same name
> - New remote golinks can be created through a configurable URL template, from the create page or automatically for unknown `go` links
> - Host permissions are optional. They are only requested for a remote CSV URL, so files that need you to be signed in can be loaded

golinks in your browser, without the need to modify DNS settings or run a server.

This is an unpacked Chrome extension which leverages Chrome's [`omnibox`](https://developer.chrome.com/docs/extensions/reference/api/omnibox) API to function as an all-in-one golinks system for personal use.

> [!IMPORTANT]  
> golink data can be kept entirely **local**, using Chrome's [`storage.local`](https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas). Loading golinks from a remote CSV and creating links in it are optional.

### Installation

1. Clone (or download) this repo
2. Go to **Manage Extensions** in your Chrome-based browser (`chrome://extensions`)
3. Toggle **Developer mode** on, then click **Load unpacked** and select the cloned/downloaded repo
4. The extension should install and open the help page

### Usage

Type `go`, press <kbd>Space</kbd>, then type a name to search your golinks.

### Screenshot

<img src="/images/screenshot.png" />

### Remote golinks

Load shared golinks from a CSV file at a URL, for example a team's Google Sheet.

<img src="/images/screenshot-remote-golinks.png" />

1. On the index page, enter the URL in **Remote CSV URL** and click **Save**
2. When Chrome asks for access to the site, allow it if the file needs you to be signed in (such as a private Google Sheet)
3. Select **Ignore the first line (header row)** if the file has a header

Each line of the CSV is `name,url`. Lines with an empty name or an invalid URL are skipped.

For a Google Sheet, use its CSV export URL: `https://docs.google.com/spreadsheets/d/<sheet-id>/export?format=csv`

Remote golinks reload when the browser starts and periodically after that. Click the reload icon next to the URL to reload them now.

On the index page, remote golinks are marked `remote`. A personal golink with the same name overrides the remote one.

### Remote link creation

Add new golinks to the remote CSV through a URL that you configure, for example a Google Form that adds rows to the sheet.

<img src="/images/screenshot-remote-link-creation.png" />

1. On the index page, click **Add Remote Link Creation**
2. Enter a URL template and click **Save**

The template can include these placeholders:

| Placeholder | Replaced with |
|---|---|
| `{{name}}` | The URL-encoded link name |
| `{{url}}` | The URL-encoded link URL |
| `{{hasUrl:...}}` | Everything after the colon, only when a URL is given. Can contain `{{name}}` and `{{url}}` |

For example, `https://example.com/new?name={{name}}{{hasUrl:&url={{url}}}}`

On the create page, click **Create Remote Link** to open the filled-in URL. The URL field is optional for remote links. The button is disabled until a remote CSV URL and a template are set.

<img src="/images/screenshot-create-remote-link.png" />

Select **Open this URL for unknown `go` links** to open the template URL, instead of the create page, when you enter a name that doesn't exist. This also needs a remote CSV URL to be set. Only `{{name}}` is filled in.
