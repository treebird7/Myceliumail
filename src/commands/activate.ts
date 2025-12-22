/**
 * License Activation Command
 * 
 * Activates a Pro license key.
 * Usage: mycmail activate <license-key>
 */

import { Command } from 'commander';
import { verifyLicense, saveLicense, getLicenseStatus, FREE_TIER_LIMITS } from '../lib/license.js';
import { loadKnownKeys } from '../lib/crypto.js';

export function createActivateCommand(): Command {
    return new Command('activate')
        .description('Activate a Pro license key')
        .argument('<license-key>', 'Your license key from myceliumail.dev/pro')
        .action(async (licenseKey: string) => {
            console.log('🍄 Activating license...\n');

            // Verify the license
            const license = verifyLicense(licenseKey);

            if (!license) {
                console.error('❌ Invalid license key');
                console.error('   Please check your key and try again.');
                console.error('   Get a license at: myceliumail.dev/pro');
                process.exit(1);
            }

            if (license.isExpired) {
                console.error('❌ This license has expired');
                console.error(`   Expired on: ${new Date(license.data.expiresAt).toLocaleDateString()}`);
                console.error('   Renew at: myceliumail.dev/pro');
                process.exit(1);
            }

            // Save the license
            const saved = saveLicense(licenseKey);
            if (!saved) {
                console.error('❌ Failed to save license');
                console.error('   Please check file permissions for ~/.myceliumail/');
                process.exit(1);
            }

            // Show success
            const status = getLicenseStatus();
            console.log('✅ Pro License activated!\n');
            console.log(`   Email:    ${status.email}`);
            console.log(`   Plan:     ${status.plan.toUpperCase()}`);
            console.log(`   Expires:  ${new Date(status.expiresAt!).toLocaleDateString()}`);
            console.log(`   Features: ${status.features.join(', ')}`);
            console.log('');
            console.log('🍄 Thank you for supporting Myceliumail!');
        });
}

export function createLicenseStatusCommand(): Command {
    return new Command('license')
        .description('Show license status and plan details')
        .action(async () => {
            const status = getLicenseStatus();
            const knownKeys = loadKnownKeys();
            const keyCount = Object.keys(knownKeys).length;

            console.log('🍄 Myceliumail License Status\n');

            if (status.plan === 'pro') {
                console.log(`   Plan:      💎 Pro`);
                console.log(`   Email:     ${status.email}`);
                console.log(`   Expires:   ${new Date(status.expiresAt!).toLocaleDateString()} (${status.daysRemaining} days)`);
                console.log(`   Features:  ${status.features.join(', ')}`);
                console.log(`   Keys:      ${keyCount} imported (unlimited)`);
            } else {
                console.log(`   Plan:      Free`);
                console.log(`   Keys:      ${keyCount}/${FREE_TIER_LIMITS.maxImportedKeys} imported`);
                console.log('');
                console.log('   💎 Upgrade to Pro for:');
                console.log('      • Unlimited imported keys');
                console.log('      • MCP Server integration');
                console.log('      • Cloud key backup/restore');
                console.log('      • Real-time notifications');
                console.log('');
                console.log('   Get Pro: myceliumail.dev/pro');
            }
        });
}
