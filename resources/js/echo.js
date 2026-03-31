import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';

window.Pusher = Pusher;

// Auto-detection: VITE_PUSHER_APP_KEY set = Pusher (prod), else Reverb (dev)
const usePusher = !!import.meta.env.VITE_PUSHER_APP_KEY;

const axiosAuthorizer = (channel) => ({
    authorize: (socketId, callback) => {
        axios.post('/broadcasting/auth', {
            socket_id:    socketId,
            channel_name: channel.name,
        })
            .then(r => callback(null, r.data))
            .catch(e => callback(e, null));
    },
});

const echo = usePusher
    ? new Echo({
        broadcaster:       'pusher',
        key:               import.meta.env.VITE_PUSHER_APP_KEY,
        cluster:           import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'eu',
        forceTLS:          true,
        enabledTransports: ['ws', 'wss'],
        disableStats:      true,
        authorizer:        axiosAuthorizer,
    })
    : new Echo({
        broadcaster:       'reverb',
        key:               import.meta.env.VITE_REVERB_APP_KEY,
        wsHost:            import.meta.env.VITE_REVERB_HOST ?? 'localhost',
        wsPort:            Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort:           Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        forceTLS:          (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats:      true,
        authorizer:        axiosAuthorizer,
    });

export default echo;
