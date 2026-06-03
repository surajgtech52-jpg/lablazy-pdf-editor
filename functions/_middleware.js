/**
 * CLOUDFLARE PAGES ENTERPRISE MIDDLEWARE
 * Features: Session-only cookies, Back/Forward Cache prevention, and Logout routing.
 */
export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);
    const TOTP_SECRET = env.TOTP_SECRET || "JBSWY3DPEHPK3PXP";

    // 1. LOGOUT ROUTER
    // If the user visits yoursite.com/logout, destroy the cookie and redirect to home.
    if (url.pathname === '/logout') {
        return new Response('Logging out...', {
            status: 302,
            headers: {
                'Location': '/',
                // Overwriting the cookie with Max-Age=0 destroys it immediately
                'Set-Cookie': '__Host-lablazy_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
            }
        });
    }

    // 2. CHECK EXISTING AUTHENTICATION
    const cookie = request.headers.get('Cookie') || '';
    const isAuth = cookie.includes('__Host-lablazy_auth=verified_session');

    if (isAuth) {
        // User is logged in. Let them see the actual website.
        const response = await next();
        
        // ANTI-BACK-BUTTON CACHE: 
        // We must clone the response to inject strict anti-caching headers.
        // This ensures if they log out and click "Back", the browser is forced to reload and check the lock.
        const secureResponse = new Response(response.body, response);
        secureResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        secureResponse.headers.set('Pragma', 'no-cache');
        secureResponse.headers.set('Expires', '0');
        
        return secureResponse; 
    }

    // 3. PROCESS LOGIN FORM SUBMISSION
    if (request.method === 'POST' && request.headers.get('content-type')?.includes('form')) {
        try {
            const formData = await request.formData();
            
            if (formData.has('is_totp_login')) {
                const authCode = formData.get('password')?.trim();
                const isValid = await verifyTOTP(authCode, TOTP_SECRET);

                if (isValid) {
                    return new Response('Authenticating...', {
                        status: 302,
                        headers: {
                            'Location': url.pathname,
                            // REMOVED 'Max-Age' -> This makes it a "Session Cookie". 
                            // It will automatically self-destruct when the user closes their browser completely.
                            'Set-Cookie': '__Host-lablazy_auth=verified_session; Path=/; HttpOnly; Secure; SameSite=Strict'
                        }
                    });
                } else {
                    return new Response(getLoginHtml('Invalid Code. Access Denied.'), {
                        status: 401,
                        headers: getSecureHeaders()
                    });
                }
            }
        } catch (e) {
            console.error("Form parsing error", e);
        }
    }

    // 4. SHOW LOGIN PAGE (WITH STRICT HEADERS)
    return new Response(getLoginHtml(), {
        status: 401,
        headers: getSecureHeaders()
    });
}


// --- HELPER: Constant Time Comparison to prevent Timing Attacks ---
function constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// --- HELPER: Strict Security Headers ---
function getSecureHeaders() {
    return {
        'Content-Type': 'text/html;charset=UTF-8',
        'X-Frame-Options': 'DENY', 
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store, no-cache, must-revalidate', // Never cache the login screen
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;"
    };
}

// --- TOTP VERIFIER ---
async function verifyTOTP(token, secret) {
    if (!/^\d{6}$/.test(token)) return false;

    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < secret.length; i++) {
        const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }

    const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < keyBytes.length; i++) {
        keyBytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
    }

    const timeStep = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -1; i <= 1; i++) {
        const step = timeStep + i;
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint32(4, step, false); 
        
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        const hash = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
        const hmac = new Uint8Array(hash);
        
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) % 1000000;
        
        const expectedToken = code.toString().padStart(6, '0');
        
        if (constantTimeCompare(expectedToken, token)) {
            return true;
        }
    }
    return false;
}

// --- HTML UI ---
function getLoginHtml(errorMsg = '') {
    const bgText = "lablazy &nbsp; ".repeat(600);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lablazy - Secure Vault</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #0f172a; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: 'Inter', sans-serif; overflow: hidden; }
        .lablazy-bg { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; opacity: 0.04; pointer-events: none; user-select: none; z-index: 0; font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; font-weight: bold; color: white; transform: rotate(-15deg); line-height: 1.5; word-break: break-all; }
        .glass-box { position: relative; z-index: 1; background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; padding: 3.5rem 2.5rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 400px; width: 90%; color: white; }
        h2 { margin-top: 0; margin-bottom: 0.5rem; font-family: 'Space Grotesk', sans-serif; letter-spacing: 1px; font-size: 1.8rem; }
        p { margin-bottom: 2rem; opacity: 0.8; font-size: 0.9rem; }
        input { width: 100%; padding: 0.9rem; margin-bottom: 1rem; border: none; border-radius: 8px; font-size: 1.2rem; text-align: center; background: rgba(255, 255, 255, 0.9); outline: none; box-sizing: border-box; transition: box-shadow 0.3s; }
        input:focus { box-shadow: 0 0 0 3px #3b82f6; }
        button { width: 100%; padding: 0.9rem; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; background: #3b82f6; color: white; cursor: pointer; transition: background 0.3s ease; font-family: 'Inter', sans-serif; }
        button:hover { background: #2563eb; }
        .error { color: #f87171; font-weight: bold; margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); }
    </style>
</head>
<body>
    <div class="lablazy-bg">${bgText}</div>
    <div class="glass-box">
        <h2>Cloudflare Edge Secure</h2>
        <p>This environment is strictly restricted. Please enter your 6-digit Google Authenticator code to proceed.</p>
        ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
        <form method="POST">
            <input type="hidden" name="is_totp_login" value="true" />
            <input type="password" name="password" maxlength="6" pattern="\\d{6}" placeholder="••••••" required autocomplete="off" autofocus style="letter-spacing: 0.5rem; font-size: 1.5rem;" />
            <button type="submit">Unlock Application</button>
        </form>
    </div>
</body>
</html>`;
}
