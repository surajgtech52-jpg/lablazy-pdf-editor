/**
 * CLOUDFLARE PAGES SECURE MIDDLEWARE
 * This intercepts all requests. If the user is not authenticated, 
 * it serves a glassmorphism login screen and blocks access to your site.
 */
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // 1. Check if the user is already authenticated via Cookie
    const cookie = request.headers.get('Cookie') || '';
    if (cookie.includes('lablazy_auth=verified_session')) {
        return next(); // Allow access to the real site
    }

    // 2. Handle Login Form Submission
    if (request.method === 'POST') {
        const formData = await request.formData();
        const authCode = formData.get('password');

        /* 
          SECRET OBFUSCATION ENGINE
          The secret Base32 key for Google Authenticator is mathematically obfuscated.
          The array below reconstructs to your Setup Key: JBSWY3DPEHPK3PXP
        */
        const _0x1a2b = [89, 81, 98, 102, 104, 66, 83, 95, 84, 87, 95, 90, 66, 95, 103, 95];
        const _0xsecret = _0x1a2b.map(x => String.fromCharCode(x - 15)).join('');

        // Verify the 6-digit code against the current Time-Based One-Time Password
        const isValid = await verifyTOTP(authCode, _0xsecret);

        if (isValid) {
            // Code is correct! Issue a secure, HTTP-only cookie valid for 30 days
            return new Response('Authenticating...', {
                status: 302,
                headers: {
                    'Location': url.pathname,
                    'Set-Cookie': 'lablazy_auth=verified_session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000'
                }
            });
        } else {
            // Wrong TOTP code
            return new Response(getLoginHtml('Invalid 6-Digit Code. Access Denied.'), {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' }
            });
        }
    }

    // 3. Show Login Page for unauthenticated GET requests
    return new Response(getLoginHtml(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
}

// --- CLOUDFLARE EDGE NATIVE TOTP VERIFIER ---
async function verifyTOTP(token, secret) {
    // Ensure the input is exactly 6 digits
    if (!/^\d{6}$/.test(token)) return false;

    // Decode Base32 Secret
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

    // Generate expected codes for current, previous, and next time windows 
    // (Allows 30 seconds of clock drift for network delay or slow typing)
    const time = Math.floor(Date.now() / 1000 / 30);
    
    for (let step = -1; step <= 1; step++) {
        const timeBytes = new Uint8Array(8);
        const currentStep = time + step;
        for (let i = 7; i >= 0; i--) {
            timeBytes[i] = Math.floor(currentStep / Math.pow(256, 7 - i)) & 255;
        }

        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: { name: 'SHA-1' } }, false, ['sign']);
        const hash = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
        const hmac = new Uint8Array(hash);
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) % 1000000;
        
        if (code.toString().padStart(6, '0') === token) {
            return true; // Match found!
        }
    }
    return false;
}

// --- HTML UI for the Intercepted Login Screen ---
function getLoginHtml(errorMsg = '') {
    // Generates a massive background string of repeating text
    const bgText = "lablazy &nbsp; ".repeat(300);

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
            <input type="password" name="password" maxlength="6" pattern="\\d{6}" placeholder="••••••" required autocomplete="off" autofocus style="letter-spacing: 0.5rem; font-size: 1.5rem;" />
            <button type="submit">Unlock Application</button>
        </form>
    </div>
</body>
</html>`;
}
