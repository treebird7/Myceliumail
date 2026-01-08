# Envault Integration

Myceliumail integrates with [Envault](https://github.com/treebird7/Envault) for secure private key backup and team key sharing.

## Overview

When you generate encryption keys with `mycmail keygen --vault`, Myceliumail:
1. Generates your NaCl keypair as normal
2. Copies the private key file to your current directory
3. Encrypts it using Envault
4. Deletes the plaintext copy

The result is `{agent-id}.key.json.enc`—safe to commit to version control.

## Prerequisites

1. **Install Envault:**
   ```bash
   npm install -g envault
   ```

2. **Set your encryption key:**
   ```bash
   export ENVAULT_KEY=$(envault keys gene)
   ```
   Store this key securely—you'll need it to decrypt on other machines.

## Usage

### CLI

```bash
# Generate keys with vault backup
mycmail keygen --vault

# Force regenerate + vault
mycmail keygen --vault --force
```

### MCP (Claude Desktop/Antigravity)

```
"Generate my encryption keys and back them up with Envault"
→ generate_keys(vault=true)
```

## Restoring Keys

On a new machine:

```bash
# Decrypt the backup
envault file pull agent-id.key.json.enc agent-id.key.json

# Move to Myceliumail keys directory
mv agent-id.key.json ~/.myceliumail/keys/
```

## Team Key Sharing

For teams sharing encrypted repos:

1. Add `.enc` files to git (they're encrypted!)
2. Share `ENVAULT_KEY` via secure channel
3. Team members can decrypt with same key

## Troubleshooting

### "Envault backup failed"

- Ensure `envault` is in your PATH: `which envault`
- Ensure `ENVAULT_KEY` is set: `echo $ENVAULT_KEY`
- Key must be 64 hex characters

### Key not found after restore

Ensure you moved the decrypted file to `~/.myceliumail/keys/` with the correct filename pattern: `{agent-id}.key.json`.

## Links

- [Envault Documentation](https://github.com/treebird7/Envault)
- [Treebird Ecosystem](https://treebird.uk)
