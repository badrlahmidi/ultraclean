import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    // Use axios for channel auth so CSRF token + session cookie are sent
    authorizer: (channel) => ({
        authorize: (socketId, callback) => {
            axios.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            })
                .then(r => callback(null, r.data))
                .catch(e => callback(e, null));
        },
    }),
});

export default echo;
