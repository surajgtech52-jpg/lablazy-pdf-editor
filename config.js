const AppConfig = {
    SIGNALING_HOST: 'lablazy-signaling-server.onrender.com',
    FORCE_LOCAL: false,
    
    // Custom PeerJS Broker configurations (null to default to PeerJS cloud)
    PEERJS_CONFIG: null,

    // Exclusively gather relay candidates (TURN servers) to prevent exposing local private IP addresses.
    // Enabled (true) to skip local network discovery timeouts on college Wi-Fi and use ExpressTURN immediately.
    SECURE_P2P_MODE: true,

    // Dynamic ICE configuration (STUN/TURN list).
    ICE_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: 'turn:free.expressturn.com:3478',
            username: '000000002100014260',
            credential: 'MdgefPcXLLCe0lwx0c+MZDssGDk='
        },
        {
            urls: 'turn:free.expressturn.com:3478?transport=tcp',
            username: '000000002100014260',
            credential: 'MdgefPcXLLCe0lwx0c+MZDssGDk='
        }
    ]
};
