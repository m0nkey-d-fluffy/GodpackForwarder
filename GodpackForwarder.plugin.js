/**
 * @name GodpackForwarder
 * @author m0nkey.d.fluffy
 * @description Listens for @everyone pings from Dreama and forwards them to a configurable channel.
 * @version 1.0.2
 * @source https://github.com/m0nkey-d-fluffy/GodpackForwarder
 */

/*@cc_on
@if (@_jscript)
    // Boilerplate for self-installation
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!) \n\nI'm a plugin for BetterDiscord, you need to \nput me in your plugins folder: \n" + pathPlugins + "\n\nPress OK to copy myself to that folder.", 0, "I'm a Plugin!", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetParentFolderName(pathPlugins)) {
        shell.Popup("I'm already in your plugins folder... \nJust reload Discord instead.", 0, "I'm already there!", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's installed?", 0, "Can't Find Folder", 0x10);
    } else if (fs.FileExists(pathPlugins + "\\GodpackForwarder.plugin.js")) {
        shell.Popup("I'm already there. I'll add a .1 to my name, but you should remove the duplicate.", 0, "I'm already there!", 0x40);
        fs.CopyFile(pathSelf, pathPlugins + "\\GodpackForwarder.plugin.js.1");
    } else {
        fs.CopyFile(pathSelf, pathPlugins + "\\GodpackForwarder.plugin.js");
        shell.Run("explorer.exe /select," + pathPlugins + "\\GodpackForwarder.plugin.js");
    }
@else@*/

