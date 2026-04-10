import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';

window.Pusher = Pusher;

// Suppress Pusher.js internal console logging
Pusher.logToConsole = false;

// Auto-detection: VITE_PUSHER_APP_KEY set = Pusher (prod), else Reverb (dev)
const usePusher = !!import.meta.env.VITE_PUSHER_APP_KEY;
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;

// If neither Pusher nor Reverb key is configured, skip Echo entirely
if (!usePusher && !reverbKey) {
    console.info('[Echo] No broadcasting key configured — real-time disabled.');
}

const axiosAuthorizer = (channel) => ({
    authorize: (socketId, callback) => {
        axios.post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
        })
            .then(r => callback(null, r.data))
            .catch(e => callback(e, null));
    },
});

let echo = null;
let _connectionFailed = false;

if (usePusher) {
    echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'eu',
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        authorizer: axiosAuthorizer,
    });
} else if (reverbKey) {
    try {
        const reverbScheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
        const forceTLS = reverbScheme === 'https';
        // Only use the transport that matches the scheme to avoid duplicate WS/WSS failures
        const enabledTransports = forceTLS ? ['wss'] : ['ws'];

        echo = new Echo({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
            wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
            wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
            forceTLS,
            enabledTransports,
            disableStats: true,
            authorizer: axiosAuthorizer,
        });

        const conn = echo.connector.pusher.connection;

        // Stop reconnection spam when the server is unreachable
        const _stopOnFailure = (state) => {
            if (!_connectionFailed) {
                _connectionFailed = true;
                console.warn(`[Echo] WebSocket ${state} — Reverb server not running? Disabling reconnection.`);
                echo.connector.pusher.disconnect();
            }
        };

        conn.bind('error', () => _stopOnFailure('error'));
        conn.bind('state_change', ({ current }) => {
            if (current === 'unavailable' || current === 'failed') {
                _stopOnFailure(current);
            }
        });
    } catch {
        console.warn('[Echo] Failed to initialize Reverb Echo.');
        echo = null;
    }
}

export default echo;
