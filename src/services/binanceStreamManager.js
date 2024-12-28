const Binance = require('binance-api-node').default;
const EventEmitter = require('events');
const config = require('../config/binance');

class BinanceStreamManager extends EventEmitter {
  constructor() {
    super();
    this.client = Binance();
    this.streams = new Map();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  async connect(symbols) {
    if (this.isConnecting) {
      console.log('Connection attempt already in progress...');
      return;
    }

    this.isConnecting = true;

    try {
      console.log('Connecting to Binance streams...');
      
      // Close existing streams if any
      await this.closeAllStreams();
      
      // Split symbols into chunks to avoid connection overload
      const symbolChunks = this.chunkArray(symbols, 50);
      
      for (const chunk of symbolChunks) {
        await this.connectChunk(chunk);
      }
      
      this.reconnectAttempts = 0;
      console.log('Successfully connected to all Binance streams');
    } catch (error) {
      console.error('Failed to connect to Binance streams:', error);
      this.handleReconnect(symbols);
    } finally {
      this.isConnecting = false;
    }
  }

  async connectChunk(symbols) {
    return new Promise((resolve) => {
      const stream = this.client.ws.trades(symbols, trade => {
        this.emit('trade', trade);
      });
      
      this.streams.set(symbols.join(','), stream);
      resolve();
    });
  }

  async closeAllStreams() {
    const closePromises = [];
    
    for (const [key, stream] of this.streams.entries()) {
      if (stream && typeof stream.close === 'function') {
        closePromises.push(
          new Promise(resolve => {
            try {
              stream.close();
              console.log(`Closed stream: ${key}`);
            } catch (error) {
              console.error(`Error closing stream ${key}:`, error);
            }
            resolve();
          })
        );
      }
    }
    
    await Promise.all(closePromises);
    this.streams.clear();
  }

  handleReconnect(symbols) {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= config.maxReconnectAttempts) {
      console.log(`Reconnect attempt ${this.reconnectAttempts} of ${config.maxReconnectAttempts}`);
      setTimeout(() => this.connect(symbols), config.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = new BinanceStreamManager();