function GodpackForwarder(meta) {

    // --- NODE.JS MODULES ---
    const fs = require("fs");
    const path = require("path");

    // --- CONFIGURATION ---
    const CONFIG = {
        BOT_USER_ID: "1334630845574676520", // User ID of the Dreama bot to monitor.
    };

    // --- Internal State ---
    let _dispatcher = null;
    let _sendMessage = null;
    let _channelStore = null;
    let _modulesLoaded = false;

    // --- SETTINGS MANAGEMENT (via config.json) ---
    const configPath = path.join(BdApi.Plugins.folder, "GodpackForwarder.config.json");
    const defaultSettings = {
        forwardChannelId: "", // User-configured Channel ID to forward messages to.
    };
    let currentSettings = { ...defaultSettings };

    const loadConfig = () => {
        if (!fs.existsSync(configPath)) {
            log(`Config file not found, creating one at: ${configPath}`, "warn");
            try {
                fs.writeFileSync(configPath, JSON.stringify(defaultSettings, null, 4));
            } catch (e) {
                log(`Failed to create config file: ${e.message}`, "error");
            }
            currentSettings = { ...defaultSettings };
        } else {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
                currentSettings = { ...defaultSettings, ...configData };
                log("Config file loaded successfully.", "info");
            } catch (e) {
                log(`Failed to read or parse config file: ${e.message}`, "error");
                currentSettings = { ...defaultSettings };
            }
        }
    };

    const saveConfig = () => {
        try {
            fs.writeFileSync(configPath, JSON.stringify(currentSettings, null, 4));
            log("Config file saved successfully.", "info");
        } catch (e) {
            log(`Failed to save config file: ${e.message}`, "error");
        }
    };


    // --- UTILITIES ---

    /** A helper to safely log messages with custom styling. */
    const log = (message, type = "info") => {
        try {
            const method = console[type] && typeof console[type] === 'function' ? console[type] : console.log;
            
            // Set a unique log color.
            const color = "#8A2BE2"; // BlueViolet

            if (type === 'info' || type === 'warn' || type === 'error' || type ==='fatal') {
                method(`%c[${meta.name}]%c ${message}`, `color: ${color}; font-weight: bold;`, "color: unset; font-weight: unset;");
            } else {
                 method(`[${meta.name}] ${message}`);
            }
        } catch (e) {
            console.log(`[${meta.name} | Fallback Log] ${message}`);
        }
    };

    /** A helper to show a toast notification. */
    const showToast = (message, type = "info") => {
        if (window.BdApi && BdApi.showToast) BdApi.showToast(message, { type });
        else log(`TOAST: ${message}`, type);
    };

    /**
     * Forwards the specified message with embeds to the configured channel.
     * @param {object} originalMessage The original message object from Discord.
     * @param {string} sourceChannelId The channel ID where the message originated.
     */
    const forwardMessage = (originalMessage, sourceChannelId) => {
        if (!_sendMessage || !currentSettings.forwardChannelId) {
            log("Cannot forward message: Send Message module unavailable or forwardChannelId not set.", "warn");
            return;
        }

        if (!_channelStore) {
            log("Cannot forward message: Channel Store module unavailable.", "warn");
            return;
        }

        try {
            // Blacklist check: Don't forward if the forward channel is in the same server as the source
            const sourceChannel = _channelStore.getChannel(sourceChannelId);
            const forwardChannel = _channelStore.getChannel(currentSettings.forwardChannelId);

            if (sourceChannel && forwardChannel && sourceChannel.guild_id && forwardChannel.guild_id) {
                if (sourceChannel.guild_id === forwardChannel.guild_id) {
                    log(`Skipping forward: Forward channel is in the same server (${sourceChannel.guild_id}) as the source message.`, "warn");
                    return;
                }
            }

            // Build the forwarded message with the whole embed
            const messageData = {
                content: `🔔 **Godpack Ping Detected!** 🔔\n**From Channel:** <#${sourceChannelId}>\n--------------------\n${originalMessage.content || ""}`,
                embeds: originalMessage.embeds || [],
                tts: false,
                invalidEmojis: [],
                validNonShortcutEmojis: []
            };

            // Use the 4-argument call signature
            _sendMessage(currentSettings.forwardChannelId, messageData, undefined, {});
            log(`Successfully forwarded message to channel ${currentSettings.forwardChannelId}.`, "info");
        } catch (error) {
            log(`Error forwarding message: ${error.message}`, "error");
            console.error("Full error object during forwardMessage:", error);
        }
    };


    // --- MESSAGE LISTENER LOGIC ---

    /**
     * This function is called by the Dispatcher patch on every new message.
     * @param {object} message The message object from the dispatcher.
     */
    const onMessageReceived = (message) => {
        try {
            // Filter 1: Must be from the specific bot
            if (!message || message.author?.id !== CONFIG.BOT_USER_ID) return;

            let hasEveryone = false;

            // Filter 2: Check text content
            if (message.content && typeof message.content === 'string' && message.content.includes("@everyone")) {
                hasEveryone = true;
            }

            // Filter 3: Check embed content
            if (!hasEveryone && message.embeds && message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    if (embed.description && embed.description.includes("@everyone")) {
                        hasEveryone = true;
                        break;
                    }
                    if (embed.fields) {
                        for (const field of embed.fields) {
                            if (field.name && field.name.includes("@everyone")) {
                                hasEveryone = true;
                                break;
                            }
                            if (field.value && field.value.includes("@everyone")) {
                                hasEveryone = true;
                                break;
                            }
                        }
                    }
                    if (hasEveryone) break;
                }
            }

            // If @everyone was found anywhere, forward the whole message with embeds
            if (hasEveryone) {
                log(`Godpack ping detected in channel ${message.channel_id}! Forwarding with full embeds...`, "info");
                forwardMessage(message, message.channel_id);
            }
        } catch (e) {
            log(`Error in onMessageReceived: ${e.message}`, "error");
        }
    };
    
    /**
     * Finds and patches the Discord Event Dispatcher.
     */
    const loadDispatcherPatch = async () => { 
        try {
            log("Attempting to find Discord Event Dispatcher module...");
            
            let dispatchModule = null;
            
            // Webpack Search
            let mod = BdApi.Webpack.getModule(m => m.dispatch && m._events, { searchExports: true });
            if (!mod) mod = BdApi.Webpack.getModule(BdApi.Webpack.Filters.byProps("subscribe", "unsubscribe", "dispatch"));
            dispatchModule = mod.dispatch ? mod : (mod.default ? mod.default : mod);

            if (!dispatchModule || typeof dispatchModule.dispatch !== 'function') {
                throw new Error("Could not locate a usable Dispatcher module.");
            }
            
            _dispatcher = dispatchModule;
            
            // Patch the core dispatch function to intercept MESSAGE_CREATE events
            BdApi.Patcher.after(meta.name, _dispatcher, "dispatch", (_, args) => {
                const event = args[0]; // The first argument is the event object

                // Listen only for new messages
                if (event.type === 'MESSAGE_CREATE') {
                    onMessageReceived(event.message);
                }
            });
            
            log(`SUCCESS: Patched Discord Dispatcher to listen for MESSAGE_CREATE events.`, "info");
            
        } catch (error) {
            log(`Failed to patch Event Dispatcher: ${error.message}`, "error");
        }
    };
    
    /**
     * Finds Discord's simple internal sendMessage function.
     */
    const loadSendMessageModule = async () => {
        try {
            log("Attempting to find Send Message module (legacy)...");
            // Use a simple, stable filter
            const mod = await BdApi.Webpack.waitForModule(BdApi.Webpack.Filters.byProps("sendMessage", "receiveMessage"));

            _sendMessage = mod.sendMessage;
            if (!_sendMessage) throw new Error("Could not find sendMessage function.");

            log(`SUCCESS: Found simple Send Message module.`, "info");

        } catch (error) {
            log(`Failed to load Send Message module: ${error.message}`, "error");
            _sendMessage = null;
        }
    };

    /**
     * Finds Discord's Channel Store module.
     */
    const loadChannelStore = async () => {
        try {
            log("Attempting to find Channel Store module...");
            const mod = await BdApi.Webpack.waitForModule(BdApi.Webpack.Filters.byProps("getChannel", "hasChannel"));

            _channelStore = mod;
            if (!_channelStore) throw new Error("Could not find Channel Store module.");

            log(`SUCCESS: Found Channel Store module.`, "info");

        } catch (error) {
            log(`Failed to load Channel Store module: ${error.message}`, "error");
            _channelStore = null;
        }
    };

    /**
     * Orchestrates loading all modules.
     * @returns {Promise<boolean>} True if modules loaded.
     */
    const loadModules = async () => {
        await loadDispatcherPatch();
        await loadSendMessageModule();
        await loadChannelStore();

        // Check if critical modules were loaded
        return _dispatcher && _sendMessage && _channelStore;
    };


    // --- Plugin API Methods ---

    return {
        start: () => {
            // Set plugin name for logging
            meta.name = "GodpackForwarder";
            loadConfig(); // Load configuration from file
            log(`Plugin started (v${meta.version}).`, "info");

            // Log configuration status
            if (!currentSettings.forwardChannelId) {
                log("forwardChannelId is not set. Notifications will be disabled.", "warn");
            } else {
                log(`Godpack pings will be forwarded to channel: ${currentSettings.forwardChannelId}`, "info");
            }

            // Load required modules
            loadModules().then((success) => {
                if (!success) {
                    log("Critical modules failed to load. Plugin will not function.", "error");
                    showToast("GodpackForwarder: Critical modules failed. Notifications disabled.", "error");
                    return;
                }

                _modulesLoaded = true;
                log("Modules loaded. Listening for Godpack pings...", "info");
            });
        },

        stop: () => {
            // Unpatch all methods
            if (_dispatcher) {
                 BdApi.Patcher.unpatchAll(meta.name, _dispatcher);
            }
            BdApi.Patcher.unpatchAll(meta.name);

            // Clear module references
            _dispatcher = null;
            _sendMessage = null;
            _channelStore = null;
            _modulesLoaded = false;
            log("Plugin stopped. Listeners removed.", "info");
            showToast("GodpackForwarder stopped.", "info");
        },

        getSettingsPanel: () => {
            const panel = document.createElement("div");
            panel.style.padding = "20px";
            panel.style.color = "var(--text-normal)";

            // Title
            const title = document.createElement("h2");
            title.textContent = "GodpackForwarder Settings";
            title.style.marginBottom = "20px";
            title.style.color = "var(--header-primary)";
            panel.appendChild(title);

            // Forward Channel ID Setting
            const channelGroup = document.createElement("div");
            channelGroup.style.marginBottom = "20px";

            const channelLabel = document.createElement("label");
            channelLabel.textContent = "Forward Channel ID:";
            channelLabel.style.display = "block";
            channelLabel.style.marginBottom = "8px";
            channelLabel.style.fontWeight = "bold";
            channelGroup.appendChild(channelLabel);

            const channelInput = document.createElement("input");
            channelInput.type = "text";
            channelInput.value = currentSettings.forwardChannelId || "";
            channelInput.placeholder = "Enter Discord Channel ID";
            channelInput.style.width = "100%";
            channelInput.style.padding = "8px";
            channelInput.style.borderRadius = "4px";
            channelInput.style.border = "1px solid var(--background-tertiary)";
            channelInput.style.backgroundColor = "var(--background-secondary)";
            channelInput.style.color = "var(--text-normal)";
            channelGroup.appendChild(channelInput);

            const channelHelp = document.createElement("p");
            channelHelp.textContent = "The channel ID where godpack pings will be forwarded. Right-click a channel and select 'Copy ID' to get the channel ID.";
            channelHelp.style.marginTop = "5px";
            channelHelp.style.fontSize = "12px";
            channelHelp.style.color = "var(--text-muted)";
            channelGroup.appendChild(channelHelp);

            panel.appendChild(channelGroup);

            // Info Box
            const infoBox = document.createElement("div");
            infoBox.style.padding = "12px";
            infoBox.style.backgroundColor = "var(--background-secondary)";
            infoBox.style.borderRadius = "4px";
            infoBox.style.marginBottom = "20px";
            infoBox.innerHTML = `
                <strong>📌 Important:</strong><br>
                • The forward channel must be in a different server than where the bot is running.<br>
                • Messages from servers where the forward channel is located will be blocked automatically.
            `;
            infoBox.style.fontSize = "13px";
            infoBox.style.lineHeight = "1.6";
            panel.appendChild(infoBox);

            // Save Button
            const saveButton = document.createElement("button");
            saveButton.textContent = "Save Settings";
            saveButton.style.padding = "10px 20px";
            saveButton.style.backgroundColor = "var(--brand-experiment)";
            saveButton.style.color = "white";
            saveButton.style.border = "none";
            saveButton.style.borderRadius = "4px";
            saveButton.style.cursor = "pointer";
            saveButton.style.fontWeight = "bold";
            saveButton.style.fontSize = "14px";

            saveButton.addEventListener("click", () => {
                const newChannelId = channelInput.value.trim();

                currentSettings.forwardChannelId = newChannelId;
                saveConfig();

                showToast("GodpackForwarder settings saved!", "success");
                log(`Settings saved: forwardChannelId = ${newChannelId}`, "info");
            });

            panel.appendChild(saveButton);

            return panel;
        }
    };
}

/*@end@*/
