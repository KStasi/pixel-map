/**
 * WebSocket server for Viper Duel Snake game
 */

import { createWebSocketServer, sendError, startPingInterval } from './config/websocket.js';
import { initializeRPCClient, createRoomManager } from './services/index.js';
import { handleJoinRoom, handleGetAvailableRooms, handleBuyPixels } from './routes/roomRoutes.js';
import { handleStartGame, handleDirectionChange } from './routes/gameRoutes.js';
import { addAppSessionSignature, createAppSessionWithSignatures, getPendingAppSessionMessage } from './services/index.js';
import logger from './utils/logger.js';
import { db }  from './config/db.js';
import { pixelDataTable } from './db/schema.js';
import { migrate } from 'drizzle-orm/pglite/migrator';

// Create WebSocket server
const wss = createWebSocketServer();
const roomManager = createRoomManager();

// Track active connections
// TODO: Use @erc7824/nitrolite for connection tracking when available
const connections = new Map();

// Track online users count
let onlineUsersCount = 0;

async function prepareDatabase() {
  logger.system('Preparing database...');
  await migrate(db, {
    migrationsFolder: 'drizzle',
  });
  // Ensure pixel data table exists and has enough entries
  for (const id of Array(3030).keys()) {
    await db.insert(pixelDataTable).values({
      id: id + 1, // IDs are 1-based in the table
    }).onConflictDoNothing();
  }
}

/**
 * Handles app session signature submission
 */
async function handleAppSessionSignature(ws, payload, { roomManager, connections, sendError }) {
  if (!payload || typeof payload !== 'object') {
    return sendError(ws, 'INVALID_PAYLOAD', 'Invalid payload format');
  }

  const { roomId, signature } = payload;

  if (!roomId || !signature) {
    return sendError(ws, 'INVALID_PAYLOAD', 'Room ID and signature are required');
  }

  // Find the player submitting the signature
  let playerEoa = null;
  for (const [eoa, connection] of connections.entries()) {
    if (connection.ws === ws) {
      playerEoa = eoa;
      break;
    }
  }

  if (!playerEoa) {
    return sendError(ws, 'NOT_AUTHENTICATED', 'Player not authenticated');
  }

  try {
    const allSignaturesCollected = await addAppSessionSignature(roomId, playerEoa, signature);
    
    logger.nitro(`Signature added for ${playerEoa} in room ${roomId}`);
    
    // Send confirmation to the signing player
    ws.send(JSON.stringify({
      type: 'appSession:signatureConfirmed',
      roomId
    }));

    // Check if this was participant B (guest) signing, and if so, request signature from participant A (host)
    const room = roomManager.rooms.get(roomId);
    if (room && playerEoa === room.players.guest && !allSignaturesCollected) {
      logger.nitro(`Participant B signed, now requesting signature from participant A (host)`);
      
      // Send signature request to participant A (host)
      const hostConnection = room.connections.get(room.players.host);
      if (hostConnection && hostConnection.ws.readyState === 1) {
        // Get the existing pending app session message (don't generate a new one!)
        const appSessionMessage = getPendingAppSessionMessage(roomId);
        
        if (!appSessionMessage) {
          logger.error(`No pending app session found for room ${roomId}`);
          return;
        }
        
        hostConnection.ws.send(JSON.stringify({
          type: 'appSession:startGameRequest',
          roomId,
          appSessionData: appSessionMessage.appSessionData,
          appDefinition: appSessionMessage.appDefinition,
          participants: appSessionMessage.participants,
          requestToSign: appSessionMessage.requestToSign
        }));
        
        logger.nitro(`Sent start game request to host ${room.players.host}`);
      } else {
        logger.error(`Host connection not found or not ready for room ${roomId}`);
      }
    }
    
    // If all signatures are collected, create the app session (this happens after participant A signs)
    if (allSignaturesCollected) {
      logger.nitro(`All signatures collected for room ${roomId}, creating app session`);
      // The app session creation will be handled by the handleAppSessionStartGame function
    }
    
  } catch (error) {
    logger.error(`Error handling app session signature for room ${roomId}:`, error);
    return sendError(ws, 'SIGNATURE_ERROR', error.message);
  }
}

