# 🔑 Setup SSH Key Authentication for Hostinger

This guide helps you set up SSH key authentication so you don't need to enter a
password every time you deploy.

> ⚠️ **SECURITY:** Never commit SSH usernames, IP addresses, or server passwords
> to Git. All examples below use placeholder values — replace them with your own.

---

## Why Use SSH Keys?

- ✅ No password required for SSH connections
- ✅ More secure than password authentication
- ✅ Enables automated deployments
- ✅ Faster connections

---

## Step 1: Connect to Your Server

```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

Retrieve your SSH port, username, and server IP from **hPanel → SSH Access**.

---

## Step 2: Generate SSH Key on the Server

```bash
ssh-keygen -t ed25519 -C "<YOUR_EMAIL>"
```

Press Enter for all defaults (or set a passphrase for extra security):
1. Enter file in which to save the key: **Press Enter**
2. Enter passphrase (empty for no passphrase): **Press Enter**
3. Enter same passphrase again: **Press Enter**

---

## Step 3: Copy the Public Key

Display your public key on the server:
```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519`).

---

## Step 4: Add the Public Key to Your Local Machine's authorized_keys

### On Windows (Git Bash / PowerShell):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key, then save: Ctrl+X, Y, Enter
chmod 600 ~/.ssh/authorized_keys
```

### On Mac/Linux:

Same commands as above.

---

## Step 5: Test SSH Connection

From your local machine:
```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

You should connect **without** being asked for a password.

---

## Step 6: Configure SSH Config (Optional)

Create or edit `~/.ssh/config` on your **local machine**:

```
Host hostinger-ultraclean
    HostName <YOUR_SERVER_IP>
    Port <YOUR_SSH_PORT>
    User <YOUR_SSH_USER>
    IdentityFile ~/.ssh/id_ed25519
```

Then connect simply with:
```bash
ssh hostinger-ultraclean
```

---

## Troubleshooting

### Still asks for password?

Check permissions on the server:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
```

Test with verbose output:
```bash
ssh -v -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

### Connection refused?

- Verify SSH is enabled in hPanel
- Confirm the port number is correct
- Check Hostinger firewall settings

---

## Security Notes

- **Never share your private key** (`id_ed25519`)
- Share only the public key (`id_ed25519.pub`)
- Set a passphrase on your key for extra security
- Rotate keys periodically
- Do not embed server IPs or usernames in documentation or scripts
