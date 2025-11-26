# GodpackForwarder - Beginner's Guide

> **A simple, step-by-step guide for getting started with GodpackForwarder on BetterDiscord**

---

## What is GodpackForwarder?

GodpackForwarder is a BetterDiscord plugin that automatically forwards Godpack notifications (from the Dreama bot) to a private channel of your choice. This way, you can get notified about important Godpack events without being spammed in the main server!

---

## 📋 Table of Contents

1. [Installing BetterDiscord](#1-installing-betterdiscord)
2. [Installing the Plugin](#2-installing-the-plugin)
3. [Configuring the Plugin](#3-configuring-the-plugin)
4. [Getting Your Channel ID](#4-getting-your-channel-id)
5. [Testing It Out](#5-testing-it-out)
6. [Troubleshooting](#troubleshooting)

---

## 1. Installing BetterDiscord

### What is BetterDiscord?

BetterDiscord is a modification for Discord that allows you to install custom themes and plugins to enhance your Discord experience.

### Compatibility

- **✅ Works on:** Windows, macOS, Linux
- **✅ Discord versions:** Stable, PTB, Canary
- **⚠️ Important:** BetterDiscord is a third-party modification and is **not officially supported by Discord**. Use at your own discretion.

### Installation Steps

1. **Download BetterDiscord** from the official website: https://betterdiscord.app/

2. **Run the installer** and follow the on-screen instructions.

3. **Select which Discord version** you want to install BetterDiscord on (Stable, PTB, or Canary).

4. **Restart Discord** after installation completes.

5. **Verify installation** by opening Discord Settings. You should see new sections called "BetterDiscord" at the bottom of your settings menu.

---

## 2. Installing the Plugin

### Download the Plugin

1. Download the `GodpackForwarder.plugin.js` file.

2. **Don't open or run the file!** Just download it to a location you can find easily (like your Downloads folder).

### Install the Plugin

1. **Open Discord** and go to **User Settings** (click the gear icon ⚙️ at the bottom left).

2. Scroll down to the **BetterDiscord** section and click **Plugins**.

3. Click the **Open Plugins Folder** button at the top of the page.

4. **Drag and drop or Copy and Paste** the `GodpackForwarder.plugin.js` file into this folder.

5. Return to Discord. If you don't see the plugin appear in the list, press **Ctrl+R** (Windows/Linux) or **Cmd+R** (Mac) to reload Discord.

6. **Enable the plugin** by clicking the toggle switch next to "GodpackForwarder".

---

## 3. Configuring the Plugin

### Opening the Settings Panel

1. In the **Plugins** page, find **GodpackForwarder** in your plugin list.

2. Click the **gear icon (⚙️)** next to the plugin name to open the settings panel.

### Settings Explained

The settings panel has two main options:

#### **Forward Channel ID**
This is where you tell the plugin which channel to send notifications to. You'll need to get your own channel ID (see next section).

- **Type:** Text field
- **Required:** Yes (the plugin won't work without this)
- **Format:** A long number (e.g., `1234567890123456789`)

#### **Catch up on missed messages at startup**
When enabled, the plugin will scan for any Godpack pings you missed while you were offline or had the plugin disabled.

- **Type:** Checkbox (toggle on/off)
- **Default:** Enabled (checked)
- **What it does:** Automatically forwards any missed notifications when you start Discord

---

## 4. Getting Your Channel ID

### Why You Need Your Own Channel

**Important:** The forward channel **must be in a different server** than where the Dreama bot operates. This prevents the plugin from creating an infinite loop of forwarding messages!

**Best practice:** Create a private channel in a server you own or control. This could be:
- A personal server (just for you)
- A private channel in a friend's server
- A DM with yourself (yes, this works!)

### Enabling Developer Mode

Before you can copy channel IDs, you need to enable Developer Mode in Discord:

1. Open **User Settings** (gear icon ⚙️).

2. Go to **Advanced** (in the left sidebar, under "App Settings").

3. Toggle on **Developer Mode**.

### Copying the Channel ID

1. **Navigate to the channel** where you want to receive notifications.

   - This should be in a **different server** than where Dreama operates!
   - We recommend a private channel in your own server.

2. **Right-click on the channel name** in the sidebar.

3. Click **Copy Channel ID** (it should be near the bottom of the menu).

4. The channel ID is now copied to your clipboard! It will be a long number like: `1234567890123456789`

### Pasting Your Channel ID

1. Go back to the **GodpackForwarder settings panel** (Plugins → ⚙️ next to GodpackForwarder).

2. **Paste the channel ID** into the "Forward Channel ID" field.

3. Make sure the **"Catch up on missed messages at startup"** checkbox is checked if you want this feature.

4. Click **Save Settings**.

5. You should see a success message: "GodpackForwarder settings saved!"

---

## 5. Testing It Out

### What Happens Now?

Once configured, the plugin will:

1. **Listen for @everyone pings** from the Dreama bot
2. **Extract the message content** (including text and images)
3. **Forward it to your configured channel** instantly

### How to Test

You can't easily trigger a test ping yourself, but you can verify the plugin is working by:

1. **Check the Console** (if you're comfortable with this):
   - Press **Ctrl+Shift+I** (Windows/Linux) or **Cmd+Option+I** (Mac) to open Developer Tools
   - Go to the **Console** tab
   - Look for purple messages from `[GodpackForwarder]` indicating the plugin is running

2. **Wait for a real ping**: The next time Dreama sends an @everyone ping, it will be forwarded to your channel!

### What the Forwarded Message Looks Like

When a ping is forwarded, you'll see a message like this in your configured channel:

```
🔔 **Godpack Ping Detected!** 🔔
**From Channel:** #godpack-announcements
--------------------
@everyone New Godpack available!

**Godpack Title**
Godpack description here...

[Image URL if present]
```
---

## Troubleshooting

### The plugin isn't forwarding messages

**Check these things:**

1. ✅ Is the plugin **enabled** in the Plugins list?
2. ✅ Did you enter a valid **Forward Channel ID**?
3. ✅ Is the forward channel in a **different server** than where Dreama operates?
4. ✅ Does the bot (your account) have **permission to send messages** in the forward channel?
5. ✅ Try **reloading Discord** (Ctrl+R or Cmd+R)

### I can't find the "Copy Channel ID" option

Make sure you've enabled **Developer Mode** in Discord settings:
- Settings → Advanced → Developer Mode (toggle on)

### The plugin disappeared after restarting Discord

This might mean:
- The plugin file wasn't in the correct folder
- BetterDiscord failed to load
- Discord updated and uninstalled BetterDiscord
- Try **reinstalling the plugin** by following the installation steps again

### I'm getting error messages in the console

- Check that you're using the **latest version** of the plugin
- Try **disabling and re-enabling** the plugin
- If problems persist, report the issue on the [GitHub Issues page](https://github.com/m0nkey-d-fluffy/GodpackForwarder/issues)

### Can I use a DM channel as the forward channel?

No, Discord doesn't allow bots (including plugins) to send messages to DM channels programmatically. You must use a server channel.

However, you can:
- Create your own private server (just for you)
- Create a private channel in that server
- Use that channel as your forward destination

---

## 🎉 You're All Set!

Congratulations! You've successfully installed and configured GodpackForwarder. You'll now receive Godpack notifications in your private channel without the noise of the main server.

### Need More Help?

- **GitHub Repository:** https://github.com/m0nkey-d-fluffy/GodpackForwarder
- **Report Issues:** https://github.com/m0nkey-d-fluffy/GodpackForwarder/issues
- **Read the Full README:** [README.md](README.md) (for advanced users)

---

**Happy Godpacking! 🎮**
