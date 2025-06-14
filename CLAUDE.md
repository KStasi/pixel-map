# Claude Code Assistant Guide for Pixel Map

This document provides essential information for Claude instances working with this codebase.

## Project Overview

This is a full-stack application with a client-server architecture, built using modern web technologies. The project appears to be a game or interactive application that involves blockchain integration.

## Project Structure

```
.
├── client/                 # Frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
└── server/                # Backend application
    ├── src/              # Server source code
    └── package.json      # Backend dependencies
```

## Technology Stack

### Frontend (client/)

- React 19
- TypeScript
- Vite as build tool
- TailwindCSS for styling
- Web3 Integration:
  - RainbowKit
  - wagmi
  - viem
  - ethers.js
- UI Components:
  - Radix UI
  - Lucide React icons

### Backend (server/)

- Node.js (>=20.0.0)
- WebSocket server (ws)
- Blockchain Integration:
  - ethers.js
  - viem
  - @erc7824/nitrolite

## Development Guidelines

1. **Environment Setup**

   - Node.js version 20 or higher is required
   - Both client and server have their own package.json files
   - Run `npm install` in both directories

2. **Running the Application**

   - Client: `npm run dev` (Vite development server)
   - Server: `npm run dev` (Node.js with watch mode)

3. **Code Style**

   - ESLint is configured for both client and server
   - TypeScript is used in the frontend
   - Follow existing code style and patterns

4. **Blockchain Integration**
   - The application uses multiple Web3 libraries
   - Pay attention to version compatibility between ethers.js, viem, and other Web3 packages

## Important Notes

1. **Dependencies**

   - Keep track of Web3 library versions as they need to be compatible
   - The project uses specific versions of packages, especially for blockchain integration

2. **TypeScript**

   - The frontend is fully typed
   - Use TypeScript features appropriately
   - Follow the existing type definitions

3. **Environment Variables**

   - The server uses dotenv for configuration
   - Ensure all necessary environment variables are documented

4. **WebSocket Communication**
   - The server implements WebSocket functionality
   - Pay attention to real-time communication patterns

## Common Tasks

1. **Adding New Features**

   - Follow the existing architecture
   - Maintain type safety in the frontend
   - Update both client and server as needed

2. **Modifying Blockchain Integration**

   - Test thoroughly as blockchain interactions are critical
   - Ensure compatibility between different Web3 libraries

3. **Styling Changes**
   - Use TailwindCSS classes
   - Follow the existing design system
   - Use Radix UI components when appropriate

## Best Practices

1. **Code Organization**

   - Keep related functionality together
   - Follow the existing directory structure
   - Maintain separation of concerns

2. **Testing**

   - Test both frontend and backend changes
   - Pay special attention to WebSocket functionality
   - Verify blockchain interactions

3. **Performance**

   - Monitor WebSocket connections
   - Optimize blockchain interactions
   - Follow React best practices for performance

4. **Security**
   - Handle blockchain transactions securely
   - Validate all user inputs
   - Follow WebSocket security best practices

## Troubleshooting

1. **Common Issues**

   - Web3 library version conflicts
   - WebSocket connection problems
   - TypeScript type errors

2. **Debugging**
   - Use browser developer tools for frontend
   - Check server logs for backend issues
   - Monitor WebSocket connections

Remember to keep this document updated as the codebase evolves.
