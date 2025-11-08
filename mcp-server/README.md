# DSAPI MCP Server

MCP server for the DSAPI Tourism Technology API - enables AI agents to search for tourism experiences and manage bookings in Kärnten, Austria.

## Installation

```bash
npm install
npm run build
```

## Usage

### For Claude Desktop

Add to your config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "dsapi": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"]
    }
  }
}
```

Or use npx:

```json
{
  "mcpServers": {
    "dsapi": {
      "command": "npx",
      "args": ["-y", "/absolute/path/to/mcp-server"]
    }
  }
}
```

## Available Tools

### Authentication
- `dsapi_authenticate` - Get bearer token (required first step)

### Search & Filter
- `dsapi_create_search` - Create search with date range
- `dsapi_update_search` - Update search dates
- `dsapi_create_filter` - Create filter by type/location/theme
- `dsapi_update_filter` - Update filter criteria
- `dsapi_get_filter_options` - Get available filter options

### Experiences
- `dsapi_list_experiences_by_filter` - List experiences (filter only)
- `dsapi_list_experiences_by_search` - List experiences (search + filter)
- `dsapi_get_service_products` - Get bookable products
- `dsapi_get_product_availability` - Get schedules & pricing

### Booking
- `dsapi_create_shopping_list` - Create shopping cart
- `dsapi_add_to_shopping_list` - Add products to cart
- `dsapi_get_checkout_url` - Get checkout URL

## Workflow Example

```
1. dsapi_authenticate()
2. dsapi_create_search(dateFrom, dateTo) → searchId
3. dsapi_create_filter() → filterId
4. dsapi_get_filter_options(filterId) → discover available types
5. dsapi_update_filter(filterId, types) → narrow results
6. dsapi_list_experiences_by_search(searchId, filterId) → experiences
7. dsapi_get_product_availability(serviceId, spIdentity, searchId) → availability
8. dsapi_create_shopping_list() → shoppingListId
9. dsapi_add_to_shopping_list(shoppingListId, items)
10. dsapi_get_checkout_url(shoppingListId) → complete booking
```

## API Reference

- Base URL: `https://dsapi.deskline.net`
- Live site: https://www.kaernten.at/toscexp/erlebnisse-in-kaernten/
- Region: Kärnten (Carinthia), Austria
- Default credentials provided in code

## License

MIT

