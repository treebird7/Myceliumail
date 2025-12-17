const { app, BrowserWindow, Menu, Tray, shell, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const os = require('os');

let mainWindow;
let tray;
let dashboardProcess;
let supabaseClient;
let realtimeChannel;
const DASHBOARD_PORT = 3737;

// Load config from ~/.myceliumail/config.json
function loadConfig() {
    const configPath = path.join(os.homedir(), '.myceliumail', 'config.json');
    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Failed to load config:', err);
    }
    return {};
}

// Setup Supabase Realtime subscription
function setupRealtimeNotifications(config) {
    if (!config.supabase_url || !config.supabase_key) {
        console.log('Supabase not configured, skipping realtime notifications');
        return;
    }

    const agentId = config.agent_id || 'anonymous';
    console.log(`🍄 Setting up Realtime notifications for ${agentId}...`);

    supabaseClient = createClient(config.supabase_url, config.supabase_key, {
        realtime: {
            params: { eventsPerSecond: 10 }
        }
    });

    realtimeChannel = supabaseClient
        .channel('desktop-notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'agent_messages',
                filter: `to_agent=eq.${agentId}`
            },
            (payload) => {
                const message = payload.new;
                showNotification(message);
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to Supabase Realtime');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Realtime channel error:', err);
            }
        });
}

// Show native Electron notification
function showNotification(message) {
    const preview = message.encrypted
        ? '🔒 Encrypted message'
        : message.message?.substring(0, 100) || '';

    const notification = new Notification({
        title: `📬 ${message.from_agent}: ${message.subject}`,
        body: preview,
        silent: false,
        urgency: 'normal'
    });

    notification.on('click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    notification.show();
    console.log(`📬 Notification: ${message.from_agent} - ${message.subject}`);
}

// Wait for dashboard to be ready
function waitForDashboard(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            const http = require('http');
            // Use 127.0.0.1 to match the server binding
            const checkUrl = url.replace('localhost', '127.0.0.1');
            const req = http.get(checkUrl, (res) => {
                resolve(true);
            });
            req.on('error', () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Dashboard startup timeout'));
                } else {
                    setTimeout(check, 300);
                }
            });
            req.end();
        };

        // Give the server a moment to start
        setTimeout(check, 500);
    });
}

// Start the dashboard server
function startDashboard() {
    return new Promise((resolve, reject) => {
        const mycmailCmd = process.platform === 'win32' ? 'mycmail.cmd' : 'mycmail';

        console.log('🍄 Starting Myceliumail dashboard...');

        dashboardProcess = spawn(mycmailCmd, ['dashboard'], {
            env: { ...process.env },
            shell: true,
            detached: false
        });

        dashboardProcess.stdout.on('data', (data) => {
            console.log(`Dashboard: ${data}`);
        });

        dashboardProcess.stderr.on('data', (data) => {
            console.error(`Dashboard error: ${data}`);
        });

        dashboardProcess.on('error', (err) => {
            console.error('Failed to start dashboard:', err);
            reject(err);
        });

        waitForDashboard(`http://localhost:${DASHBOARD_PORT}`)
            .then(resolve)
            .catch(reject);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Myceliumail',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#030712',
    });

    mainWindow.loadURL(`http://127.0.0.1:${DASHBOARD_PORT}`);
    mainWindow.webContents.setZoomFactor(0.9);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Myceliumail',
            click: () => mainWindow.show()
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Myceliumail');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });
}

app.whenReady().then(async () => {
    try {
        // Load config and setup notifications
        const config = loadConfig();
        setupRealtimeNotifications(config);

        await startDashboard();
        createWindow();
        // createTray(); // Uncomment to enable tray icon

        app.on('activate', () => {
            if (mainWindow === null) {
                createWindow();
            } else {
                mainWindow.show();
            }
        });
    } catch (err) {
        console.error('Failed to start:', err);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;

    // Cleanup realtime subscription
    if (realtimeChannel && supabaseClient) {
        supabaseClient.removeChannel(realtimeChannel);
    }

    // Kill the dashboard process
    if (dashboardProcess) {
        console.log('Stopping dashboard...');
        dashboardProcess.kill();
    }
});
