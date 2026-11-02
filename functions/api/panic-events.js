function getBroadcaster(env) {
    if (!env.PANIC_BROADCASTER) return null;
    const id = env.PANIC_BROADCASTER.idFromName('global-panic');
    return env.PANIC_BROADCASTER.get(id);
}

export async function onRequestGet(context) {
    const broadcaster = getBroadcaster(context.env);
    if (!broadcaster) {
        return new Response('Panic broadcaster is not configured', { status: 503 });
    }
    return broadcaster.fetch(new Request('https://panic.internal/events', {
        method: 'GET',
        signal: context.request.signal
    }));
}
