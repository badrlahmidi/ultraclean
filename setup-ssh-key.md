# 🔑 Setup SSH Key for Hostinger Authentication

This guide helps you set up SSH key authentication so you don't need to enter your password every time.

---

## Why Use SSH Keys?

- ✅ No password required for SSH connections
- ✅ More secure than password authentication
- ✅ Enables automated deployments
- ✅ Faster connections

---

## Step 1: Generate SSH Key on Hostinger

Connect to Hostinger via SSH:
```bash
ssh -p 65002 u897563629@91.108.101.158
```

Then generate the key:
```bash
ssh-keygen -t ed25519 -C "u897563629@91.108.101.158"
```

Press Enter for all defaults (3 times):
1. Enter file in which to save the key: **Press Enter**
2. Enter passphrase (empty for no passphrase): **Press Enter**
3. Enter same passphrase again: **Press Enter**

---

## Step 2: Copy the Public Key

Display your public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519` and ends with your email)

---

## Step 3: Add SSH Key to Your Local Machine

### On Windows (Git Bash / PowerShell):

1. Create SSH directory:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

2. Create or edit authorized_keys:
```bash
nano ~/.ssh/authorized_keys
```

3. Paste the public key from Hostinger
4. Save: `Ctrl+X`, `Y`, `Enter`

5. Set permissions:
```bash
chmod 600 ~/.ssh/authorized_keys
```

### On Mac/Linux:

Same commands as Windows above.

---

## Step 4: Test SSH Connection

From your local machine:
```bash
ssh -p 65002 u897563629@91.108.101.158
```

You should connect WITHOUT being asked for a password!

---

## Step 5: Configure SSH Config (Optional)

Create/Edit `~/.ssh/config`:
```bash
nano ~/.ssh/config
```

Add:
```
Host hostinger
    HostName 91.108.101.158
    Port 65002
    User u897563629
    IdentityFile ~/.ssh/id_ed25519
```

Save: `Ctrl+X`, `Y`, `Enter`

Now you can connect with:
```bash
ssh hostinger
```

---

## Troubleshooting

### Still asks for password?

1. Check permissions on Hostinger:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
```

2. Check permissions on local machine:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

3. Test SSH with verbose output:
```bash
ssh -v -p 65002 u897563629@91.108.101.158
```

### Connection refused?

- Check that SSH is enabled on Hostinger
- Verify port 65002 is correct
- Check firewall settings

---

## After Setup

Once SSH keys are working, you can:

1. **Run deployment script without password:**
```bash
ssh -p 65002 u897563629@91.108.101.158 "cd ~/domains/ultraclean.ritajpos.com/public_html && ./deploy-to-hostinger.sh"
```

2. **Execute single commands:**
```bash
ssh -p 65002 u897563629@91.108.101.158 "ls -la"
```

3. **Automate deployments with scripts**

---

## Security Note

- Never share your private key (`id_ed25519`)
- Only share the public key (`id_ed25519.pub`)
- Set a passphrase on your key for extra security
- Rotate keys periodically