<img src="/images/icon.png" width=80 />

## golinks

> [!NOTE]
> This is a fork of [jkulton/golinks](https://github.com/jkulton/golinks). Major differences from the original:
>
> - golinks are opened with the omnibox keyword `go` + <kbd>Space</kbd> instead of `go/` URLs, so the extension no longer needs `declarativeNetRequest` redirect rules or host permissions
> - As you type, the omnibox suggests golinks by fuzzy match and shows the URL of each
> - Text after a slash is appended to the golink's URL (`go gh/bsara/golinks` opens `https://github.com/bsara/golinks`)
> - `go links` (or `go` + <kbd>Space</kbd> with no name) opens the index

golinks in your browser, without the need to modify DNS settings or run a server.

This is an unpacked Chrome extension which leverages Chrome's [`omnibox`](https://developer.chrome.com/docs/extensions/reference/api/omnibox) API to function as an all-in-one golinks system for personal use.

> [!IMPORTANT]  
> All golink data is stored **locally** using Chrome's [`storage.local`](https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas)

### Installation

1. Clone (or download) this repo
2. Go to **Manage Extensions** in your Chrome-based browser (`chrome://extensions`)
3. Toggle **Developer mode** on, then click **Load unpacked** and select the cloned/downloaded repo
4. The extension should install and open the help page

### Usage

Type `go`, press <kbd>Space</kbd>, then type a name to search your golinks.

### Screenshot

<img src="/images/screenshot.png" />
