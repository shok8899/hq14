const config = {
  // Binance connection settings
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
  // WebSocket settings
  wsOptions: {
    // Increase timeout values
    handshakeTimeout: 15000,
    // Enable keep-alive
    keepAlive: true,
    keepAliveInterval: 30000
  }
};

module.exports = config;