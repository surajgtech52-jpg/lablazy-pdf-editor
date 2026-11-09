const MAX_BODY_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const ALLOWED_CATEGORIES = new Set(['bug_ui', 'pdf_editor', 'file_transfer', 'feature_req', 'format_req', 'other']);

export async function onRequestPost(context) {
    const endpoint = context.env.BUG_REPORT_ENDPOINT;
    if (!endpoint) {
        return jsonResponse({ success: false, error: 'Bug report service is not configured.' }, 503);
    }

    const contentLength = Number(context.request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
        return jsonResponse({ success: false, error: 'The report is too large.' }, 413);
    }

    try {
        const body = await context.request.text();
        if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
            return jsonResponse({ success: false, error: 'The report is too large.' }, 413);
        }

        const payload = JSON.parse(body);
        if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) {
            return jsonResponse({ success: false, error: 'A report title is required.' }, 400);
        }
        if (typeof payload.category !== 'string' || !ALLOWED_CATEGORIES.has(payload.category)) {
            return jsonResponse({ success: false, error: 'A feedback category is required.' }, 400);
        }
        if (typeof payload.description !== 'string' || !payload.description.trim()) {
            return jsonResponse({ success: false, error: 'A detailed description is required.' }, 400);
        }
        if (!Array.isArray(payload.attachments)) {
            return jsonResponse({ success: false, error: 'Invalid attachment data.' }, 400);
        }

        for (const attachment of payload.attachments) {
            if (!attachment || !ALLOWED_TYPES.has(attachment.type) ||
                !Number.isSafeInteger(attachment.size) || attachment.size < 0 ||
                attachment.size > MAX_ATTACHMENT_BYTES ||
                typeof attachment.data !== 'string' || !attachment.data.startsWith('data:')) {
                return jsonResponse({ success: false, error: 'Invalid attachment.' }, 400);
            }
        }

        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body
        });
        const responseBody = await upstream.text();
        if (!upstream.ok) {
            console.error('Bug report service rejected the request:', upstream.status, responseBody.slice(0, 500));
            let upstreamError = null;
            try {
                upstreamError = JSON.parse(responseBody);
            } catch {
                // Google may return an HTML error page for an unpublished web app.
            }
            return jsonResponse({
                success: false,
                error: upstreamError?.error || `The report service rejected the request (${upstream.status}).`
            }, 502);
        }
        return new Response(responseBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
    } catch (error) {
        console.error('Bug report forwarding failed:', error);
        return jsonResponse({ success: false, error: 'The report could not be submitted.' }, 502);
    }
}

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}
