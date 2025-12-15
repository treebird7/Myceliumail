import { Command } from 'commander';
import { startDashboard } from '../dashboard/server.js';

export function createDashboardCommand(): Command {
    return new Command('dashboard')
        .description('Start web dashboard on localhost:3737')
        .option('-p, --port <port>', 'Port to run on', '3737')
        .action(async (options) => {
            const port = parseInt(options.port, 10);
            console.log(`\n🍄 Starting Myceliumail Dashboard...`);
            await startDashboard(port);
            // Help text
            console.log(`\n   ➜  http://localhost:${port}`);
            console.log('\nPress Ctrl+C to stop');

            // Keep process alive
            await new Promise(() => { });
        });
}
