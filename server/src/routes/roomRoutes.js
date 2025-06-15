/**
 * Room-related WebSocket message handlers
 */

import { validateJoinRoomPayload } from '../utils/validators.js';
import { closeAppSession, formatGameState, generateAppSessionMessage, addAppSessionSignature, createAppSession, createAppSessionWithSignatures, getPendingAppSessionMessage } from '../services/index.js';
import logger from '../utils/logger.js';
import { pixelDataTable, userSpendingTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Handles a request to join a room
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - Request payload
 * @param {Object} context - Application context containing roomManager and connections
 */
export async function handleJoinRoom(ws, payload, { roomManager, connections, sendError }) {
  // Validate payload
  const validation = validateJoinRoomPayload(payload);
  if (!validation.success) {
    return sendError(ws, 'INVALID_PAYLOAD', validation.error);
  }

  const { roomId, eoa, betAmount = 0 } = payload;
  console.log(`Processing ${validation.isCreating ? 'CREATE' : 'JOIN'} request for EOA: ${eoa}, roomId: ${roomId || 'NEW'}, betAmount: ${betAmount}`);

  // Validate bet amount
  const validBetAmounts = [0, 0.01, 0.1, 1, 2];
  if (!validBetAmounts.includes(betAmount)) {
    return sendError(ws, 'INVALID_BET_AMOUNT', 'Invalid bet amount. Must be 0, 0.01, 0.1, 1, or 2');
  }

  // Check if address is already connected
  if (connections.has(eoa)) {
    return sendError(ws, 'ALREADY_CONNECTED', 'Address already connected');
  }

  let result;
  if (validation.isCreating) {
    // Creating a new room
    const newRoomId = roomManager.createRoom(betAmount);
    console.log(`Created new room with ID: ${newRoomId}, bet amount: ${betAmount}`);
    
    // Join the newly created room as host
    result = roomManager.joinRoom(newRoomId, eoa, ws, betAmount);
    
    if (result.success) {
      console.log(`New room created: ${newRoomId} for player (host): ${eoa}`);
      
      // Send room ID to client immediately so they can share it
      ws.send(JSON.stringify({
        type: 'room:created',
        roomId: newRoomId,
        role: 'host'
      }));
    }
  } else {
    // Joining an existing room
    result = roomManager.joinRoom(roomId, eoa, ws, betAmount);
    
    if (result.success) {
      console.log(`Player ${eoa} joined room: ${roomId} as ${result.role}`);
    }
  }
  
  if (!result.success) {
    return sendError(ws, 'JOIN_FAILED', result.error);
  }

  // Store connection
  connections.set(eoa, { ws, roomId: result.roomId });

  // Get room
  const room = roomManager.rooms.get(result.roomId);

  // Send room state to all players
  if (room.gameState) {
    roomManager.broadcastToRoom(
      result.roomId, 
      'room:state', 
      formatGameState(room.gameState, result.roomId, room.betAmount)
    );
  }

  // Notify all players that room is ready if applicable
  if (result.isRoomReady) {
    roomManager.broadcastToRoom(result.roomId, 'room:ready', { roomId: result.roomId });
    
    logger.nitro(`Room ${result.roomId} is ready - starting signature collection flow`);
    logger.data(`Room players:`, { host: room.players.host, guest: room.players.guest });
    
    // Generate app session message for signature collection when room becomes ready (both players joined)
    try {
      const appSessionMessage = await generateAppSessionMessage(
        result.roomId, 
        room.players.host, 
        room.players.guest,
        room.betAmount
      );
      
      logger.nitro(`Generated app session message for room ${result.roomId}`);
      
      // Send the message to participant B (guest) for signature
      const guestConnection = room.connections.get(room.players.guest);
      if (guestConnection && guestConnection.ws.readyState === 1) {
        guestConnection.ws.send(JSON.stringify({
          type: 'appSession:signatureRequest',
          roomId: result.roomId,
          appSessionData: appSessionMessage.appSessionData,
          appDefinition: appSessionMessage.appDefinition,
          participants: appSessionMessage.participants,
          requestToSign: appSessionMessage.requestToSign
        }));
      }
      
    } catch (error) {
      logger.error(`Failed to generate app session message for room ${result.roomId}:`, error);
    }
  }
}

/**
 * Handles a request to get available rooms
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} context - Application context containing roomManager
 */
export async function handleGetAvailableRooms(ws, { roomManager }) {
  // Filter rooms that are not full
  const availableRooms = [];
  
  // Get current timestamp
  const now = Date.now();
  
  // Iterate through all rooms and find available ones
  for (const [roomId, room] of roomManager.rooms.entries()) {
    // Room is available if it has a host but no guest, and game is not started
    if (room.players.host && !room.players.guest && !room.gameState) {
      availableRooms.push({
        roomId,
        hostAddress: room.players.host,
        createdAt: room.createdAt || now, // Use tracked creation time or fall back to now
        betAmount: room.betAmount || 0
      });
    }
  }
  
  // Send available rooms to client
  ws.send(JSON.stringify({
    type: 'room:available',
    rooms: availableRooms
  }));
}

export async function handleBuyPixels(ws, payload, { roomManager, connections, db, sendError }) {
  const { pixelsToBuy, signature, eoa, totalPrice } = payload || {};

  console.log(`🛒 handleBuyPixels called with payload:`, payload);

  // Find the player submitting the signature
  let playerEoa = eoa;

  if (!playerEoa) {
    return sendError(ws, 'NOT_AUTHENTICATED', 'Player not authenticated');
  }

  if (!pixelsToBuy || !Array.isArray(pixelsToBuy) || pixelsToBuy.length === 0) {
    return sendError(ws, 'NO_PIXELS', 'No pixels to buy.');
  }
  if (!signature || typeof signature !== 'string') {
    return sendError(ws, 'INVALID_SIGNATURE', 'Invalid signature.');
  }
  const room = roomManager.createRoom(totalPrice)
  roomManager.joinRoom(room.roomId, playerEoa, ws, totalPrice);
  const allSignaturesCollected = await addAppSessionSignature(room.roomId, playerEoa, signature);
      
  logger.nitro(`Signature added for ${playerEoa} in room ${room.roomId}`);
  
  // Send confirmation to the signing player
  ws.send(JSON.stringify({
    type: 'appSession:signatureConfirmed',
    roomId: room.roomId
  }));
  if (allSignaturesCollected) {
    // Create an app session for this game if not already created
    if (!hasAppSession(room.roomId)) {
        try {
          logger.nitro(`Creating app session for room ${room.roomId}`);
          const appId = await createAppSessionWithSignatures(room.roomId);
          logger.nitro(`App session created with ID ${appId}`);
          // Store the app ID in the room object
          room.appId = appId;
        } catch (error) {
          logger.error(`Failed to create app session for room ${room.roomId}:`, error);
          // Continue with the game even if app session creation fails
          // This allows the game to work in a fallback mode
        }
    }
    await closeAppSession(room.roomId, ['0', room.betAmount])
    const userSpending = await db.select()
      .from(userSpendingTable).where(eq(userSpendingTable.user_id, playerEoa))[0];
    if (userSpending) {
      await db.update(userSpendingTable)
        .set({ total_spent: userSpending.total_spent + BigInt(totalPrice) })
        .where(eq(userSpendingTable.user_id, playerEoa));
    }
    else {
      await db.insert(userSpendingTable).values({
        user_id: playerEoa,
        total_spent: BigInt(totalPrice)
      });
    }
    for (const pixel of pixelsToBuy) {
      await db.update(pixelDataTable).set({
        owner: playerEoa,
        last_bought: new Date(),
        last_price: BigInt(pixel.price),
        color: pixel.color
      }).where(eq(pixelDataTable.id, pixel.id));
    }
    const pixels = await db.select().from(pixelDataTable);
    for (const connection of connections) {
      connection.ws.send(JSON.stringify({
        type: 'map:state',
        pixels
      }));
     }
  }
}