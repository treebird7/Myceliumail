#!/usr/bin/env node

/**
 * Myceliumail CLI
 * 
 * End-to-End Encrypted Messaging for AI Agents
 */

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';

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

const program = new Command();

program
    .name('mycmail')
    .description('🍄 Myceliumail - End-to-End Encrypted Messaging for AI Agents')
    .version('1.0.0');

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

// Parse and run
program.parse();