/**
 * Handles app session start game request (with host signature)
 */
async function handleAppSessionStartGame(ws, payload, { roomManager, connections, sendError }) {
  if (!payload || typeof payload !== 'object') {
    return sendError(ws, 'INVALID_PAYLOAD', 'Invalid payload format');
  }

  const { roomId, signature } = payload;

  if (!roomId || !signature) {
    return sendError(ws, 'INVALID_PAYLOAD', 'Room ID and signature are required');
  }

  // Find the player submitting the signature (should be host)
  let playerEoa = null;
  for (const [eoa, connection] of connections.entries()) {
    if (connection.ws === ws) {
      playerEoa = eoa;
      break;
    }
  }

  if (!playerEoa) {
    return sendError(ws, 'NOT_AUTHENTICATED', 'Player not authenticated');
  }

  // Get the room
  const room = roomManager.rooms.get(roomId);
  if (!room) {
    return sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
  }

  // Only the host can start the game
  if (room.players.host !== playerEoa) {
    return sendError(ws, 'NOT_AUTHORIZED', 'Only the host can start the game');
  }

  try {
    // Add the host's signature
    const allSignaturesCollected = await addAppSessionSignature(roomId, playerEoa, signature);
    
    if (!allSignaturesCollected) {
      return sendError(ws, 'SIGNATURES_INCOMPLETE', 'Not all signatures collected');
    }

    logger.nitro(`Host signature added for room ${roomId}, creating app session`);
    
    // Create the app session with all collected signatures
    const appId = await createAppSessionWithSignatures(roomId);
    
    // Store the app ID in the room object
    room.appId = appId;
    
    // Initialize game state
    if (!room.gameState) {
      const { createGame } = await import('./services/index.js');
      room.gameState = createGame(room.players.host, room.players.guest);
    }

    // Broadcast game started
    roomManager.broadcastToRoom(
      roomId,
      'game:started',
      { roomId, appId }
    );

    // Start the automatic movement game loop
    console.log(`🚀 Starting automatic movement game loop for room ${roomId} (app session flow)`);
    const { startGameLoop } = await import('./routes/gameRoutes.js');
    startGameLoop(roomId, roomManager);

    // Send the initial game state
    const { formatGameState } = await import('./services/index.js');
    roomManager.broadcastToRoom(
      roomId, 
      'room:state', 
      formatGameState(room.gameState, roomId, room.betAmount)
    );
    
  } catch (error) {
    logger.error(`Error handling app session start game for room ${roomId}:`, error);
    return sendError(ws, 'START_GAME_ERROR', error.message);
  }
}

