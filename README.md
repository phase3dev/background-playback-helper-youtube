<div align="center">
  <img src="./background-playback-helper/icons/icon128.png" alt="Background Playback Helper Logo" width="128"/>
  <br/>
  <h1>Background Playback Helper (YouTube & Vimeo)</h1>
 <p>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/playback-helper-youtube-vimeo/"><img src="https://img.shields.io/amo/v/playback-helper-youtube-vimeo?label=Firefox%20Add-on&logo=firefox&logoColor=white&color=FF7139" alt="Firefox Add-on"/></a>&nbsp;<a href="https://addons.mozilla.org/en-US/firefox/addon/playback-helper-youtube-vimeo/"><img src="https://img.shields.io/amo/users/playback-helper-youtube-vimeo?label=Users&color=brightgreen" alt="Users"/></a>&nbsp;<a href="https://addons.mozilla.org/en-US/firefox/addon/playback-helper-youtube-vimeo/"><img src="https://img.shields.io/amo/rating/playback-helper-youtube-vimeo?label=Rating&color=brightgreen" alt="Rating"/></a>&nbsp;<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/></a>
</p>
</div>

A Firefox extension that prevents videos from pausing on YouTube, YouTube Music, and Vimeo when switching apps, tabs, or locking the screen. Also automatically handles "Continue watching?" and similar inactivity dialogs on YouTube and YouTube Music. Designed to work on both Firefox for Android and Firefox Desktop.

## Features

- **Firefox for Android:** Helps maintain background audio playback when switching apps or locking the screen.
- **Firefox Desktop:** Prevents videos from pausing when switching tabs and stabilizes playback in secondary UI contexts such as the Firefox sidebar or DevTools responsive mode. Verified compatible on Windows; other desktop platforms are not officially tested.
- **Auto-Dismiss Idle Prompts:** Automatically handles "Continue watching?" and similar inactivity dialogs on YouTube and YouTube Music, and periodically pings the player to help prevent idle timeouts. Enabled by default.
- **Active Status Indicator:** Automatically detects supported sites and displays a green icon and badge when the helper is active.
- **Dark Mode UI:** Minimal, dark-themed popup interface for toggling features.
- **Optional Keep-Alive:** Sends harmless, non-character activity signals designed to reduce inactivity-based pauses.
- **Privacy Focused:** All logic runs locally. No user data is collected or transmitted.

## Installation

### Option 1: Firefox Add-ons Store (Recommended)

The easiest way to install is through the official Mozilla Add-ons site. This version is signed and verified.

<a href="https://addons.mozilla.org/en-US/firefox/addon/playback-helper-youtube-vimeo/">
  <img src="https://img.shields.io/badge/Install_from-Firefox_Add--ons-FF7139?style=for-the-badge&logo=firefox" alt="Install from Firefox Add-ons"/>
</a>

### Option 2: Install from Source (Temporary)

Useful for development and testing. Temporary add-ons are removed when Firefox restarts.

#### Creating an XPI File

Before installing on Android or as a permanent desktop add-on, you need to package the extension:

1. Clone or download this repository

2. Create the XPI file:
 - Open the extension folder in File Explorer
 - Select all files and folders (`manifest.json`, `background.js`, `icons/`, etc.)
 - Right-click → **Send to** → **Compressed (zipped) folder**
 - Rename the resulting `.zip` file to `.xpi` (e.g., `background-playback-helper.xpi`)

> **Important:** Make sure to zip the *contents* of the folder, not the folder itself. The `manifest.json` should be at the root of the archive, not inside a subfolder.

#### Firefox Desktop (Windows)

**Temporary Installation (any Firefox version):**

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Navigate to the extension folder and select the `manifest.json` file
5. The extension is now active until Firefox restarts

**Permanent Installation (Developer Edition, Nightly, or ESR only):**

1. Create an XPI file using the steps above
2. In Firefox, navigate to `about:config`
3. Search for `xpinstall.signatures.required` and set it to `false`
4. Drag the `.xpi` file into Firefox, or go to `about:addons` → gear icon → **"Install Add-on From File..."**

> **NOTE:** Disabling signature requirements only works in Firefox Developer Edition, Nightly, or ESR, not in standard Firefox releases.

#### Firefox for Android (Nightly / Beta)

> **NOTE:** Firefox Nightly and Beta support installing signed add-ons directly from `.xpi` files. However, this method requires a Mozilla-signed version of the `.xpi` file downloaded from the Mozilla Add-ons site. To install from the source files in this repo, create an `.xpi` file and install using a Firefox fork like [Iceraven](https://github.com/fork-maintainers/iceraven-browser)

1. Download the signed `.xpi` file to your Android device

2. **Enable the Debug Menu** (first time only):
   - Open Firefox Nightly or Beta
   - Go to **Settings** → **About Firefox Nightly** (or About Firefox Beta)
   - Tap the Firefox logo **5 times** until you see "Debug menu enabled"

3. **Install the add-on**:
   - Go to **Settings** → **Advanced** → **Install add-on from file**
   - Select the `.xpi` file from your device
   - Tap **Add** when prompted


## Technical Implementation

- **Visibility API Handling:** Overrides `document.hidden` and `document.visibilityState` to prevent supported sites from treating the page as hidden during tab, app, or UI transitions. Original property descriptors are preserved so behavior can be disabled at runtime without reloading.

- **Keep-Alive Activity:** Periodically dispatches synthetic modifier key events (Shift, Ctrl, Alt) as a keep-alive signal for players that pause after long inactivity. No character input is generated and no user input is intercepted.

- **Auto-Dismiss Dialogs:** Periodically calls the site's player activity API (`updateLastActiveTime`, when available) and dismisses inactivity prompts such as "Continue watching?" or "Still listening?" This feature only activates on YouTube domains when a media element is present.

- **Desktop-Specific Behavior:** Stabilizes playback when video sites are loaded in secondary desktop UI contexts such as the Firefox sidebar, addons like [Firefox Second Sidebar](https://github.com/aminought/firefox-second-sidebar), and DevTools responsive views, where visibility APIs behave similarly to mobile.

## Permissions and Scope

| Permission | Purpose |
|------------|---------|
| `storage` | Save user preferences locally |
| `tabs` | Detect when supported sites are active for badge updates |

**This extension does NOT:**

- Collect, transmit, or store any user data
- Bypass DRM, subscription restrictions, or platform-enforced limits
- Load external resources or make network requests
- Read or intercept user input

## Troubleshooting

YouTube frequently changes its code, which can occasionally affect the extension. If you encounter issues, try the following debugging steps:

**Desktop (Firefox):**

1. Click the lock/site info icon in the address bar
2. Clear all site data for YouTube/YouTube Music (cookies, cache, storage)
3. Verify extension options are configured as desired
4. Reload the page and sign in again

**Android (Firefox for Android):**

1. Tap the shield icon in the address bar
2. Clear cookies and site data for YouTube/YouTube Music
3. Verify extension options are configured as desired
4. Reload the page and sign in again

### Still Having Issues?

If the steps above don't work, please don't rush to leave a negative review! 
Instead:

1. Check if YouTube recently pushed changes (this often affects multiple extensions)
2. Try disabling and re-enabling the extension
3. Contact us via the support email link on the [Mozilla Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/playback-helper-youtube-vimeo/)


## License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

Portions of this project are inspired by or based on concepts from:

- [Background-Video-Fix](https://github.com/nicechristoph/nicechristoph.github.io) by DarthIF
- [video-bg-play](https://github.com/nicechristoph/nicechristoph.github.io) by Mozilla
