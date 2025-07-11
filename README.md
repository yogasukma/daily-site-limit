# Daily Site Limit Chrome Extension

Daily Site Limit is a Chrome extension that helps you monitor and manage the time you spend on different websites. Set daily time limits for specific sites, get notified when you exceed your limits, and view your browsing stats—all with a simple, user-friendly interface.

## Features

- **Track Time by Site:** Automatically tracks the time you spend on each website (by root domain).
- **Set Daily Limits:** Add rules to limit your daily time on specific sites.
- **In-Page Notification:** When you exceed your limit, a dismissible banner appears at the top of the site.
- **Stats & Reset:** View your daily stats and reset time tracking for any site.
- **Easy Rule Management:** Add or delete site rules directly from the popup interface.
- **Persistent Storage:** All data is stored locally in your browser using Chrome's storage API.

## How It Works

1. **Install the Extension:** Load the extension in Chrome (see below).
2. **Open the Popup:** Click the extension icon to open the popup window.
3. **Status Tab:** See your current site's time spent and limit. Reset time if needed.
4. **Rules Tab:** Add new site rules with daily time limits, or delete existing rules.
5. **Stats Tab:** View a summary of your time spent on all tracked sites for the current day.
6. **Notifications:** When you exceed a site's limit, you'll see a red banner at the top of the page (instead of a redirect or block).

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the project folder.
5. The extension icon should appear in your browser toolbar.

## File Overview

- `manifest.json` — Chrome extension manifest (v3)
- `background.js` — Handles time tracking, storage, and messaging
- `content.js` — Injects the in-page notification banner
- `popup.html` — The extension's popup UI
- `popup.js` — Logic for the popup (tabs, rules, stats, etc.)
- `popup.css` — Styles for the popup UI
- `icon.png` and `icons/` — Extension icons

## Development Notes

- Time is tracked per root domain (e.g., `youtube.com`, not full URLs).
- All logic runs locally; no data is sent to any server.
- The extension uses Chrome's `storage.local` for persistence.
- The in-page banner is injected via a content script and can be dismissed by the user.

## Contributing

Pull requests and suggestions are welcome! Please open an issue or submit a PR if you have ideas for improvements or bug fixes.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Daily Site Limit** helps you take control of your browsing habits and boost your productivity. Enjoy!
