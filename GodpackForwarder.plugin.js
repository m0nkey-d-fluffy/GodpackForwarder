/**
 * @name GodpackForwarder
 * @author m0nkey.d.fluffy
 * @description Listens for @everyone pings from Dreama and forwards them to a configurable channel.
 * @version 1.0.3
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
        DREAMA_SERVER_ID: "1334603881652555896", // Server ID where Dreama operates.
    };

    // --- Internal State ---
    let _dispatcher = null;
    let _sendMessage = null;
    let _channelStore = null;
    let _messageActions = null;
    let _modulesLoaded = false;

    // --- SETTINGS MANAGEMENT (via config.json) ---
    const configPath = path.join(BdApi.Plugins.folder, "GodpackForwarder.config.json");
    const defaultSettings = {
        forwardChannelId: "", // User-configured Channel ID to forward messages to.
        lastForwardedTimestamp: 0, // Timestamp of the last forwarded message.
        catchUpOnStart: true, // Whether to check for missed messages on startup.
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
     * Forwards the specified message with extracted embed content to the configured channel.
     * @param {string} messageContent The formatted message content to forward.
     */
    const forwardMessage = (messageContent) => {
        if (!_sendMessage || !currentSettings.forwardChannelId) {
            log("Cannot forward message: Send Message module unavailable or forwardChannelId not set.", "warn");
            return;
        }

        try {
            // Use the simple, stable message object
            const messageData = {
                content: messageContent,
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

    /**
     * Extracts text from a ping message and forwards it.
     * @param {object} message The message object from the dispatcher.
     */
    const parseAndForwardPing = (message) => {
        log(`Godpack ping detected in channel ${message.channel_id}! Parsing and forwarding...`, "info");

        // Server blacklist check
        if (_channelStore) {
            const sourceChannel = _channelStore.getChannel(message.channel_id);
            const forwardChannel = _channelStore.getChannel(currentSettings.forwardChannelId);

            if (sourceChannel && forwardChannel && sourceChannel.guild_id && forwardChannel.guild_id) {
                if (sourceChannel.guild_id === forwardChannel.guild_id) {
                    log(`Skipping forward: Forward channel is in the same server (${sourceChannel.guild_id}) as the source message.`, "warn");
                    return;
                }
            }
        }

        // Build an array of lines and join with \n to prevent double-spacing.
        const lines = [];

        // Build the header
        lines.push(`🔔 **Godpack Ping Detected!** 🔔`);
        lines.push(`**From Channel:** <#${message.channel_id}>`);
        lines.push(`--------------------`);

        // Add the original @everyone text
        if (message.content) {
            lines.push(message.content);
        }

        // Extract text from the embed
        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0]; // Get the first embed

            if (embed.title) {
                lines.push(`**${embed.title}**`);
            }
            if (embed.description) {
                // The description already contains newlines, so just add it directly.
                lines.push(embed.description);
            }
            if (embed.fields && embed.fields.length > 0) {
                for (const field of embed.fields) {
                    lines.push(`**${field.name}**`);
                    lines.push(field.value);
                }
            }
            if (embed.image && embed.image.url) {
                // Add a blank line for spacing before the image link
                lines.push(``);
                lines.push(embed.image.url);
            }
        }

        // Forward the newly constructed text string, joined by single newlines
        forwardMessage(lines.join("\n"));

        // Update last forwarded timestamp
        const messageTimestamp = new Date(message.timestamp).getTime();
        if (messageTimestamp > currentSettings.lastForwardedTimestamp) {
            currentSettings.lastForwardedTimestamp = messageTimestamp;
            saveConfig();
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

            // If @everyone was found anywhere, parse and forward
            if (hasEveryone) {
                parseAndForwardPing(message);
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
     * Finds Discord's Message Actions module for fetching message history.
     */
    const loadMessageActions = async () => {
        try {
            log("Attempting to find Message Actions module...");
            const mod = await BdApi.Webpack.waitForModule(BdApi.Webpack.Filters.byProps("fetchMessages", "sendMessage"));

            _messageActions = mod;
            if (!_messageActions) throw new Error("Could not find Message Actions module.");

            log(`SUCCESS: Found Message Actions module.`, "info");

        } catch (error) {
            log(`Failed to load Message Actions module: ${error.message}`, "error");
            _messageActions = null;
        }
    };

    /**
     * Checks if a message contains @everyone from Dreama.
     * @param {object} message The message object.
     * @returns {boolean} True if message matches criteria.
     */
    const isDreamaEveryonePing = (message) => {
        if (!message || message.author?.id !== CONFIG.BOT_USER_ID) return false;

        // Check text content
        if (message.content && typeof message.content === 'string' && message.content.includes("@everyone")) {
            return true;
        }

        // Check embed content
        if (message.embeds && message.embeds.length > 0) {
            for (const embed of message.embeds) {
                if (embed.description && embed.description.includes("@everyone")) {
                    return true;
                }
                if (embed.fields) {
                    for (const field of embed.fields) {
                        if ((field.name && field.name.includes("@everyone")) ||
                            (field.value && field.value.includes("@everyone"))) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

    /**
     * Checks for missed messages on startup and forwards them.
     * Automatically scans all cached channels for Dreama @everyone pings.
     */
    const checkMissedMessages = async () => {
        if (!currentSettings.catchUpOnStart) {
            log("Catch-up on start is disabled. Skipping missed message check.", "info");
            return;
        }

        if (!currentSettings.forwardChannelId) {
            log("Forward channel not configured. Skipping missed message check.", "warn");
            return;
        }

        log(`Scanning Dreama server (${CONFIG.DREAMA_SERVER_ID}) for missed @everyone pings...`, "info");

        const missedMessages = [];

        try {
            // Get the Message Store module
            const MessageStore = BdApi.Webpack.getModule(BdApi.Webpack.Filters.byProps("getMessages", "getMessage"));
            if (!MessageStore) {
                log("Could not find Message Store module.", "error");
                return;
            }

            // Get all channels
            const ChannelStore = BdApi.Webpack.getModule(BdApi.Webpack.Filters.byProps("getChannel", "getAllThreadsForParent"));
            if (!ChannelStore) {
                log("Could not find Channel Store module.", "error");
                return;
            }

            // Get all channels in the Dreama server
            const guildChannels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(CONFIG.DREAMA_SERVER_ID) || {});
            log(`Found ${guildChannels.length} channels in Dreama server.`, "info");

            // Also get active threads
            let allThreads = [];
            try {
                const ActiveThreadsStore = BdApi.Webpack.getModule(BdApi.Webpack.Filters.byProps("getActiveJoinedThreadsForGuild"));
                if (ActiveThreadsStore) {
                    const activeThreads = ActiveThreadsStore.getActiveJoinedThreadsForGuild(CONFIG.DREAMA_SERVER_ID);
                    log(`ActiveThreads raw structure: ${JSON.stringify(activeThreads, null, 2)}`, "info");
                    if (activeThreads) {
                        // The structure is { parentChannelId: { threadId: { channel: {...}, joinTimestamp: ... } } }
                        // We need to extract the channel objects from the nested structure
                        for (const parentChannelId of Object.keys(activeThreads)) {
                            const threadsInParent = activeThreads[parentChannelId];
                            log(`Parent channel ${parentChannelId} has threads: ${JSON.stringify(Object.keys(threadsInParent))}`, "info");
                            for (const threadId of Object.keys(threadsInParent)) {
                                const threadData = threadsInParent[threadId];
                                // The actual channel object is in threadData.channel
                                if (threadData && threadData.channel && threadData.channel.id) {
                                    log(`Thread ${threadId}: found channel object with name "${threadData.channel.name}", type ${threadData.channel.type}`, "info");
                                    allThreads.push(threadData.channel);
                                } else {
                                    log(`Thread ${threadId}: unexpected structure - ${JSON.stringify(Object.keys(threadData || {}))}`, "warn");
                                }
                            }
                        }
                        log(`Found ${allThreads.length} active threads in Dreama server.`, "info");
                    }
                }
            } catch (e) {
                log(`Could not get active threads: ${e.message}`, "warn");
            }

            // Focus on threads since that's where Dreama posts
            // Thread types: 10: ANNOUNCEMENT_THREAD, 11: PUBLIC_THREAD, 12: PRIVATE_THREAD
            const threadTypes = [10, 11, 12];
            let threadsScanned = 0;
            let threadsWithMessages = 0;

            log(`Processing ${allThreads.length} thread(s)...`, "info");

            for (const thread of allThreads) {
                if (!thread || !thread.id) {
                    log(`Skipping invalid thread object`, "warn");
                    continue;
                }

                log(`Checking thread ${thread.id} (${thread.name || 'unnamed'}, type ${thread.type})...`, "info");
                threadsScanned++;

                // First try to get cached messages
                let channelMessages = MessageStore.getMessages(thread.id);
                let messagesArray = [];

                if (channelMessages) {
                    if (channelMessages._array) {
                        messagesArray = channelMessages._array;
                    } else if (channelMessages.toArray) {
                        messagesArray = channelMessages.toArray();
                    } else if (Array.isArray(channelMessages)) {
                        messagesArray = channelMessages;
                    }
                }

                // If no cached messages, try to fetch them via Discord API directly
                if (messagesArray.length === 0) {
                    log(`No cached messages for thread ${thread.id}, fetching via API...`, "info");
                    try {
                        // Get the REST API module
                        const APIModule = BdApi.Webpack.getModule(BdApi.Webpack.Filters.byProps("getAPIBaseURL"));
                        const token = BdApi.Webpack.getModule(m => m.default && m.default.getToken)?.default?.getToken?.()
                            || BdApi.Webpack.getModule(m => m.getToken)?.getToken?.();

                        if (token) {
                            const response = await fetch(`https://discord.com/api/v9/channels/${thread.id}/messages?limit=50`, {
                                headers: {
                                    "Authorization": token,
                                    "Content-Type": "application/json"
                                }
                            });

                            if (response.ok) {
                                const messages = await response.json();
                                log(`API fetch returned ${messages.length} messages for thread ${thread.id}`, "info");
                                messagesArray = messages;
                            } else {
                                log(`API fetch failed with status ${response.status}: ${response.statusText}`, "warn");
                            }
                        } else {
                            log(`Could not get auth token for API fetch`, "warn");
                        }
                    } catch (fetchError) {
                        log(`Failed to fetch messages for thread ${thread.id}: ${fetchError.message}`, "warn");
                    }
                }

                if (messagesArray.length === 0) {
                    log(`Thread ${thread.id} still has no messages after fetch attempt.`, "info");
                    continue;
                }

                threadsWithMessages++;
                log(`Thread ${thread.id} has ${messagesArray.length} messages to scan.`, "info");

                // Filter messages from Dreama with @everyone that are newer than last forwarded
                for (const msg of messagesArray) {
                    const msgTimestamp = new Date(msg.timestamp).getTime();

                    // Log each message from Dreama for debugging
                    if (msg.author?.id === CONFIG.BOT_USER_ID) {
                        const embedDesc = msg.embeds?.[0]?.description || "(no embed)";
                        const hasEveryoneInContent = msg.content?.includes("@everyone") || false;
                        const hasEveryoneInEmbed = embedDesc.includes("@everyone");
                        log(`Found Dreama message: ${msg.id}, timestamp: ${msgTimestamp}, lastForwarded: ${currentSettings.lastForwardedTimestamp}`, "info");
                        log(`  -> content @everyone: ${hasEveryoneInContent}, embed @everyone: ${hasEveryoneInEmbed}`, "info");
                        log(`  -> embed preview: ${embedDesc.substring(0, 100)}...`, "info");
                    }

                    if (msgTimestamp > currentSettings.lastForwardedTimestamp && isDreamaEveryonePing(msg)) {
                        missedMessages.push({
                            message: msg,
                            timestamp: msgTimestamp,
                            channelId: thread.id
                        });
                        log(`Found missed message in thread ${thread.id} from ${new Date(msg.timestamp).toLocaleString()}`, "info");
                    }
                }
            }

            log(`Scanned ${threadsScanned} thread(s), ${threadsWithMessages} had messages.`, "info");

        } catch (error) {
            log(`Error scanning channels: ${error.message}`, "error");
            return;
        }

        if (missedMessages.length === 0) {
            log("No missed messages found.", "info");
            return;
        }

        // Sort by timestamp (oldest first)
        missedMessages.sort((a, b) => a.timestamp - b.timestamp);

        log(`Found ${missedMessages.length} missed message(s). Forwarding in chronological order...`, "info");
        showToast(`GodpackForwarder: Forwarding ${missedMessages.length} missed message(s)...`, "info");

        // Forward each message with a small delay to avoid rate limiting
        for (let i = 0; i < missedMessages.length; i++) {
            const { message } = missedMessages[i];

            log(`Forwarding missed message ${i + 1}/${missedMessages.length} from ${new Date(message.timestamp).toLocaleString()}`, "info");

            parseAndForwardPing(message);

            // Small delay between messages to avoid rate limiting
            if (i < missedMessages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        log(`Finished forwarding ${missedMessages.length} missed message(s).`, "info");
        showToast(`GodpackForwarder: Forwarded ${missedMessages.length} missed message(s)!`, "success");
    };

    /**
     * Orchestrates loading all modules.
     * @returns {Promise<boolean>} True if modules loaded.
     */
    const loadModules = async () => {
        await loadDispatcherPatch();
        await loadSendMessageModule();
        await loadChannelStore();
        await loadMessageActions();

        // Check if critical modules were loaded (messageActions is optional)
        return _dispatcher && _sendMessage && _channelStore;
    };


    // --- Plugin API Methods ---

    return {
        start: () => {
            // Set plugin name for logging
            meta.name = "GodpackForwarder";
            loadConfig(); // Load configuration from file
            log(`Plugin started (v${meta.version}) - Thread-based catch-up build.`, "info");

            // Log configuration status
            if (!currentSettings.forwardChannelId) {
                log("forwardChannelId is not set. Notifications will be disabled.", "warn");
            } else {
                log(`Godpack pings will be forwarded to channel: ${currentSettings.forwardChannelId}`, "info");
            }

            // Load required modules
            loadModules().then(async (success) => {
                if (!success) {
                    log("Critical modules failed to load. Plugin will not function.", "error");
                    showToast("GodpackForwarder: Critical modules failed. Notifications disabled.", "error");
                    return;
                }

                _modulesLoaded = true;
                log("Modules loaded. Listening for Godpack pings...", "info");

                // Check for missed messages on startup
                await checkMissedMessages();
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
            _messageActions = null;
            _modulesLoaded = false;
            log("Plugin stopped. Listeners removed.", "info");
            showToast("GodpackForwarder stopped.", "info");
        },

        getSettingsPanel: () => {
            const panel = document.createElement("div");
            panel.style.padding = "20px";
            panel.style.color = "var(--text-normal)";

            // Add a style element to force input styling
            const style = document.createElement("style");
            style.textContent = `
                .godpack-input {
                    color: var(--text-normal) !important;
                    -webkit-text-fill-color: var(--text-normal) !important;
                    opacity: 1 !important;
                }
                .godpack-input::placeholder {
                    color: var(--text-muted) !important;
                    opacity: 0.6 !important;
                }
            `;
            document.head.appendChild(style);

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
            channelLabel.style.color = "var(--header-primary)";
            channelGroup.appendChild(channelLabel);

            const channelInput = document.createElement("input");
            channelInput.type = "text";
            channelInput.className = "godpack-input";
            channelInput.value = currentSettings.forwardChannelId || "";
            channelInput.placeholder = "Enter Discord Channel ID";
            channelInput.style.cssText = `
                width: 100%;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid var(--background-tertiary);
                background-color: var(--background-secondary);
                font-family: inherit;
                font-size: 14px;
            `;

            // Handle focus state
            channelInput.addEventListener("focus", () => {
                channelInput.style.borderColor = "var(--brand-experiment)";
            });
            channelInput.addEventListener("blur", () => {
                channelInput.style.borderColor = "var(--background-tertiary)";
            });

            channelGroup.appendChild(channelInput);

            const channelHelp = document.createElement("p");
            channelHelp.textContent = "The channel ID where godpack pings will be forwarded. Right-click a channel and select 'Copy ID' to get the channel ID.";
            channelHelp.style.marginTop = "5px";
            channelHelp.style.fontSize = "12px";
            channelHelp.style.color = "var(--text-muted)";
            channelGroup.appendChild(channelHelp);

            panel.appendChild(channelGroup);

            // Catch-up Toggle
            const catchUpGroup = document.createElement("div");
            catchUpGroup.style.marginBottom = "20px";
            catchUpGroup.style.display = "flex";
            catchUpGroup.style.alignItems = "center";
            catchUpGroup.style.gap = "10px";

            const catchUpCheckbox = document.createElement("input");
            catchUpCheckbox.type = "checkbox";
            catchUpCheckbox.id = "godpack-catchup";
            catchUpCheckbox.checked = currentSettings.catchUpOnStart !== false;
            catchUpCheckbox.style.width = "18px";
            catchUpCheckbox.style.height = "18px";
            catchUpCheckbox.style.cursor = "pointer";

            const catchUpLabel = document.createElement("label");
            catchUpLabel.htmlFor = "godpack-catchup";
            catchUpLabel.textContent = "Catch up on missed messages at startup";
            catchUpLabel.style.color = "var(--text-normal)";
            catchUpLabel.style.cursor = "pointer";

            catchUpGroup.appendChild(catchUpCheckbox);
            catchUpGroup.appendChild(catchUpLabel);

            panel.appendChild(catchUpGroup);

            // Info Box
            const infoBox = document.createElement("div");
            infoBox.style.cssText = `
                padding: 12px;
                background-color: var(--background-secondary);
                border-radius: 4px;
                margin-bottom: 20px;
                color: var(--text-normal);
                font-size: 13px;
                line-height: 1.6;
            `;
            infoBox.innerHTML = `
                <strong style="color: var(--text-normal);">📌 Important:</strong><br>
                <span style="color: var(--text-normal);">• The forward channel must be in a different server than where Dreama runs.</span><br>
                <span style="color: var(--text-normal);">• Catch-up scans all channels in the Dreama server for missed @everyone pings.</span><br>
                <span style="color: var(--text-normal);">• Channels must be recently viewed in Discord for catch-up to find messages.</span>
            `;
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
                const catchUpEnabled = catchUpCheckbox.checked;

                currentSettings.forwardChannelId = newChannelId;
                currentSettings.catchUpOnStart = catchUpEnabled;
                saveConfig();

                showToast("GodpackForwarder settings saved!", "success");
                log(`Settings saved: forwardChannelId = ${newChannelId}, catchUpOnStart = ${catchUpEnabled}`, "info");
            });

            panel.appendChild(saveButton);

            return panel;
        }
    };
}

/*@end@*/
