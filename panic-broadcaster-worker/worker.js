export class PanicBroadcaster {
    constructor(state) {
        this.state = state;
        this.clients = new Set();
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/state' && request.method === 'GET') {
            return Response.json(await this.getState(), {
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        if (url.pathname === '/events' && request.method === 'GET') {
            return this.openEventStream(request);
        }

        if (url.pathname === '/toggle' && request.method === 'POST') {
            const body = await request.json().catch(() => null);
            if (!body || typeof body.active !== 'boolean' || typeof body.clientKey !== 'string') {
                return new Response('Invalid toggle request', { status: 400 });
            }
            if (body.active) {
                const rateKey = `rate:${body.clientKey}`;
                if (await this.state.storage.get(rateKey)) {
                    return new Response('Too many requests', { status: 429 });
                }
                await this.state.storage.put(rateKey, true, { expirationTtl: 60 });
            }
            const nextState = {
                active: body.active,
                epoch: crypto.randomUUID(),
                updatedAt: Date.now()
            };
            await this.state.storage.put('panic', nextState);
            await this.broadcast(nextState);
            return Response.json(nextState, { headers: { 'Cache-Control': 'no-store' } });
        }

        return new Response('Not found', { status: 404 });
    }

    async getState() {
        return (await this.state.storage.get('panic')) || {
            active: false,
            epoch: 'v1',
            updatedAt: 0
        };
    }

    openEventStream(request) {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const client = { writer, closed: false };
        this.clients.add(client);

        const close = async () => {
            if (client.closed) return;
            client.closed = true;
            this.clients.delete(client);
            clearInterval(client.keepAliveTimer);
            await writer.close().catch(() => {});
        };

        client.keepAliveTimer = setInterval(() => {
            if (!client.closed) {
                writer.write(new TextEncoder().encode(': keep-alive\n\n')).catch(close);
            }
        }, 15000);

        request.signal.addEventListener('abort', close);
        writer.write(new TextEncoder().encode(': connected\n\n')).catch(close);

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        });
    }

    async broadcast(nextState) {
        const message = new TextEncoder().encode(
            `event: PANIC_TOGGLE\ndata: ${JSON.stringify({
                event: 'PANIC_TOGGLE',
                active: nextState.active,
                epoch: nextState.epoch
            })}\n\n`
        );
        await Promise.all([...this.clients].map(async (client) => {
            try {
                if (!client.closed) await client.writer.write(message);
            } catch {
                await client.writer.close().catch(() => {});
                client.closed = true;
                this.clients.delete(client);
                clearInterval(client.keepAliveTimer);
            }
        }));
    }
}

export default {
    async fetch() {
        return new Response('Panic broadcaster worker');
    }
};