// Function to broadcast online users count to all clients
const broadcastOnlineUsersCount = () => {
  const message = JSON.stringify({
    type: 'onlineUsers',
    count: onlineUsersCount
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
  
  logger.ws(`Broadcasting online users count: ${onlineUsersCount}`);
};

// Create context object to share between route handlers
const context = {
  roomManager,
  connections,
  db,
  sendError: (ws, code, msg) => sendError(ws, code, msg)
};

wss.on('connection', (ws) => {
  logger.ws('Client connected');
  
  // Increment online users count and broadcast to all clients
  onlineUsersCount++;
  broadcastOnlineUsersCount();
  
  // Handle client messages
  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    // Process message based on type
    try {
      switch (data.type) {
        case 'appSession:signature':
          await handleAppSessionSignature(ws, data.payload, context);
          break;
        case 'appSession:startGame':
          await handleAppSessionStartGame(ws, data.payload, context);
          break;
        case 'pixel:prices':
          await handleGetPrices(ws, context);
          break;
        case 'map:state':
          await handleGetMap(ws, context);
          break;
        case 'appSession:buyPixels':
        // Import the buyPixels handler dynamically to avoid circular dependencies
          await handleBuyPixels(ws, data.payload, context);
          break;
        default:
          sendError(ws, 'INVALID_MESSAGE_TYPE', 'Invalid message type');
      }
    } catch (error) {
      logger.error(`Error handling message type ${data.type}:`, error);
      sendError(ws, 'INTERNAL_ERROR', 'An internal error occurred');
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    // Find and remove the player from any room
    for (const [eoa, connection] of connections.entries()) {
      if (connection.ws === ws) {
        const result = roomManager.leaveRoom(eoa);
        if (result.success && result.roomId) {
          roomManager.broadcastToRoom(result.roomId, 'room:state', {
            roomId: result.roomId,
            // Send updated room state here
          });
        }
        connections.delete(eoa);
        break;
      }
    }
    
    // Decrement online users count and broadcast to all clients
    onlineUsersCount = Math.max(0, onlineUsersCount - 1);
    broadcastOnlineUsersCount();
    
    logger.ws('Client disconnected');
  });
});

async function calculatePixelPrice(pixelData) {
  logger.info(
    `🔍 Calculating price for pixel ID: ${pixelData.id} with color ${pixelData.color}`
  );
  const { last_bought, last_price } = (
    await db
      .select({
        last_bought: pixelDataTable.last_bought,
        last_price: pixelDataTable.last_price,
      })
      .from(pixelDataTable)
      .where(eq(pixelDataTable.id, pixelData.id))
      .limit(1)
  )[0];
  const currentTime = Date.now();
  if (!last_bought || !last_price) {
    logger.info(
      `💰 No previous price found, using default price: ${defaultPixelPrice}`
    );
    return defaultPixelPrice; // Default price if no previous data exists
  }
  const timeElapsed = currentTime - new Date(last_bought).getTime();
  const priceDecayFactor = Math.max(0, 1 - timeElapsed / 60000); // Decay over minutes
  const newPrice = defaultPixelPrice > last_price * 2n - last_price * BigInt(priceDecayFactor) ? defaultPixelPrice : last_price * 2n - last_price * BigInt(priceDecayFactor);
  logger.info(`💰 Calculated price: ${newPrice}`);
  return newPrice;
}

async function handleGetPrices(ws, { db, sendError }) {
  try {
    const prices = await db.select().from(pixelDataTable);
    ws.send(JSON.stringify({
      type: 'pixel:prices',
      payload: await Promise.all(prices.map(async (pixelData) => {
        const price = await calculatePixelPrice(pixelData);
        return {
          id: pixelData.id,
          price
        };
      }))
    }));
  } catch (error) {
    logger.error('Error fetching prices:', error);
    sendError(ws, 'FETCH_PRICES_ERROR', 'Failed to fetch prices');
  }
}

async function handleGetMap(ws, { db, sendError }) {
  try {
    const pixels = await db.select().from(pixelDataTable);
    ws.send(JSON.stringify({
      type: 'map:state',
      payload: pixels
    }));
  } catch (error) {
    logger.error('Error fetching prices:', error);
    sendError(ws, 'FETCH_PRICES_ERROR', 'Failed to fetch prices');
  }
}
// Initialize Nitrolite client and channel when server starts
async function initializeNitroliteServices() {
  try {
    logger.nitro('Initializing Nitrolite services...');
    const rpcClient = await initializeRPCClient();
    logger.nitro('Nitrolite RPC client initialized successfully');
    
    // Check if we have an existing channel
    if (rpcClient.channel) {
      logger.nitro('Connected to existing channel');
      logger.data('Channel info', rpcClient.channel);
    } else {
      logger.warn('No channel established after initialization');
      logger.nitro('Channels will be created as needed via getChannelInfo');
    }
  } catch (error) {
    logger.error('Failed to initialize Nitrolite services:', error);
    logger.system('Continuing in mock mode without Nitrolite channel');
  }
}

// Start server
const port = process.env.PORT || 8080;
logger.system(`WebSocket server starting on port ${port}`);

prepareDatabase().then(() => {
  logger.system('Database migration complete');
}).catch(error => {
  logger.error('Database migration failed:', error);
});

// Initialize Nitrolite client and channel
initializeNitroliteServices().then(() => {
  logger.system('Server initialization complete');
}).catch(error => {
  logger.error('Server initialization failed:', error);
});

// Start keepalive mechanism
startPingInterval(wss);

// Broadcast online users count periodically to ensure all clients have the latest count
setInterval(() => {
  broadcastOnlineUsersCount();
}, 30000);