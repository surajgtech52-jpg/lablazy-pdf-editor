(function () {
    'use strict';

    if (window.panicSseClient) return;

    class PanicSseClient {
        constructor(options = {}) {
            this.url = options.url || '/api/panic-events';
            this.minDelay = options.minDelay || 1000;
            this.maxDelay = options.maxDelay || 30000;
            this.delay = this.minDelay;
            this.source = null;
            this.retryTimer = null;
            this.stableTimer = null;
            this.stopped = false;
        }

        setStatus(connected) {
            const indicator = document.getElementById('panicSseStatus');
            if (!indicator) return;
            indicator.classList.toggle('is-online', connected);
            indicator.title = connected ? 'Panic protection connected' : 'Panic protection reconnecting';
            indicator.setAttribute('aria-label', indicator.title);
        }

        start() {
            if (typeof EventSource === 'undefined' || this.source || this.stopped) return;
            this.setStatus(false);
            try {
                this.source = new EventSource(this.url);
                this.source.addEventListener('PANIC_TOGGLE', (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.active === true && payload.event === 'PANIC_TOGGLE') {
                            this.logout();
                        }
                    } catch (error) {
                        console.warn('Ignoring malformed panic event.', error);
                    }
                });
                this.source.onopen = () => {
                    this.stableTimer = setTimeout(() => {
                        this.delay = this.minDelay;
                    }, 10000);
                    this.setStatus(true);
                };
                this.source.onerror = () => {
                    clearTimeout(this.stableTimer);
                    this.setStatus(false);
                    this.closeSource();
                    this.scheduleReconnect();
                };
            } catch (error) {
                this.setStatus(false);
                console.warn('Panic event stream unavailable.', error);
                this.scheduleReconnect();
            }
        }

        closeSource() {
            if (this.source) {
                this.source.close();
                this.source = null;
            }
        }

        scheduleReconnect() {
            if (this.stopped || this.retryTimer) return;
            const jitter = Math.floor(Math.random() * 1000);
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                this.start();
            }, this.delay + jitter);
            this.delay = Math.min(this.delay * 2, this.maxDelay);
        }

        logout() {
            this.stop();
            try {
                sessionStorage.clear();
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith('lablazy_')) localStorage.removeItem(key);
                }
            } catch (error) {
                console.warn('Unable to clear local session state.', error);
            }
            window.location.replace('/logout');
        }

        stop() {
            this.stopped = true;
            clearTimeout(this.stableTimer);
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
            this.closeSource();
        }
    }

    window.panicSseClient = new PanicSseClient();
    window.panicSseClient.start();
})();
