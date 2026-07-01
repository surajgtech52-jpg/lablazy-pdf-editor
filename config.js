const AppConfig = {
    SIGNALING_HOST: 'lablazy-signaling-server.onrender.com',
    FORCE_LOCAL: false,
    
    // Custom PeerJS Broker configurations (null to default to PeerJS cloud)
    PEERJS_CONFIG: null,

    // Exclusively gather relay candidates (TURN servers) to prevent exposing local private IP addresses
    SECURE_P2P_MODE: false,

    // Dynamic ICE configuration (STUN/TURN list). Will default to the built-in list if null or empty.
    ICE_SERVERS: null
};
