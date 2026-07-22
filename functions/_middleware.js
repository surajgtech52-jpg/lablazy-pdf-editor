/**
 * CLOUDFLARE PAGES ENTERPRISE MIDDLEWARE
 * Features: Session-only cookies, Back/Forward Cache prevention, and Logout routing.
 */
export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);
    const TOTP_SECRET = env.TOTP_SECRET || "JBSWY3DPEHPK3PXP";

    // 0. PANIC MODE TOGGLE CHECK (CRASH-PROOFED)
    if (env.PANIC_STATE) {
        if (url.pathname === '/panic-toggle') {
            const secret = url.searchParams.get('secret');
            const active = url.searchParams.get('active'); // "true" or "false"
            if (secret === '993030') {
                await env.PANIC_STATE.put('middleware_active', active);
                
                // Notify signaling server of the panic state change to force instant browser reloads
                try {
                    const signalHost = env.SIGNALING_HOST || "lablazy-signaling-server.onrender.com";
                    const protocol = (signalHost.startsWith('localhost') || signalHost.startsWith('127.0.0.1')) ? 'http' : 'https';
                    const endpoint = active === 'true' ? '/panic' : '/unpanic';
                    await fetch(`${protocol}://${signalHost}${endpoint}`);
                } catch (e) {
                    console.error("Failed to notify signaling server:", e);
                }

                return new Response(`Authentication Screen Active: ${active}`, { status: 200 });
            }
            return new Response('Unauthorized', { status: 401 });
        }

        const isPanicActive = await env.PANIC_STATE.get('middleware_active');
        if (isPanicActive !== 'true') {
            return next();
        }
    }

    // 1. LOGOUT ROUTER
    // If the user visits yoursite.com/logout, destroy the cookie and purge site cache
    if (url.pathname === '/logout') {
        return new Response('Logging out...', {
            status: 302,
            headers: {
                'Location': '/',
                'Set-Cookie': '__Host-lablazy_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
                'Clear-Site-Data': '"cache", "cookies", "storage"',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

   // 2. CHECK EXISTING AUTHENTICATION
    const cookie = request.headers.get('Cookie') || '';
    const isAuth = cookie.includes('__Host-lablazy_auth=verified_session');

    if (isAuth) {
        // HEARTBEAT ENDPOINT: Keeps the short-lived session alive
        if (url.pathname === '/heartbeat') {
            return new Response('OK', {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Set-Cookie': '__Host-lablazy_auth=verified_session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=15'
                }
            });
        }

        // User is logged in. Let them see the actual website.
        const response = await next();
        const contentType = response.headers.get("content-type") || "";

        // Clone the response so we can modify the headers
        const secureResponse = new Response(response.body, response);
        
        // 🚨 CONTINUOUS PRESENCE TIMEOUT: Refresh the cookie for only 15 SECONDS.
        secureResponse.headers.append(
            'Set-Cookie', 
            '__Host-lablazy_auth=verified_session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=15'
        );

        // ANTI-BACK-BUTTON CACHE DEFEATER (Strict Anti-BFCache) & REAL-TIME AUTH SYNC
        if (contentType.includes("text/html")) {
            secureResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
            secureResponse.headers.set('Pragma', 'no-cache');
            secureResponse.headers.set('Expires', '0');
            secureResponse.headers.set('Surrogate-Control', 'no-store');
            
            return new HTMLRewriter().on('head', {
                element(element) {
                    element.append(`<script>
                        // 1. Cross-Tab Auth Synchronization (Zero Network Overhead)
                        try {
                            window.lablazyAuthChannel = new BroadcastChannel('lablazy_auth_sync');
                            window.lablazyAuthChannel.onmessage = function(e) {
                                if (e.data === 'LOCK_TRIGGERED' || e.data === 'LOGOUT') {
                                    window.location.replace('/');
                                }
                            };
                        } catch(err) {}

                        // 2. Prevent visual snapshot leakage in bfcache when navigating back/forward
                        window.addEventListener('pagehide', function() {
                            document.documentElement.style.display = 'none';
                        });
                        window.addEventListener('pageshow', function(event) {
                            if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
                                window.location.replace(window.location.href);
                            }
                        });

                        // 3. Event-driven session check when switching back to tab
                        document.addEventListener('visibilitychange', function() {
                            if (document.visibilityState === 'visible') {
                                fetch('/heartbeat', { method: 'POST', cache: 'no-store' })
                                    .then(function(res) {
                                        if (res.status === 401 || res.status === 302) { window.location.replace('/'); }
                                    }).catch(function() {});
                            }
                        });

                        // 4. Presence heartbeat ping every 4 seconds for continuous active presence
                        setInterval(function() {
                            fetch('/heartbeat', { method: 'POST', cache: 'no-store' })
                                .then(function(res) { 
                                    if (res.status === 401 || res.status === 302) { window.location.replace('/'); }
                                })
                                .catch(function() {});
                        }, 4000);
                    </script>`, { html: true });
                }
            }).transform(secureResponse);
        }

        return secureResponse; 
    }

    // 3. PROCESS LOGIN FORM SUBMISSION
    if (request.method === 'POST' && request.headers.get('content-type')?.includes('form')) {
        try {
            const formData = await request.formData();
            
            if (formData.has('is_totp_login')) {
                // Anti-Brute-Force: Introduce a deliberate 500ms delay to deter rapid automated guessing
                await new Promise(resolve => setTimeout(resolve, 500));

                const authCode = formData.get('password')?.trim();
                const isValid = await verifyTOTP(authCode, TOTP_SECRET);

                if (isValid) {
                    return new Response('Authenticating...', {
                        status: 302,
                        headers: {
                            'Location': url.pathname,
                            // Setting a 15-second window. The frontend heartbeat will keep this alive.
                            // Closing the tab kills the heartbeat, securely locking the vault.
                            'Set-Cookie': '__Host-lablazy_auth=verified_session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=15'
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
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;"
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
        Reflect.set(keyBytes, i, parseInt(bits.substring(i * 8, i * 8 + 8), 2));
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
        
        const offset = Reflect.get(hmac, hmac.length - 1) & 0x0f;
        const code = (((Reflect.get(hmac, offset) & 0x7f) << 24) | 
                      ((Reflect.get(hmac, offset + 1) & 0xff) << 16) | 
                      ((Reflect.get(hmac, offset + 2) & 0xff) << 8) | 
                      (Reflect.get(hmac, offset + 3) & 0xff)) % 1000000;
        
        const expectedToken = code.toString().padStart(6, '0');
        
        if (constantTimeCompare(expectedToken, token)) {
            return true;
        }
    }
    return false;
}

// --- HELPER: HTML Sanitizer ---
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function(m) {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#039;';
            default: return m;
        }
    });
}

// --- HTML UI ---
function getLoginHtml(errorMsg = '') {
    const bgText = "lablazy &nbsp; ".repeat(600);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lablazy - Secure Vault</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Inter', -apple-system, sans-serif; overflow: hidden; }
        .lablazy-bg { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; opacity: 0.04; pointer-events: none; user-select: none; z-index: 0; font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; font-weight: bold; color: white; transform: rotate(-15deg); line-height: 1.5; word-break: break-all; }
        .glass-card { position: relative; z-index: 1; background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; padding: 2.5rem 1.75rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 440px; width: 92%; color: white; }

        /* ---------- OTP COMPONENT STYLES ---------- */
        .foc-root{
          --foc-blue: 74,157,253;
          --foc-green: 74,214,142;
          --foc-red: 255,99,110;
          --foc-fg: 238,242,249;
          --foc-ease: cubic-bezier(.2,.85,.25,1);
          box-sizing: border-box;
          font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
          color: rgba(var(--foc-fg),0.92);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          width: 100%;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        .foc-root *{ box-sizing: border-box; }

        /* head */
        .foc-head{
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .foc-eyebrow{
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 650;
          color: rgba(var(--foc-fg),0.5);
        }
        .foc-title{
          margin: 0;
          font-size: 20px;
          font-weight: 640;
          letter-spacing: -0.012em;
          color: rgba(var(--foc-fg),0.96);
          font-family: 'Space Grotesk', sans-serif;
        }
        .foc-sub{
          margin: 0;
          max-width: 300px;
          font-size: 13px;
          line-height: 1.45;
          color: rgba(var(--foc-fg),0.6);
        }

        /* form */
        .foc-form{
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin: 0;
          width: 100%;
        }

        /* boxes row */
        .foc-boxes{
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 4px;
        }
        .foc-divider{
          width: 12px;
          height: 2px;
          border-radius: 2px;
          background: rgba(var(--foc-fg),0.2);
          flex: 0 0 auto;
        }

        .foc-box{
          position: relative;
          z-index: 1;
          width: 50px;
          height: 62px;
          flex: 0 0 auto;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018));
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 7px 18px rgba(0,0,0,0.30);
          transition:
            border-color .28s var(--foc-ease),
            transform .34s var(--foc-ease),
            box-shadow .32s var(--foc-ease),
            background .32s var(--foc-ease);
        }

        .foc-input{
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: transparent;
          border: 0;
          outline: 0;
          text-align: center;
          font-family: ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace;
          font-size: 26px;
          font-weight: 600;
          color: rgba(var(--foc-fg),0.96);
          caret-color: rgb(var(--foc-blue));
          border-radius: 16px;
          transition: color .22s var(--foc-ease);
        }
        .foc-input::selection{ background: rgba(var(--foc-blue),0.35); }

        /* custom caret (idle demo only, real caret takes over on focus) */
        .foc-caret{
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: 26px;
          margin: -13px 0 0 -1px;
          border-radius: 2px;
          background: rgb(var(--foc-blue));
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }
        .foc-box--active:not(.foc-box--filled):not(:focus-within) .foc-caret{
          opacity: 1;
          animation: foc-blink 1.05s steps(1, end) infinite;
        }

        /* filled */
        .foc-box--filled{
          border-color: rgba(255,255,255,0.17);
          background: linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.028));
        }

        /* active + real focus */
        .foc-box--active,
        .foc-box:focus-within{
          border-color: rgba(var(--foc-blue),0.78);
          transform: translateY(-2px);
          background: linear-gradient(180deg, rgba(var(--foc-blue),0.15), rgba(var(--foc-blue),0.03));
          box-shadow:
            0 0 0 1px rgba(var(--foc-blue),0.45),
            0 0 24px rgba(var(--foc-blue),0.34),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .foc-box:has(.foc-input:focus-visible){
          box-shadow:
            0 0 0 2px rgba(var(--foc-blue),0.95),
            0 0 28px rgba(var(--foc-blue),0.42),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }

        /* check & cross icons */
        .foc-check,
        .foc-cross{
          position: absolute;
          inset: 0;
          z-index: 3;
          margin: auto;
          width: 24px;
          height: 24px;
          opacity: 0;
          transform: scale(0.4);
          pointer-events: none;
        }
        .foc-check{ color: rgb(var(--foc-green)); }
        .foc-cross{ color: rgb(var(--foc-red)); }

        .foc-check path,
        .foc-cross path{
          fill: none;
          stroke: currentColor;
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
        }

        /* success state (green + tick mark) */
        .foc-success .foc-box{
          border-color: rgba(var(--foc-green),0.55);
          background: linear-gradient(180deg, rgba(var(--foc-green),0.15), rgba(var(--foc-green),0.03));
          box-shadow: 0 0 0 1px rgba(var(--foc-green),0.35), 0 8px 24px rgba(var(--foc-green),0.25);
          transition: border-color .35s var(--foc-ease), background .35s var(--foc-ease), box-shadow .35s var(--foc-ease);
          transition-delay: calc(var(--foc-i,0) * 70ms);
        }
        .foc-success .foc-input{ color: transparent; }
        .foc-success .foc-check{
          opacity: 1;
          transform: scale(1);
          transition: opacity .3s var(--foc-ease), transform .42s cubic-bezier(.2,1.35,.3,1);
          transition-delay: calc(var(--foc-i,0) * 70ms);
        }
        .foc-success .foc-check path{
          stroke-dashoffset: 0;
          transition: stroke-dashoffset .42s var(--foc-ease);
          transition-delay: calc(var(--foc-i,0) * 70ms + 60ms);
        }

        /* incorrect state (red + cross mark) - IDENTICAL ANIMATION STRUCTURE */
        .foc-shake .foc-box{
          border-color: rgba(var(--foc-red),0.55);
          background: linear-gradient(180deg, rgba(var(--foc-red),0.15), rgba(var(--foc-red),0.03));
          box-shadow: 0 0 0 1px rgba(var(--foc-red),0.35), 0 8px 24px rgba(var(--foc-red),0.25);
          transition: border-color .35s var(--foc-ease), background .35s var(--foc-ease), box-shadow .35s var(--foc-ease);
          transition-delay: calc(var(--foc-i,0) * 70ms);
        }
        .foc-shake .foc-input{ color: transparent; }
        .foc-shake .foc-cross{
          opacity: 1;
          transform: scale(1);
          transition: opacity .3s var(--foc-ease), transform .42s cubic-bezier(.2,1.35,.3,1);
          transition-delay: calc(var(--foc-i,0) * 70ms);
        }
        .foc-shake .foc-cross path{
          stroke-dashoffset: 0;
          transition: stroke-dashoffset .42s var(--foc-ease);
          transition-delay: calc(var(--foc-i,0) * 70ms + 60ms);
        }

        /* ambient radial aura behind boxes */
        .foc-boxes::after{
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 320px;
          height: 160px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(var(--foc-green),0.22), rgba(var(--foc-green),0));
          opacity: 0;
          pointer-events: none;
          z-index: 0;
          transition: opacity .55s var(--foc-ease), background .35s var(--foc-ease);
        }
        .foc-success .foc-boxes::after{
          background: radial-gradient(closest-side, rgba(var(--foc-green),0.22), rgba(var(--foc-green),0));
          opacity: 1;
        }
        .foc-shake .foc-boxes::after{
          background: radial-gradient(closest-side, rgba(var(--foc-red),0.22), rgba(var(--foc-red),0));
          opacity: 1;
        }

        /* ripples */
        .foc-ripple{
          position: absolute;
          left: 50%;
          top: 50%;
          width: 56px;
          height: 56px;
          margin: -28px 0 0 -28px;
          border-radius: 50%;
          border: 2px solid rgba(var(--foc-green),0.55);
          opacity: 0;
          transform: scale(0.3);
          pointer-events: none;
          z-index: 0;
        }
        .foc-ripple--blue{ border-color: rgba(var(--foc-blue),0.42); }

        /* status */
        .foc-status{
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 500;
          color: rgba(var(--foc-fg),0.62);
          transition: color .3s var(--foc-ease);
        }
        .foc-status-dot{
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(var(--foc-fg),0.38);
          transition: background .3s var(--foc-ease), box-shadow .3s var(--foc-ease);
        }
        .foc-status--ok{ color: rgba(var(--foc-green),0.95); }
        .foc-status--ok .foc-status-dot{ background: rgb(var(--foc-green)); box-shadow: 0 0 10px rgba(var(--foc-green),0.7); }
        .foc-status--err{ color: rgba(var(--foc-red),0.95); }
        .foc-status--err .foc-status-dot{ background: rgb(var(--foc-red)); box-shadow: 0 0 10px rgba(var(--foc-red),0.7); }

        .foc-hint{
          margin: 0;
          font-size: 11px;
          color: rgba(var(--foc-fg),0.48);
        }

        @keyframes foc-blink{
          0%, 50%{ opacity: 1; }
          50.01%, 100%{ opacity: 0; }
        }

        /* ---------- MOTION (idle life, only when allowed) ---------- */
        @media (prefers-reduced-motion: no-preference){
          .foc-box--active{ animation: foc-breathe 2.6s ease-in-out infinite; }
          @keyframes foc-breathe{
            0%, 100%{
              box-shadow:
                0 0 0 1px rgba(var(--foc-blue),0.42),
                0 0 20px rgba(var(--foc-blue),0.26),
                inset 0 1px 0 rgba(255,255,255,0.07);
            }
            50%{
              box-shadow:
                0 0 0 1px rgba(var(--foc-blue),0.60),
                0 0 34px rgba(var(--foc-blue),0.48),
                inset 0 1px 0 rgba(255,255,255,0.07);
            }
          }

          .foc-box--tap .foc-input{ animation: foc-digit .34s cubic-bezier(.2,1.3,.3,1); }
          @keyframes foc-digit{
            0%{ transform: scale(.45); opacity: 0; }
            60%{ transform: scale(1.14); opacity: 1; }
            100%{ transform: scale(1); opacity: 1; }
          }

          .foc-success .foc-box{
            animation: foc-pop .5s cubic-bezier(.2,1.25,.3,1) both;
            animation-delay: calc(var(--foc-i,0) * 70ms);
          }
          @keyframes foc-pop{
            0%{ transform: translateY(0) scale(1); }
            42%{ transform: translateY(-4px) scale(1.06); }
            100%{ transform: translateY(0) scale(1); }
          }

          .foc-success .foc-ripple{ animation: foc-ripple 1s cubic-bezier(.2,.6,.15,1) .18s forwards; }
          .foc-success .foc-ripple--blue{ animation: foc-ripple-b 1.15s cubic-bezier(.2,.6,.15,1) .3s forwards; }
          @keyframes foc-ripple{
            0%{ opacity: .6; transform: scale(.3); }
            70%{ opacity: .14; }
            100%{ opacity: 0; transform: scale(3.2); }
          }
          @keyframes foc-ripple-b{
            0%{ opacity: .42; transform: scale(.4); }
            100%{ opacity: 0; transform: scale(5); }
          }

          .foc-shake .foc-boxes{ animation: foc-shake .52s cubic-bezier(.36,.07,.19,.97); }
          @keyframes foc-shake{
            10%{ transform: translateX(-7px); }
            22%{ transform: translateX(6px); }
            34%{ transform: translateX(-6px); }
            46%{ transform: translateX(5px); }
            58%{ transform: translateX(-4px); }
            70%{ transform: translateX(3px); }
            82%{ transform: translateX(-2px); }
            100%{ transform: translateX(0); }
          }
        }

        /* ---------- REDUCED MOTION (calm, still, premium) ---------- */
        @media (prefers-reduced-motion: reduce){
          .foc-box, .foc-check, .foc-check path, .foc-input, .foc-boxes::after, .foc-caret{
            transition-duration: .01ms !important;
            transition-delay: 0ms !important;
            animation: none !important;
          }
          .foc-box--active:not(.foc-box--filled):not(:focus-within) .foc-caret{ opacity: 1; }
          .foc-success .foc-check{ opacity: 1; transform: scale(1); }
          .foc-success .foc-check path{ stroke-dashoffset: 0; }
        }
    </style>
</head>
<body>
    <div class="lablazy-bg">__BG_TEXT__</div>
    <div class="glass-card">
        <div class="foc-root">
          <div class="foc-head">
            <span class="foc-eyebrow">Security check</span>
            <h2 class="foc-title">Lablazy Vault</h2>
          </div>

          <form class="foc-form" method="POST" action="" novalidate autocomplete="off">
            <input type="hidden" name="is_totp_login" value="true" />
            <input type="hidden" name="password" id="foc-password-hidden" />

            <div class="foc-boxes" role="group" aria-label="One-time code, 6 digits">
              <span class="foc-ripple" aria-hidden="true"></span>
              <span class="foc-ripple foc-ripple--blue" aria-hidden="true"></span>

              <div class="foc-box" style="--foc-i:0">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" spellcheck="false" aria-label="Digit 1 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
              <div class="foc-box" style="--foc-i:1">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" spellcheck="false" aria-label="Digit 2 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>

              <div class="foc-box" style="--foc-i:2">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" spellcheck="false" aria-label="Digit 3 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>

              <span class="foc-divider" aria-hidden="true"></span>

              <div class="foc-box" style="--foc-i:3">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" spellcheck="false" aria-label="Digit 4 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
              <div class="foc-box" style="--foc-i:4">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" spellcheck="false" aria-label="Digit 5 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
              <div class="foc-box" style="--foc-i:5">
                <span class="foc-caret" aria-hidden="true"></span>
                <input class="foc-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" spellcheck="false" aria-label="Digit 6 of 6" />
                <svg class="foc-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 6.7" /></svg>
                <svg class="foc-cross" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
            </div>

            <div class="foc-status" role="status" aria-live="polite">
              <span class="foc-status-dot" aria-hidden="true"></span>
              <span class="foc-status-text"></span>
            </div>
          </form>
        </div>
    </div>

    <script>
    (function () {
      var root = document.querySelector('.foc-root');
      if (!root) return;

      var INITIAL_ERROR = "__INITIAL_ERROR__";
      var hiddenInput = document.getElementById('foc-password-hidden');

      var inputs = [].slice.call(root.querySelectorAll('.foc-input'));
      var boxes = inputs.map(function (inp) { return inp.parentNode; });
      var N = inputs.length;
      if (!N) return;

      var statusEl = root.querySelector('.foc-status');
      var statusText = root.querySelector('.foc-status-text');
      var form = root.querySelector('.foc-form');

      /* ---------- helpers ---------- */
      function setStatus(text, state) {
        statusText.textContent = text;
        statusEl.className = 'foc-status' + (state ? ' foc-status--' + state : '');
      }
      function clearActive() {
        for (var i = 0; i < N; i++) boxes[i].classList.remove('foc-box--active');
      }
      function setActive(i) {
        clearActive();
        if (i >= 0 && i < N) boxes[i].classList.add('foc-box--active');
      }
      function popBox(i) {
        var b = boxes[i];
        b.classList.remove('foc-box--tap');
        void b.offsetWidth;
        b.classList.add('foc-box--tap');
      }
      function fillDigit(i, ch, pop) {
        inputs[i].value = ch;
        boxes[i].classList.add('foc-box--filled');
        if (pop) popBox(i);
      }
      function allFilled() {
        for (var i = 0; i < N; i++) if (inputs[i].value.length !== 1) return false;
        return true;
      }
      function getCombinedCode() {
        return inputs.map(function (inp) { return inp.value; }).join('');
      }
      function resetBoxes() {
        root.classList.remove('foc-success', 'foc-shake');
        clearActive();
        for (var i = 0; i < N; i++) {
          inputs[i].value = '';
          boxes[i].classList.remove('foc-box--filled', 'foc-box--tap');
        }
      }
      function success() {
        root.classList.remove('foc-shake');
        root.classList.add('foc-success');
        clearActive();
        for (var i = 0; i < N; i++) boxes[i].classList.add('foc-box--filled');
        setStatus('Code Verified! Access Granted.', 'ok');
      }

      function wrong(msg) {
        root.classList.remove('foc-success');
        root.classList.add('foc-shake');
        clearActive();
        for (var i = 0; i < N; i++) boxes[i].classList.add('foc-box--filled');
        setStatus(msg || 'Invalid Code. Access Denied.', 'err');
      }

      var isSubmitting = false;

      function submitCode() {
        if (!allFilled() || isSubmitting) return;
        isSubmitting = true;

        var code = getCombinedCode();
        if (hiddenInput) hiddenInput.value = code;

        // 1. Show neutral verification status FIRST (No green sweep yet!)
        root.classList.remove('foc-success', 'foc-shake');
        setStatus('Verifying code...', '');

        // 2. Send code to server for actual TOTP verification
        var formData = new FormData(form);
        fetch(window.location.href, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'text/html' }
        }).then(function(res) {
          isSubmitting = false;
          if (res.status === 200 || res.redirected) {
            // CODE IS CORRECT: Trigger green checkmark sweep animation & green text!
            success();
            setTimeout(function() {
              window.location.reload(true);
            }, 1200);
          } else {
            // CODE IS INCORRECT: Trigger red shake animation & red error text!
            wrong('Invalid Code. Access Denied.');
          }
        }).catch(function(err) {
          isSubmitting = false;
          form.submit();
        });
      }

      inputs.forEach(function (inp, idx) {
        inp.addEventListener('focus', function () {
          if (root.classList.contains('foc-shake')) {
            root.classList.remove('foc-shake');
            resetBoxes();
            setStatus('Enter the 6-digit code', '');
            setActive(0);
            inputs[0].focus();
          } else {
            setActive(idx);
          }
        });
        inp.addEventListener('blur', function () {
          boxes[idx].classList.remove('foc-box--active');
        });

        inp.addEventListener('input', function () {
          var v = inp.value.replace(/[^0-9]/g, '');
          inp.value = v.slice(-1);
          if (inp.value) {
            boxes[idx].classList.add('foc-box--filled');
            popBox(idx);
            if (idx < N - 1) {
              inputs[idx + 1].focus();
              try { inputs[idx + 1].select(); } catch (e) {}
            }
          } else {
            boxes[idx].classList.remove('foc-box--filled');
          }
          root.classList.remove('foc-shake');
          if (allFilled()) submitCode();
        });

        inp.addEventListener('keydown', function (e) {
          var k = e.key;
          if (k === 'Backspace') {
            if (!inp.value && idx > 0) {
              e.preventDefault();
              inputs[idx - 1].focus();
              inputs[idx - 1].value = '';
              boxes[idx - 1].classList.remove('foc-box--filled');
            } else if (inp.value) {
              inp.value = '';
              boxes[idx].classList.remove('foc-box--filled');
            }
            root.classList.remove('foc-success', 'foc-shake');
            setStatus('Enter the 6-digit code', '');
          } else if (k === 'ArrowLeft') {
            if (idx > 0) { e.preventDefault(); inputs[idx - 1].focus(); }
          } else if (k === 'ArrowRight') {
            if (idx < N - 1) { e.preventDefault(); inputs[idx + 1].focus(); }
          } else if (k === 'Home') {
            e.preventDefault(); inputs[0].focus();
          } else if (k === 'End') {
            e.preventDefault(); inputs[N - 1].focus();
          }
        });

        inp.addEventListener('paste', function (e) {
          e.preventDefault();
          var data = e.clipboardData || window.clipboardData;
          var text = data ? data.getData('text') : '';
          var digits = (text || '').replace(/[^0-9]/g, '').slice(0, N).split('');
          if (!digits.length) return;
          root.classList.remove('foc-success', 'foc-shake');
          for (var i = 0; i < N; i++) {
            if (digits[i]) {
              fillDigit(i, digits[i], true);
            } else {
              inputs[i].value = '';
              boxes[i].classList.remove('foc-box--filled');
            }
          }
          var next = Math.min(digits.length, N - 1);
          inputs[next].focus();
          if (allFilled()) submitCode();
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (allFilled()) submitCode();
      });

      // Check if arriving from a failed submission
      if (INITIAL_ERROR) {
        wrong(INITIAL_ERROR);
        setTimeout(function() {
          inputs[0].focus();
        }, 150);
      } else {
        setTimeout(function() {
          inputs[0].focus();
        }, 150);
      }

      // ==========================================
      // REAL-TIME AUTO-UNPANIC LOCK DETECTION
      // When Panic Mode is disabled, automatically reload to main website
      // ==========================================
      (function initUnpanicDetector() {
        try {
          var authChannel = new BroadcastChannel('lablazy_auth_sync');
          authChannel.onmessage = function(e) {
            if (e.data === 'UNPANIC_UNLOCK' || e.data === 'PANIC_DISABLED') {
              window.location.reload(true);
            }
          };
        } catch(e) {}

        try {
          var wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
          var wsHost = 'lablazy-signaling-server.onrender.com';
          var socket = new WebSocket(wsProtocol + wsHost + '/ws');
          socket.onmessage = function(event) {
            try {
              var payload = JSON.parse(event.data);
              if (payload && (payload.action === 'unpanic' || payload.type === 'UNPANIC_UNLOCK')) {
                try { if (window.lablazyAuthChannel) window.lablazyAuthChannel.postMessage('UNPANIC_UNLOCK'); } catch(e) {}
                window.location.reload(true);
              }
            } catch(e) {}
          };
        } catch(e) {}

        setInterval(function() {
          fetch(window.location.pathname + '?unpanic_check=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
            .then(function(res) {
              if (res.status === 200) {
                try { if (window.lablazyAuthChannel) window.lablazyAuthChannel.postMessage('UNPANIC_UNLOCK'); } catch(e) {}
                window.location.reload(true);
              }
            })
            .catch(function() {});
        }, 3000);
      })();
    })();
    </script>
</body>
</html>`;

    return html
        .replace('__BG_TEXT__', bgText)
        .replace('__INITIAL_ERROR__', escapeHtml(errorMsg));
}
