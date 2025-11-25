# GodpackForwarder Plugin

**Author:** m0nkey.d.fluffy **Version:** 1.0.4

## Description

GodpackForwarder is a utility plugin for BetterDiscord. It actively listens for all new messages and specifically targets those from the bot **Dreama**.

If a message from this bot contains an `@everyone` ping (either in the text or within an embed), the plugin will instantly forward the message content (including extracted embed text and images) to a private channel of your choice.

This allows you to receive Godpack notifications in a dedicated channel without having to mute or manage pings in the main server. The plugin automatically prevents forwarding when the forward channel is in the same server as the bot.

**New in v1.0.3:** The plugin can now catch up on missed messages! If you were offline or had the plugin disabled, it will automatically scan the Dreama server for missed @everyone pings and forward them in chronological order.

**New in v1.0.4:** Smart thread filtering for @helper role users! If you have the @helper role, the plugin now only forwards messages from threads you're actively a member of, preventing spam from threads you're not involved in. This feature automatically detects your thread membership and applies intelligent filtering.

## Installation

1.  Download the `GodpackForwarder.plugin.js` file.
    
2.  Open your BetterDiscord plugins folder. You can find this in Discord by going to **User Settings > BetterDiscord > Plugins > Open Plugins Folder**.
    
3.  Drag the downloaded `GodpackForwarder.plugin.js` file into this folder.
    
4.  Return to Discord. If you don't see the plugin appear, press `Ctrl+R` to reload Discord.
    
5.  Find **GodpackForwarder** in your plugin list and enable it.
    

## How to Use (Configuration)

This plugin can be configured either through the BetterDiscord settings UI or by editing a config file.

### Option 1: BetterDiscord Settings UI (Recommended)

1.  Enable **GodpackForwarder** in your BetterDiscord plugins list.

2.  Click the settings/gear icon next to the plugin name.

3.  In the settings panel:

    -   Enter your **Forward Channel ID** - where notifications will be sent.

    -   Toggle **Catch up on missed messages at startup** to enable/disable the catch-up feature (automatically scans all channels).

    -   Click **Save Settings**.


### Option 2: Manual Config File

Alternatively, you can manually edit the `GodpackForwarder.config.json` file.

#### Step 1: Generate the Config File

When you enable **GodpackForwarder** for the first time, it will automatically create a file named `GodpackForwarder.config.json` in your BetterDiscord `plugins` folder.

#### Step 2: Edit the Config File

1.  Go to your `plugins` folder (the same place you put the plugin file).

2.  Open `GodpackForwarder.config.json` with any text editor (like Notepad).

3.  You will see:

    ```
    {
        "forwardChannelId": "",
        "lastForwardedTimestamp": 0,
        "catchUpOnStart": true
    }
    ```

4.  Fill in the configuration fields:

    **Example Config:**

    ```
    {
        "forwardChannelId": "1234567890123456789",
        "lastForwardedTimestamp": 0,
        "catchUpOnStart": true
    }
    ```

    - `forwardChannelId`: Where to forward notifications
    - `lastForwardedTimestamp`: Automatically updated by the plugin (tracks last forwarded message)
    - `catchUpOnStart`: Set to `true` to automatically scan all channels for missed messages on startup

### Getting Your Channel ID

1.  In Discord, turn on **Developer Mode** (User Settings > Advanced > Developer Mode).

2.  Right-click on the text channel where you want the pings to be sent (e.g., a private channel in a server you own).

3.  Click **"Copy Channel ID"**.


## Full Workflow Breakdown

This is the complete logic the plugin follows.

### 1. Plugin Start (`start` method)

1.  **Name Set:** The plugin's name is internally set to `GodpackForwarder` for logging.

2.  **Config Loaded:** The plugin immediately runs `loadConfig()`. It looks for `GodpackForwarder.config.json` in your plugins folder.

    -   **If found:** It loads your `forwardChannelId`.

    -   **If not found:** It creates a new, blank `GodpackForwarder.config.json` file for you to edit.

3.  **Logs Config Status:** It prints a (purple) message to your console telling you if the channel ID was loaded or if it's missing (disabling notifications).

4.  **Module Loading:** The plugin calls `loadModules()` to find Discord's internal `Dispatcher` (for listening), `sendMessage` (for sending), `ChannelStore` (for server checking), and `MessageStore` (for catch-up).

5.  **Catch-Up Check:** If catch-up is enabled, the plugin automatically scans all cached channels across all your servers for any missed @everyone pings from Dreama that are newer than the last forwarded message. These are forwarded in chronological order.

### 2. Live Operation (Listening for Pings)

1.  **Event Listening:** The plugin's patch on the `Dispatcher` silently intercepts _all_ new messages (`MESSAGE_CREATE` events) across Discord.

2.  **Filtering (Bot ID):** The `onMessageReceived` function immediately discards any message _not_ sent by the target bot (Dreama, ID `1334630845574676520`).

3.  **Filtering (Ping):** If the message _is_ from the bot, the plugin scans its `content` field and all `embeds` (titles, descriptions, fields) for the string `"@everyone"`.

4.  **Server Blacklist Check:** If an `@everyone` ping is found, the plugin checks if the forward channel is in the same server as the source message.

    -   **If same server:** The message is blocked and a warning is logged to prevent circular forwarding.

    -   **If different server:** The forwarding proceeds.

5.  **Thread Membership Check (v1.0.4):** For users with the @helper role, the plugin verifies you're a member of the thread being pinged.

    -   **If not a member:** The message is silently blocked to prevent spam from irrelevant threads.

    -   **If a member or not @helper:** The forwarding proceeds.

    -   Uses Discord's `ActiveThreadsStore` to intelligently detect which threads you've joined.

6.  **Forwarding:** If all checks pass:

    -   The plugin logs (purple) "Godpack ping detected! Parsing and forwarding..." to your console.

    -   It extracts text content from the message and embeds (title, description, fields, image URLs).

    -   It sends a formatted text message to your configured forward channel with a header indicating the source.

    -   The `lastForwardedTimestamp` is updated to track which messages have been forwarded.
