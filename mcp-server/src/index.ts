#!/usr/bin/env node

/**
 * DSAPI MCP Server
 * Tourism Technology 2025 - Challenge 2
 * 
 * Model Context Protocol server for the DSAPI Tourism API.
 * Provides tools for searching experiences, managing filters, and booking tourism services.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { json } from "stream/consumers";
// DSAPI Configuration
const DSAPI_BASE = "https://dsapi.deskline.net";
const DEFAULT_USERNAME = "TTFHACKTL";
const DEFAULT_PASSWORD = "6VVuseYRz2VfCVvXpxgTGovGcHw8";

const app = express();
app.use(express.json())

// Global bearer token storage
let bearerToken: string | null = null;

// ============================================================================
// Type Definitions
// ============================================================================

interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Make authenticated request to DSAPI
 */
async function makeDSAPIRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  if (!bearerToken) {
    await authenticate();
  }

  const url = `${DSAPI_BASE}${endpoint}`;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if(response.status === 401){
        await authenticate();
        return makeDSAPIRequest(endpoint, options, timeoutMs);
      }
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
    }
    throw error;
  }
}

/**
 * Authenticate with DSAPI
 */
async function authenticate(
  username: string = DEFAULT_USERNAME,
  password: string = DEFAULT_PASSWORD,
  timeoutMs: number = 10000
): Promise<AuthResponse> {
  const url = `${DSAPI_BASE}/Auth?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as AuthResponse;
    bearerToken = data.access_token;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Authentication timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ============================================================================
// Server Setup
// ============================================================================

const server = new McpServer(
  {
    name: "dsapi-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.registerTool(
    'echo',
    {
        title: 'Echo Tool',
        description: 'Echoes back the provided message',
        inputSchema: { message: z.string() },
        outputSchema: { echo: z.string() }
    },
    async ({ message }) => {
        const output = { echo: `Tool echo: ${message}` };
        return {
            content: [{ type: 'text', text: JSON.stringify(output) }],
            structuredContent: output
        };
    }
);

server.registerResource(
    'echo',
    new ResourceTemplate('echo://{message}', { list: undefined }),
    {
        title: 'Echo Resource',
        description: 'Echoes back messages as resources'
    },
    async (uri, { message }) => ({
        contents: [
            {
                uri: uri.href,
                text: `Resource echo: ${message}`
            }
        ]
    })
);

server.registerPrompt(
    'echo',
    {
        title: 'Echo Prompt',
        description: 'Creates a prompt to process a message',
        argsSchema: { message: z.string() }
    },
    ({ message }) => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please process this message: ${message}`
                }
            }
        ]
    })
);

// ============================================================================
// Tool Registration
// ============================================================================


