# SocialBar Project Architecture

## Overview
SocialBar is a full-stack application consisting of three main components:
1. **Backend Server** (`app.js`) - Node.js/Express server
2. **Staff React App** (`/staff`) - Staff management interface
3. **Game React App** (`/game`) - Player/game interface

## Architecture Diagram
```
┌─────────────────┐         WebSocket/HTTP          ┌──────────────────┐
│                 │ ◄────────────────────────────── │                  │
│   Backend       │                                  │   Staff App      │
│   (app.js)      │                                  │   (React)        │
│   Port: 3000    │ ─────────────────────────────►  │   Port: 3051     │
│                 │         Real-time Updates        │                  │
└────────┬────────┘                                  └──────────────────┘
         │
         │ WebSocket/HTTP
         │ Real-time Communication
         │
         ▼
┌─────────────────┐
│                 │
│   Game App      │
│   (React)       │
│   Port: 3052    │
│                 │
└─────────────────┘
```

## Component Relationships

### Backend Server (`app.js`)
**Role:** Central hub for all communication and business logic
- WebSocket server for real-time bidirectional communication
- HTTP REST API for standard requests
- Manages game state and synchronization
- Handles authentication and session management
- Coordinates between staff and game clients

**Key Responsibilities:**
- Process staff commands and broadcast to game clients
- Receive game client actions and notify staff
- Maintain connection state for all clients
- Data persistence and validation

### Staff App (React)
**Role:** Administrative control panel
- Connects to backend via WebSocket/HTTP
- Sends commands and configuration to backend
- Receives real-time updates about game state
- Monitors connected players and game activity

**Communication Pattern:**
```
Staff App → Backend: Commands, configuration, admin actions
Backend → Staff App: Game state updates, player status, real-time events
```

**Connection Type:**
- Primary: WebSocket for real-time bidirectional communication
- Fallback: HTTP REST API for request/response operations

### Game App (React)
**Role:** Player-facing interface
- Connects to backend via WebSocket/HTTP
- Receives game updates and state from backend
- Sends player actions and responses to backend
- Renders game interface and handles user interactions

**Communication Pattern:**
```
Game App → Backend: Player actions, responses, status updates
Backend → Game App: Game state, instructions, real-time updates
```

**Connection Type:**
- Primary: WebSocket for real-time bidirectional communication
- Fallback: HTTP REST API for initial connection and fallback

## Communication Flow

### Real-time Events Flow
1. **Staff initiates action** → Staff App sends event to Backend
2. **Backend processes** → Validates and updates game state
3. **Backend broadcasts** → Sends updates to relevant Game App clients
4. **Game clients react** → Update UI and handle new state
5. **Game clients respond** → Send acknowledgment/actions back to Backend
6. **Backend notifies** → Updates Staff App with player responses

### Connection Lifecycle
```
Client (Staff/Game) → Connect to Backend
                   ↓
Backend ← Authenticate & Register Client
       ↓
WebSocket Connection Established
       ↓
Bidirectional Real-time Communication
       ↓
Client Disconnects → Backend Updates State
```

## Technology Stack

### Backend (`app.js`)
- **Runtime:** Node.js
- **Framework:** Express.js
- **WebSocket:** Socket.io (or native WebSocket)
- **Protocol:** HTTP + WebSocket

### Frontend (Staff & Game)
- **Framework:** React
- **Communication:**
  - WebSocket client for real-time events
  - Fetch/Axios for HTTP requests
- **Deployment:** Static build served via HTTP server

## Deployment Architecture

### Production Setup
```
Apache2 Reverse Proxy (Port 80/443)
         │
         ├──► Backend (localhost:3000)
         │     └── WebSocket + HTTP Server
         │
         ├──► Staff App (localhost:3051)
         │     └── Static React Build (served via PM2)
         │
         └──► Game App (localhost:3052)
               └── Static React Build (served via PM2)
```

### Process Management
- **Backend:** Managed by PM2 (`pm2 start app.js`)
- **Staff App:** Served by PM2 (`pm2 serve staff/build 3051 --spa`)
- **Game App:** Served by PM2 (`pm2 serve game/build 3052 --spa`)

## Data Flow Patterns

### Staff → Game Flow
1. Staff takes action (e.g., start game, send instruction)
2. Staff App emits WebSocket event to Backend
3. Backend validates and processes action
4. Backend broadcasts to relevant Game App clients
5. Game Apps update UI and state

### Game → Staff Flow
1. Player performs action in Game App
2. Game App emits WebSocket event to Backend
3. Backend processes and validates action
4. Backend notifies Staff App of player action
5. Staff App displays update to staff user

### Synchronization
- Backend acts as single source of truth
- All state changes flow through backend
- Backend ensures consistency across all clients
- Clients maintain local state synchronized with backend

## Connection Requirements

### Network Requirements
- **WebSocket Support:** Required for real-time features
- **HTTP/HTTPS:** Standard web protocols
- **CORS:** Configured for cross-origin requests between apps
- **Firewall:** Ports 3000, 3051, 3052 accessible (or via reverse proxy)

### Client Requirements
- Modern browser with WebSocket support
- JavaScript enabled
- Stable internet connection for real-time features

## Security Considerations
- Authentication handled by backend
- Session management via backend
- WebSocket connections authenticated
- CORS policies enforced
- HTTPS/WSS in production (via reverse proxy)

## Key Design Principles
1. **Backend as Authority:** All game logic and state managed by backend
2. **Real-time First:** WebSocket preferred for low-latency communication
3. **Client Independence:** Staff and Game apps are independent frontends
4. **Stateless Clients:** Clients don't maintain authoritative state
5. **Event-Driven:** Communication based on events and listeners
