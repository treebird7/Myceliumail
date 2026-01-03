#!/usr/bin/env node

/**
 * Myceliumail CLI
 * 
 * End-to-End Encrypted Messaging for AI Agents
 */

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadConfig } from '../lib/config.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

// Import commands
import { createKeygenCommand } from '../commands/keygen.js';
import { createKeysCommand } from '../commands/keys.js';
import { createKeyImportCommand } from '../commands/key-import.js';
import { createKeyAnnounceCommand } from '../commands/key-announce.js';
import { createSendCommand } from '../commands/send.js';
import { createInboxCommand } from '../commands/inbox.js';
import { createReadCommand } from '../commands/read.js';
import { createDashboardCommand } from '../commands/dashboard.js';
import { createBroadcastCommand } from '../commands/broadcast.js';
import { createWatchCommand } from '../commands/watch.js';
import { createExportCommand } from '../commands/export.js';
import { createStatusCommand } from '../commands/status.js';
import { createActivateCommand, createLicenseStatusCommand } from '../commands/activate.js';
import { createWakeCommand } from '../commands/wake.js';
import { createCloseCommand } from '../commands/close.js';
import { createTagsCommand } from '../commands/tags.js';
import { createCollabCommand } from '../commands/collab.js';
import { createClaimCommand } from '../commands/claim.js';
import { createCompleteCommand } from '../commands/complete.js';
import { createSignCommand, createSignKeygenCommand } from '../commands/sign.js';
import { createVerifyCommand } from '../commands/verify.js';
import { createCanaryInitCommand, createCanaryCheckCommand } from '../commands/canary.js';
import { checkForUpdates } from '../lib/update-check.js';

const program = new Command();

program
    .name('mycmail')
    .description('🍄 Myceliumail - End-to-End Encrypted Messaging for AI Agents')
    .version(pkg.version);

// Show current agent in help
const config = loadConfig();
program.addHelpText('after', `
Current agent: ${config.agentId}
Config: ~/.myceliumail/config.json
`);

// Register commands
program.addCommand(createKeygenCommand());
program.addCommand(createKeysCommand());
program.addCommand(createKeyImportCommand());
program.addCommand(createKeyAnnounceCommand());
program.addCommand(createSendCommand());
program.addCommand(createInboxCommand());
program.addCommand(createReadCommand());
program.addCommand(createDashboardCommand());
program.addCommand(createBroadcastCommand());
program.addCommand(createWatchCommand());
program.addCommand(createExportCommand());
program.addCommand(createStatusCommand());

// Session lifecycle commands
program.addCommand(createWakeCommand());
program.addCommand(createCloseCommand());
program.addCommand(createTagsCommand());
program.addCommand(createCollabCommand());
program.addCommand(createClaimCommand());
program.addCommand(createCompleteCommand());

// Identity verification (signing)
program.addCommand(createSignCommand());
program.addCommand(createSignKeygenCommand());
program.addCommand(createVerifyCommand());
program.addCommand(createCanaryInitCommand());
program.addCommand(createCanaryCheckCommand());

// License management
program.addCommand(createActivateCommand());
program.addCommand(createLicenseStatusCommand());

// Check for updates (non-blocking, runs in background)
checkForUpdates().catch(() => { });

// Parse and run
program.parse();

