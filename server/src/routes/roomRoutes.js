/**
 * Room-related WebSocket message handlers
 */
import { createCloseAppSessionMessage } from "@erc7824/nitrolite";
import { ethers } from 'ethers';
import { validateJoinRoomPayload } from '../utils/validators.js';
import { closeAppSession, formatGameState, generateAppSessionMessage, addAppSessionSignature, createAppSession, createAppSessionWithSignatures, getPendingAppSessionMessage } from '../services/index.js';
import logger from '../utils/logger.js';
import { pixelDataTable, userSpendingTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getRPCClient } from '../services/nitroliteRPC.js';

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
  const { pixels: pixelsToBuy, signature, eoa, totalPrice, requestToSign } = payload || {};

  console.log(`🛒 handleBuyPixels called with payload:`, payload);

  // Find the player submitting the signature
  let playerEoa = eoa;

  if (!playerEoa) {
    logger.error('No EOA provided in payload');
    return sendError(ws, 'NOT_AUTHENTICATED', 'Player not authenticated');
  }

  if (!pixelsToBuy || !Array.isArray(pixelsToBuy) || pixelsToBuy.length === 0) {
    logger.error('No pixels to buy in payload');
    return sendError(ws, 'NO_PIXELS', 'No pixels to buy.');
  }
  const roomId = roomManager.createRoom(totalPrice)
  roomManager.joinRoom(roomId, playerEoa, ws, totalPrice);
  // Get the RPC client
  const rpcClient = await getRPCClient();
  if (!rpcClient) {
    throw new Error('RPC client not initialized');
  }
  // Now let the server sign the same request structure as the clients
  logger.data(`Request to sign:`, requestToSign);
  const sign = rpcClient.signMessage.bind(rpcClient);
  const servSignature = await sign(requestToSign);
  logger.data(`Server signature created:`, servSignature);
  const allSignatures = [signature[0], servSignature];
  const finalMessage = {
    req: requestToSign,
    sig: allSignatures,
  }

  logger.data(`Final message to send:`, finalMessage);

  const appSessionResponsePromise = new Promise((resolve, reject) => {
    const handleAppSessionResponse = (data) => {
      try {
        const rawData = typeof data === 'string' ? data : data.toString();
        const message = JSON.parse(rawData);

        logger.data(`Received app session creation response:`, message);

        if (message.res && (message.res[1] === 'create_app_session' ||
          message.res[1] === 'app_session_created')) {
          rpcClient.ws.removeListener('message', handleAppSessionResponse);
          resolve(message.res[2]);
        }

        if (message.err) {
          rpcClient.ws.removeListener('message', handleAppSessionResponse);
          reject(new Error(`Error ${message.err[1]}: ${message.err[2]}`));
        }
      } catch (error) {
        logger.error('Error handling app session response:', error);
      }
    };

    rpcClient.ws.on('message', handleAppSessionResponse);

    setTimeout(() => {
      rpcClient.ws.removeListener('message', handleAppSessionResponse);
      reject(new Error('App session creation timeout'));
    }, 10000);
  });

  // Send the final message (convert to string)
  rpcClient.ws.send(JSON.stringify(finalMessage));

  // Wait for the response
  const response = await appSessionResponsePromise;

  logger.data(`App session creation response for room ${roomId}:`, response);

  const appId = response?.app_session_id || response?.[0]?.app_session_id;

  if (!appId) {
    throw new Error('Failed to get app ID from response');
  }
  logger.debug("Total price for pixels:", totalPrice.toString());
  const serverAddress = ethers.getAddress(rpcClient.address);
  const finalAllocations = [
    {
      participant: eoa,
      asset: 'usdc',
      amount: '0',
    },
    {
      participant: serverAddress,
      asset: 'usdc',
      amount: totalPrice.toString(),
    },
  ];
  //const finalAllocations = ['0', totalPrice.toString()];
  // Final allocations and close request
  const closeRequest = {
    app_session_id: appId,
    allocations: finalAllocations,
  };

  // Use the RPC client's signMessage method for consistent signing
  const sign1 = rpcClient.signMessage.bind(rpcClient);

  // Create the signed message
  const signedMessage = await createCloseAppSessionMessage(
    sign1,
    [closeRequest],
  );
  if (!rpcClient.ws || rpcClient.ws.readyState !== 1) { // WebSocket.OPEN
    throw new Error('WebSocket not connected or not in OPEN state');
  }

  // Set up a promise to handle the response from the WebSocket
  const closeSessionResponsePromise = new Promise((resolve, reject) => {
    // Create a one-time message handler for the close session response
    const handleCloseSessionResponse = (data) => {
      try {
        const rawData = typeof data === 'string' ? data : data.toString();
        const message = JSON.parse(rawData);

        logger.data(`Received close session response:`, message);

        // Check if this is a close session response
        if (message.res && (message.res[1] === 'close_app_session' ||
          message.res[1] === 'app_session_closed')) {
          // Remove the listener once we get the response
          rpcClient.ws.removeListener('message', handleCloseSessionResponse);
          resolve(message.res[2]);
        }

        // Also check for error responses
        if (message.err) {
          rpcClient.ws.removeListener('message', handleCloseSessionResponse);
          reject(new Error(`Error ${message.err[1]}: ${message.err[2]}`));
        }
      } catch (error) {
        logger.error('Error handling close session response:', error);
      }
    };

    // Add the message handler
    rpcClient.ws.on('message', handleCloseSessionResponse);

    // Set timeout to prevent hanging
    setTimeout(() => {
      rpcClient.ws.removeListener('message', handleCloseSessionResponse);
      reject(new Error('Close session timeout'));
    }, 10000);
  });

  // Send the signed message directly
  rpcClient.ws.send(signedMessage);

  // Wait for the response
  const responseCloase = await closeSessionResponsePromise;

  // Log the response
  logger.data(`App session close response for room ${roomId}:`, responseCloase);
  const userSpending = await db.select()
    .from(userSpendingTable).where(eq(userSpendingTable.user_id, playerEoa))[0];
  logger.info(`User spending for ${playerEoa}:`, userSpending);
  // Update user spending
  if (userSpending) {
    await db.update(userSpendingTable)
      .set({ total_spent: userSpending.total_spent + totalPrice })
      .where(eq(userSpendingTable.user_id, playerEoa));
    logger.info(`Updated user spending for ${playerEoa}:`, userSpending.total_spent + totalPrice);
  }
  else {
    await db.insert(userSpendingTable).values({
      user_id: playerEoa,
      total_spent: totalPrice
    });
    logger.info(`Created new user spending record for ${playerEoa} with total spent:`, totalPrice);
  }
  for (const pixel of pixelsToBuy) {
    await db.update(pixelDataTable).set({
      owner: playerEoa,
      last_bought: new Date(),
      last_price: pixel.price,
      color: pixel.color
    }).where(eq(pixelDataTable.id, pixel.id));
    logger.info(`Updated pixel ${pixel.id} ownership to ${playerEoa}, price: ${pixel.price}, color: ${pixel.color}`);
  }
  const pixels = await db.select().from(pixelDataTable);
  for (const connection of connections) {
    connection.ws.send(JSON.stringify({
      type: 'map:state',
      payload:pixels
    }));
  }
}