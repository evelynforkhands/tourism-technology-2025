# DSAPI MCP Server

A Model Context Protocol (MCP) server that provides seamless access to the DSAPI Tourism API. This server enables AI assistants and applications to search, filter, and manage tourism experiences in Kärnten (Carinthia), Austria.

## 📋 Overview

The DSAPI MCP Server is a bridge between MCP-compatible clients (like AI assistants) and the DSAPI Tourism API. It provides a standardized interface for:

- **Experience Discovery**: Search and browse tourism experiences
- **Advanced Filtering**: Filter experiences by type, location, holiday themes, and guest cards
- **Date-based Search**: Find experiences available for specific date ranges
- **Product Management**: Get detailed product information for experiences
- **Shopping Cart**: Add items to shopping lists and generate checkout URLs

## ✨ Features

- 🔍 **Experience Search**: Query tourism experiences with pagination support
- 🎯 **Smart Filtering**: Filter by experience types, locations, holiday themes, and guest cards
- 📅 **Date Range Queries**: Search experiences available for specific dates
- 🌍 **Multi-language Support**: German (de), English (en), and Italian (it)
- 💰 **Multi-currency Support**: EUR, USD, and GBP
- 🛒 **Shopping Cart Integration**: Add items to baskets and generate checkout URLs
- 🔐 **Automatic Authentication**: Handles DSAPI authentication automatically
- ⚡ **HTTP Transport**: Supports both stdio and HTTP transports

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run the server**:
   ```bash
   node build/index.js
   ```

The server will start on `http://localhost:3000/mcp` (or the port specified by the `PORT` environment variable).

## 🐳 Docker

### Build the Docker image:

```bash
docker build -t dsapi-mcp-server .
```

### Run the container:

```bash
docker run -p 3000:3000 dsapi-mcp-server
```

## 🔧 Configuration

The server uses default credentials for DSAPI authentication. These are configured in the source code:

- **Base URL**: `https://dsapi.deskline.net`
- **Default Username**: `TTFHACKTL`
- **Default Password**: `6VVuseYRz2VfCVvXpxgTGovGcHw8`

To customize these, modify the constants in `src/index.ts`:

```typescript
const DSAPI_BASE = "https://dsapi.deskline.net";
const DEFAULT_USERNAME = "your-username";
const DEFAULT_PASSWORD = "your-password";
```

## 📚 Available Tools

The server exposes the following MCP tools:

### 1. `getAllExperiences`

Retrieve all available experiences with pagination.

**Parameters:**
- `region` (string, default: "kaernten"): Region code
- `language` (enum: "de" | "en" | "it", default: "de"): Language code
- `currency` (enum: "EUR" | "USD" | "GBP", default: "EUR"): Currency code
- `pageNo` (number, default: 0): Page number (0-based)
- `pageSize` (number, default: 10): Number of results per page

### 2. `getAllExperiencesFilteredBy`

Get experiences filtered by specific criteria (types, locations, themes, etc.).

**Parameters:**
- `filters` (array of strings): Filter names to apply
- `region` (string, default: "kaernten"): Region code
- `language` (enum: "de" | "en" | "it", default: "de"): Language code
- `currency` (enum: "EUR" | "USD" | "GBP", default: "EUR"): Currency code
- `pageNo` (number, default: 0): Page number (0-based)
- `pageSize` (number, default: 200): Number of results per page

### 3. `getAllAvailableFilters`

Get a list of all available filter names that can be used with `getAllExperiencesFilteredBy`.

**Parameters:** None

### 4. `getAllExperiencesFilteredByDateAndFilter`

Search experiences by date range and filters.

**Parameters:**
- `dateFrom` (string): Start date in ISO 8601 format (e.g., "2025-06-01")
- `dateTo` (string): End date in ISO 8601 format (e.g., "2025-06-15")
- `filters` (array of strings): Filter names to apply
- `region` (string, default: "kaernten"): Region code
- `language` (enum: "de" | "en" | "it", default: "de"): Language code
- `currency` (enum: "EUR" | "USD" | "GBP", default: "EUR"): Currency code
- `pageNo` (number, default: 0): Page number (0-based)
- `pageSize` (number, default: 500): Number of results per page

