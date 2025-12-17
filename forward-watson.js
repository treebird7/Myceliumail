const fs = require('fs');
const path = require('path').join(require('os').homedir(), '.myceliumail/data/messages.json');
const msgs = JSON.parse(fs.readFileSync(path, 'utf8'));

const missedMsgs = [
    {
        id: 'f45c59ec-forwarded',
        sender: 'mycm',
        recipient: 'watson',
        subject: '[FORWARDED] Myceliumail Updates for Watson',
        body: 'Hey Watson!\n\nSyncing you up on recent updates:\n\nRealtime Notifications - Dashboard now has instant message delivery\n\nEncryption by Default - Messages auto-encrypt when keys are available\n\nNPM Published - myceliumail@1.0.2, myceliumail-mcp@1.0.3\n\nNote: You are watson, not wson (abbreviation) or wsan (Watsan orchestrator).\n\n- treebird (forwarded from Supabase)',
        encrypted: false,
        read: false,
        archived: false,
        createdAt: '2025-12-17T20:06:04.037Z'
    },
    {
        id: '43305dec-forwarded',
        sender: 'treebird',
        recipient: 'watson',
        subject: '[FORWARDED] Myceliumail Security Update',
        body: 'Hi Watson,\n\nImportant update shipped to Myceliumail:\n\nMessages are now encrypted by default - auto-encrypt when keys are available\n\nRealtime Notifications - mycmail watch now uses Supabase Realtime\n\nGlobal Config - ~/.myceliumail/config.json works from any project\n\n- treebird (forwarded from Supabase)',
        encrypted: false,
        read: false,
        archived: false,
        createdAt: '2025-12-17T19:04:25.534Z'
    },
    {
        id: 'identity-warning-001',
        sender: 'treebird',
        recipient: 'watson',
        subject: 'IMPORTANT - Do NOT use antigravity identity',
        body: 'Hi Watson,\n\nQuick clarification on identities:\n\nNOT A REAL AGENT: antigravity - This was a test name that keeps getting used accidentally. Please ignore any messages from antigravity.\n\nReal ecosystem agents:\n- treebird = Human (ecosystem owner)\n- watson = You! (Claude Desktop co-CEO)\n- wsan = Watsan (Claude Code orchestrator/archiver)\n- wson = Watson abbreviation\n- ssan = Spidersan agent\n- mycm/mycsan = Myceliumail agent\n\nThe messages I forwarded today were originally signed antigravity by mistake - they are actually from the treebird ecosystem.\n\n- treebird',
        encrypted: false,
        read: false,
        archived: false,
        createdAt: '2025-12-17T20:57:00.000Z'
    }
];

missedMsgs.forEach(m => msgs.push(m));
fs.writeFileSync(path, JSON.stringify(msgs, null, 2));
console.log('Forwarded ' + missedMsgs.length + ' messages to Watson local storage');
