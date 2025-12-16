const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let tray;
let dashboardProcess;
const DASHBOARD_PORT = 3737;

// Wait for dashboard to be ready
function waitForDashboard(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            const http = require('http');
            const req = http.get(url, (res) => {
                resolve(true);
            });
            req.on('error', () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Dashboard startup timeout'));
                } else {
                    setTimeout(check, 200);
                }
            });
            req.end();
        };

        check();
    });
}

// Start the dashboard server
function startDashboard() {
    return new Promise((resolve, reject) => {
        // Try to find mycmail in PATH or use bundled version
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

        // Wait for dashboard to be ready
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
        titleBarStyle: 'hiddenInset', // macOS: clean title bar
        backgroundColor: '#030712', // Match dashboard dark theme
    });

    mainWindow.loadURL(`http://localhost:${DASHBOARD_PORT}`);

    // Set zoom level slightly smaller for better readability
    mainWindow.webContents.setZoomFactor(0.9);

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Hide instead of close (keeps running in tray)
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    // Use a simple emoji for now, replace with proper icon
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

    // Kill the dashboard process
    if (dashboardProcess) {
        console.log('Stopping dashboard...');
        dashboardProcess.kill();
    }
});