### 5. `getAllAvailableProductsForAnExperience`

Get all available products (bookable items) for a specific experience.

**Parameters:**
- `experienceId` (string): ID of the experience
- `spIdentity` (string): ID of the service provider
- `region` (string, default: "kaernten"): Region code
- `language` (enum: "de" | "en" | "it", default: "de"): Language code
- `currency` (enum: "EUR" | "USD" | "GBP", default: "EUR"): Currency code
- `pageNo` (number, default: 0): Page number (0-based)
- `pageSize` (number, default: 5): Number of results per page

### 6. `addToBasket`

Add items to a shopping basket.

**Parameters:**
- `region` (string): Region code
- `items` (array of strings): Item IDs to add to the basket

**Returns:** Shopping list ID and added items

### 7. `getCheckoutUrl`

Generate a checkout URL for a shopping list.

**Parameters:**
- `shoppingListId` (string): ID of the shopping list

**Returns:** Checkout URL

## 💻 Development

### Project Structure

```
mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript (generated)
├── Dockerfile            # Docker configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `build/` directory.

### Dependencies

**Runtime:**
- `@modelcontextprotocol/sdk`: MCP SDK for server implementation
- `express`: HTTP server framework
- `zod`: Schema validation

**Development:**
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `@types/express`: Express type definitions

## 🔌 MCP Client Configuration

To use this server with an MCP client (like Claude Desktop or Cursor), add it to your MCP configuration file:

**For HTTP transport:**
```json
{
  "mcpServers": {
    "dsapi-mcp-server": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

**For stdio transport** (if implemented):
```json
{
  "mcpServers": {
    "dsapi-mcp-server": {
      "command": "node",
      "args": ["/path/to/mcp-server/build/index.js"]
    }
  }
}
```

## 📝 Example Usage

### Example 1: Get all experiences

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "getAllExperiences",
    "arguments": {
      "region": "kaernten",
      "language": "de",
      "currency": "EUR",
      "pageNo": 0,
      "pageSize": 10
    }
  }
}
```

### Example 2: Filter experiences by type

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "getAllExperiencesFilteredBy",
    "arguments": {
      "filters": ["Outdoor Aktivitäten", "Wandern"],
      "region": "kaernten",
      "language": "de",
      "currency": "EUR"
    }
  }
}
```

### Example 3: Search by date range

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "getAllExperiencesFilteredByDateAndFilter",
    "arguments": {
      "dateFrom": "2025-06-01",
      "dateTo": "2025-06-15",
      "filters": ["Sommer", "Wellness"],
      "region": "kaernten",
      "language": "de"
    }
  }
}
```

## 🛠️ Technical Details

### Authentication

The server automatically handles DSAPI authentication:
- Authenticates on first request
- Caches bearer token
- Automatically re-authenticates on 401 errors
- Includes `DW-SessionId` header for session tracking

### Error Handling

- Automatic retry on authentication failures
- Request timeouts (30s default for API requests, 10s for auth)
- Proper error messages with status codes

### Filter System

The server includes a comprehensive filter system with:
- **Types**: Experience categories (e.g., "Tickets", "Geführte Tour", "Outdoor Aktivitäten")
- **Holiday Themes**: Seasonal and thematic filters (e.g., "Sommer", "Winter", "Wellness")
- **Locations**: Geographic filters (e.g., "Klagenfurt am Wörthersee", "Bad Kleinkirchheim")
- **Guest Cards**: Special card filters (e.g., "Kärnten Card", "Sonnenschein Card")

## 📄 License

See the main project LICENSE file.

## 🤝 Contributing

This is part of the Tourism Technology 2025 Challenge 2 project. Contributions and improvements are welcome!

## 🔗 Related Projects

- [Backend API](../backend/README.md)
- [Frontend Application](../frontend/README.md)
- [Browser Extension](../browser-extension/README.md)

---

**Built for Tourism Technology 2025 - Challenge 2**

