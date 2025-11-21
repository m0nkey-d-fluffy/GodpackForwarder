# GodpackForwarder Plugin

**Author:** m0nkey.d.fluffy **Version:** 1.0.2

## Description

GodpackForwarder is a utility plugin for BetterDiscord. It actively listens for all new messages and specifically targets those from the bot **Dreama**.

If a message from this bot contains an `@everyone` ping (either in the text or within an embed), the plugin will instantly forward the complete message with its full rich embeds to a private channel of your choice.

This allows you to receive Godpack notifications in a dedicated channel without having to mute or manage pings in the main server. The plugin automatically prevents forwarding when the forward channel is in the same server as the bot.

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

    -   Enter your **Forward Channel ID** in the text field.

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
        "forwardChannelId": ""
    }
    ```

4.  Paste your copied Channel ID into the `forwardChannelId` field:

    **Example Config:**

    ```
    {
        "forwardChannelId": "1234567890123456789"
    }
    ```

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

4.  **Module Loading:** The plugin calls `loadModules()` to find Discord's internal `Dispatcher` (for listening), `sendMessage` (for sending), and `ChannelStore` (for server checking).

### 2. Live Operation (Listening for Pings)

1.  **Event Listening:** The plugin's patch on the `Dispatcher` silently intercepts _all_ new messages (`MESSAGE_CREATE` events) across Discord.

2.  **Filtering (Bot ID):** The `onMessageReceived` function immediately discards any message _not_ sent by the target bot (Dreama, ID `1334630845574676520`).

3.  **Filtering (Ping):** If the message _is_ from the bot, the plugin scans its `content` field and all `embeds` (titles, descriptions, fields) for the string `"@everyone"`.

4.  **Server Blacklist Check:** If an `@everyone` ping is found, the plugin checks if the forward channel is in the same server as the source message.

    -   **If same server:** The message is blocked and a warning is logged to prevent circular forwarding.

    -   **If different server:** The forwarding proceeds.

5.  **Forwarding with Full Embeds:** If all checks pass:

    -   The plugin logs (purple) "Godpack ping detected! Forwarding with full embeds..." to your console.

    -   It calls `forwardMessage()` which sends the message with its complete Discord embeds intact, preserving all formatting, images, fields, and styling.

    -   A header is added indicating the source channel.