// Search Management
server.registerTool(
  "dsapi_create_search",
  {
    title: "Create Search",
    description: "Create a search object to constrain results to a specific time window (dateFrom/dateTo). Returns a search ID to use in other queries.",
    inputSchema: {
      dateFrom: z
        .string()
        .describe("Start date in ISO 8601 format (e.g., '2025-11-01T00:00:00.000')"),
      dateTo: z
        .string()
        .describe("End date in ISO 8601 format (e.g., '2025-11-08T00:00:00.000')"),
    },
  },
  async ({ dateFrom, dateTo }) => {
    const result = await makeDSAPIRequest<{
      id: string;
      searchObject: { searchGeneral: { dateFrom: string; dateTo: string } };
    }>("/searches", {
      method: "POST",
      body: JSON.stringify({
        searchObject: {
          searchGeneral: { dateFrom, dateTo },
        },
      }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }
);

server.registerTool(
  "dsapi_update_search",
  {
    title: "Update Search",
    description: "Update an existing search object with new date ranges.",
    inputSchema: {
      searchId: z.string().describe("ID of the search object to update"),
      dateFrom: z.string().describe("Start date in ISO 8601 format"),
      dateTo: z.string().describe("End date in ISO 8601 format"),
    },
  },
  async ({ searchId, dateFrom, dateTo }) => {
    const result = await makeDSAPIRequest<{
      id: string;
      searchObject: { searchGeneral: { dateFrom: string; dateTo: string } };
    }>(`/searches/${searchId}`, {
      method: "PUT",
      body: JSON.stringify({
        searchObject: {
          id: searchId,
          searchGeneral: { dateFrom, dateTo },
        },
      }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }
);

// Filter Management
server.registerTool(
  "dsapi_create_filter",
  {
    title: "Create Filter",
    description: "Create a filter object to constrain results by types/categories, locations, guest cards, and holiday themes. Returns a filter ID.",
    inputSchema: {
      types: z
        .array(z.string())
        .optional()
        .describe("Array of type/category GUIDs to filter by"),
      holidayThemes: z
        .array(z.string())
        .optional()
        .describe("Array of holiday theme GUIDs"),
      locations: z.array(z.string()).optional().describe("Array of location GUIDs"),
      guestCards: z.array(z.string()).optional().describe("Array of guest card GUIDs"),
      name: z.string().optional().describe("Name filter string"),
    },
  },
  async ({ types, holidayThemes, locations, guestCards, name }) => {
    const result = await makeDSAPIRequest<{ id: string }>("/filters", {
      method: "POST",
      body: JSON.stringify({
        filterObject: {
          id: "00000000-0000-0000-0000-000000000000",
          filterGeneral: {},
          filterAddServices: {
            types: types || null,
            holidayThemes: holidayThemes || null,
            locations: locations || null,
            guestCards: guestCards || null,
            name: name || "",
          },
        },
      }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }
);

// server.registerTool(
//   "dsapi_update_filter",
//   {
//     title: "Update Filter",
//     description: "Update an existing filter object with new criteria.",
//     inputSchema: {
//       filterId: z.string().describe("ID of the filter object to update"),
//       types: z.array(z.string()).optional().describe("Array of type/category GUIDs"),
//       holidayThemes: z.array(z.string()).optional().describe("Array of holiday theme GUIDs"),
//       locations: z.array(z.string()).optional().describe("Array of location GUIDs"),
//       guestCards: z.array(z.string()).optional().describe("Array of guest card GUIDs"),
//       name: z.string().optional().describe("Name filter string"),
//     },
//   },
//   async ({ filterId, types, holidayThemes, locations, guestCards, name }) => {
//     const result = await makeDSAPIRequest<{ id: string }>(`/filters/${filterId}`, {
//       method: "PUT",
//       body: JSON.stringify({
//         filterObject: {
//           id: filterId,
//           filterGeneral: {},
//           filterAddServices: {
//             types: types || null,
//             holidayThemes: holidayThemes || null,
//             locations: locations || null,
//             guestCards: guestCards || null,
//             name: name || "",
//           },
//         },
//       }),
//     });
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// server.registerTool(
//   "dsapi_get_filter_options",
//   {
//     title: "Get Filter Options",
//     description: "Get available filter options (facets) for experiences - types, holiday themes, locations, and guest cards. Great for building filter UIs.",
//     inputSchema: {
//       filterId: z.string().describe("ID of the filter object"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       language: z
//         .enum(["de", "en", "it"])
//         .default("de")
//         .describe("Language code"),
//     },
//   },
//   async ({ filterId, region, language }) => {
//     const params = new URLSearchParams({
//       fields:
//         "types{id,name,count},holidayThemes{id,name,count},locations(locTypes:[3]){id,name,count},guestCards{id,name,count,type,typeId,iconUrl,webLink}",
//       limAddSrvTHEME: "38723CC4-C5F0-4707-9401-5F598D892246",
//       limExAccShSPwoPr: "false",
//     });
//     const result = await makeDSAPIRequest<Record<string, unknown>>(
//       `/addservices/${region}/${language}/filterresults/${filterId}?${params.toString()}`
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// // Experience Discovery
// server.registerTool(
//   "dsapi_list_experiences_by_filter",
//   {
//     title: "List Experiences by Filter",
//     description: "List experiences (AddServices) filtered by a filter object only (no date constraints).",
//     inputSchema: {
//       filterId: z.string().describe("ID of the filter object"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       language: z
//         .enum(["de", "en", "it"])
//         .default("de")
//         .describe("Language code"),
//       currency: z
//         .enum(["EUR", "USD", "GBP"])
//         .default("EUR")
//         .describe("Currency code"),
//       pageNo: z.number().default(0).describe("Page number (0-based)"),
//       pageSize: z.number().default(5).describe("Number of results per page"),
//     },
//   },
//   async ({ filterId, region, language, currency, pageNo, pageSize }) => {
//     const params = new URLSearchParams({
//       filterId,
//       currency,
//       pageNo: String(pageNo),
//       pageSize: String(pageSize),
//     });
//     const result = await makeDSAPIRequest<Record<string, unknown>>(
//       `/addservices/${region}/${language}/?${params.toString()}`
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// server.registerTool(
//   "dsapi_list_experiences_by_search",
//   {
//     title: "List Experiences by Search",
//     description: "List experiences (AddServices) filtered by both a search object (date range) and a filter object.",
//     inputSchema: {
//       searchId: z.string().describe("ID of the search object"),
//       filterId: z.string().describe("ID of the filter object"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       language: z
//         .enum(["de", "en", "it"])
//         .default("de")
//         .describe("Language code"),
//       currency: z
//         .enum(["EUR", "USD", "GBP"])
//         .default("EUR")
//         .describe("Currency code"),
//       pageNo: z.number().default(1).describe("Page number (1-based)"),
//       pageSize: z.number().default(50).describe("Number of results per page"),
//     },
//   },
//   async ({ searchId, filterId, region, language, currency, pageNo, pageSize }) => {
//     const params = new URLSearchParams({
//       filterId,
//       currency,
//       pageNo: String(pageNo),
//       pageSize: String(pageSize),
//     });
//     const result = await makeDSAPIRequest<Record<string, unknown>>(
//       `/addservices/${region}/${language}/searchresults/${searchId}?${params.toString()}`
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// // Product & Availability
// server.registerTool(
//   "dsapi_get_service_products",
//   {
//     title: "Get Service Products",
//     description: "Get the list of bookable products for a specific service/experience.",
//     inputSchema: {
//       serviceId: z.string().describe("ID of the service/experience"),
//       spIdentity: z.string().describe("Service provider identity"),
//       dbCode: z
//         .enum(["KTN"])
//         .default("KTN")
//         .describe("Database code (always 'KTN' for Kärnten)"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       language: z
//         .enum(["de", "en", "it"])
//         .default("de")
//         .describe("Language code"),
//       currency: z
//         .enum(["EUR", "USD", "GBP"])
//         .default("EUR")
//         .describe("Currency code"),
//       filterId: z.string().optional().describe("Optional filter ID"),
//     },
//   },
//   async ({ serviceId, spIdentity, dbCode, region, language, currency, filterId }) => {
//     const params = new URLSearchParams({
//       currency,
//       fields: "id,name,isFreeBookable,price{from,to,insteadFrom,insteadTo}",
//     });
//     if (filterId) params.append("filterId", filterId);
//     const result = await makeDSAPIRequest<Record<string, unknown>>(
//       `/addservices/${region}/${language}/${dbCode}/${spIdentity}/services/${serviceId}/products?${params.toString()}`
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// server.registerTool(
//   "dsapi_get_product_availability",
//   {
//     title: "Get Product Availability",
//     description: "Get detailed availability information for products of a service, including booking schedule, prices, and cancellation policies.",
//     inputSchema: {
//       serviceId: z.string().describe("ID of the service/experience"),
//       spIdentity: z.string().describe("Service provider identity"),
//       searchId: z.string().describe("ID of the search object (defines date range)"),
//       dbCode: z
//         .enum(["KTN"])
//         .default("KTN")
//         .describe("Database code (always 'KTN' for Kärnten)"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       language: z
//         .enum(["de", "en", "it"])
//         .default("de")
//         .describe("Language code"),
//       currency: z
//         .enum(["EUR", "USD", "GBP"])
//         .default("EUR")
//         .describe("Currency code"),
//       filterId: z.string().optional().describe("Optional filter ID"),
//     },
//   },
//   async ({
//     serviceId,
//     spIdentity,
//     searchId,
//     dbCode,
//     region,
//     language,
//     currency,
//     filterId,
//   }) => {
//     const params = new URLSearchParams({
//       currency,
//       fields:
//         "id,name,isFreeBookable,isOwnAvailability,priceChoosableByGuest{active,minPrice,maxPrice},bookInfo{date,startTime,duration,price,insteadPrice,availability,isBookable,isBookableOnRequest,isOfferable,paymentCancellationPolicy{cancellationPolicy{cancellationTextType,defaultHeaderTextNumber,hasFreeCancellation,lastFreeDate,lastFreeTime,textLines{cancellationCalculationType,cancellationNights,cancellationPercentage,defaultTextNumber,hasFreeTime,freeTime,cancellationDate}}}}",
//     });
//     if (filterId) params.append("filterId", filterId);
//     const result = await makeDSAPIRequest<Record<string, unknown>>(
//       `/addservices/${region}/${language}/${dbCode}/${spIdentity}/services/${serviceId}/searchresults/${searchId}?${params.toString()}`
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// // Shopping & Booking
// server.registerTool(
//   "dsapi_create_shopping_list",
//   {
//     title: "Create Shopping List",
//     description: "Create a new shopping list (cart) for booking products.",
//     inputSchema: {
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//     },
//   },
//   async ({ region }) => {
//     const result = await makeDSAPIRequest<{ id: string; region: string }>(
//       `/shoppinglist/${region}`,
//       {
//         method: "POST",
//       }
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// server.registerTool(
//   "dsapi_add_to_shopping_list",
//   {
//     title: "Add to Shopping List",
//     description: "Add products to a shopping list for booking. Each product requires service details and booking information.",
//     inputSchema: {
//       shoppingListId: z.string().describe("ID of the shopping list"),
//       region: z
//         .enum(["kaernten"])
//         .default("kaernten")
//         .describe("Region code"),
//       addServiceItems: z
//         .array(
//           z.object({
//             serviceId: z.string().describe("Service/experience ID"),
//             productId: z.string().describe("Product ID"),
//             spIdentity: z.string().describe("Service provider identity"),
//             dbCode: z.string().describe("Database code (e.g., 'KTN')"),
//             date: z.string().describe("Booking date (ISO format)"),
//             startTime: z.string().describe("Start time (HH:mm format)"),
//             duration: z.number().describe("Duration in hours"),
//             quantity: z.number().describe("Number of persons/tickets"),
//             price: z.number().describe("Price per person"),
//           })
//         )
//         .default([])
//         .describe("Array of additional service (experience) items to add"),
//     },
//   },
//   async ({ shoppingListId, region, addServiceItems }) => {
//     const result = await makeDSAPIRequest<{ success: boolean }>(
//       `/shoppinglist/${region}/${shoppingListId}/items/add`,
//       {
//         method: "POST",
//         body: JSON.stringify({
//           addServiceItems,
//           accommodationItems: [],
//           brochureItems: [],
//           packageItems: [],
//           tourItems: [],
//         }),
//       }
//     );
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// server.registerTool(
//   "dsapi_get_checkout_url",
//   {
//     title: "Get Checkout URL",
//     description: "Generate a checkout URL for a shopping list to complete the booking process.",
//     inputSchema: {
//       shoppingListId: z.string().describe("ID of the shopping list"),
//       posCode: z
//         .enum(["KTN"])
//         .default("KTN")
//         .describe("Point of sale code"),
//     },
//   },
//   async ({ shoppingListId, posCode }) => {
//     const checkoutUrl = `https://work.schanitz.at/onlim/shoppingcart/?initcart=true&poscode=${posCode}&shoppinglist=${shoppingListId}`;
//     const result = { checkoutUrl };
//     return {
//       content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
//       structuredContent: result,
//     };
//   }
// );

// ============================================================================
// Start Server
// ============================================================================

app.post('/mcp', async(req, res) => {
    try{
        const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});

        res.on('close', () => {
            transport.close();
        });

        res.on('error', (error) => {
            console.error('Error in MCP server:', error);
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);        
    } catch (error) {
        console.error('Error in MCP server:', error);
        if(!res.headersSent){
            res.status(500).json({jsonrpc: '2.0', error: {code: -32000, message: 'Internal error'}, id: req.body?.id});
        }
    }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`DSAPI MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
});
