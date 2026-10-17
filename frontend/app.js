const TOKEN_KEY = 'socketChatToken';
const REFRESH_TOKEN_KEY = 'socketChatRefreshToken';

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const status = document.getElementById('connection-status');
const reconnectButton = document.getElementById('reconnect');
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

let socket;
let refreshTimer;
let refreshPromise;

function updateConnectionStatus(message, connected) {
    status.textContent = message;
    reconnectButton.hidden = connected;
    form.hidden = !connected;
    messages.hidden = !connected;
}

function clearRefreshTimer() {
    window.clearTimeout(refreshTimer);
}

function showLogin(message) {
    clearRefreshTimer();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    const oldSocket = socket;
    socket = undefined;
    oldSocket?.disconnect();

    loginForm.hidden = false;
    loginError.textContent = message;
    updateConnectionStatus('Please log in to connect', false);
}

function scheduleRefresh(accessToken) {
    clearRefreshTimer();

    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof payload.exp !== 'number') {
            return;
        }

        const delay = Math.max(0, payload.exp * 1000 - Date.now());
        refreshTimer = window.setTimeout(refreshAccessAndReconnect, delay);
    } catch {
        showLogin('Your access token is invalid. Please log in again.');
    }
}

async function refreshAccessAndReconnect() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
            showLogin('Your session expired. Please log in again.');
            return;
        }

        updateConnectionStatus('Refreshing session…', false);
        try {
            const response = await fetch('/users/refresh', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${refreshToken}`
                }
            });

            let result;
            try {
                result = await response.json();
            } catch {
                result = {};
            }

            if (response.status === 401) {
                showLogin('Your session expired. Please log in again.');
                return;
            }
            if (!response.ok) {
                throw new Error(result.message || 'Could not refresh your session.');
            }
            if (!result.jwt) {
                throw new Error('The server did not return a new access token.');
            }

            localStorage.setItem(TOKEN_KEY, result.jwt);
            connectWithToken(result.jwt);
        } catch (error) {
            updateConnectionStatus('Could not refresh session', false);
            loginError.textContent = `${error.message} Use Reconnect to try again.`;
        }
    })();

    try {
        await refreshPromise;
    } finally {
        refreshPromise = undefined;
    }
}

function connectWithToken(token) {
    clearRefreshTimer();
    const oldSocket = socket;
    socket = undefined;
    oldSocket?.disconnect();

    loginError.textContent = '';
    updateConnectionStatus('Connecting…', false);
    const currentSocket = io({
        autoConnect: false,
        reconnection: false,
        extraHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
    socket = currentSocket;

    currentSocket.on('connect', () => {
        if (socket !== currentSocket) {
            return;
        }
        updateConnectionStatus('Connected', true);
        loginForm.hidden = true;
        scheduleRefresh(token);
    });

    currentSocket.on('disconnect', () => {
        if (socket === currentSocket) {
            clearRefreshTimer();
            updateConnectionStatus('Disconnected', false);
        }
    });

    currentSocket.on('connect_error', (error) => {
        if (socket !== currentSocket) {
            return;
        }
        updateConnectionStatus('Connection failed', false);
        if (error.message === 'Authentication failed') {
            refreshAccessAndReconnect();
        }
    });

    currentSocket.on('chat message', (message) => {
        const item = document.createElement('li');
        item.textContent = message;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    currentSocket.connect();
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';

    try {
        const response = await fetch('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value
            })
        });
        const result = await response.json();

        if (!response.ok) {
            loginError.textContent = result.message || 'Login failed.';
            return;
        }

        if (!result.jwt || !result.refresh_jwt) {
            loginError.textContent = 'Login succeeded but the server did not return both tokens.';
            return;
        }

        localStorage.setItem(TOKEN_KEY, result.jwt);
        localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_jwt);
        passwordInput.value = '';
        connectWithToken(result.jwt);
    } catch {
        loginError.textContent = 'Could not reach the server. Check your connection and try again.';
    }
});

reconnectButton.addEventListener('click', () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        connectWithToken(token);
    } else if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
        refreshAccessAndReconnect();
    } else {
        loginForm.hidden = false;
        loginError.textContent = 'Please log in to connect.';
    }
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (input.value.trim() && socket?.connected) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken) {
    connectWithToken(savedToken);
} else if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
    refreshAccessAndReconnect();
} else {
    updateConnectionStatus('Log in to connect', false);
}
