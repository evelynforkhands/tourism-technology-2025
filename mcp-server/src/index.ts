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
import { randomUUID } from "crypto";
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
  token: string;
  expires_in: number;
  token_type: string;
}

interface FilterResponse {
  id: string;
  name: string;
  count: number;
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
    // Normalize provided headers to an object
    const providedHeadersObj: Record<string, string> = Object.fromEntries(
      new Headers(options.headers as HeadersInit).entries()
    );

    // ensure a non-empty DW-SessionId header (use provided one if present, otherwise generate)
    const dwSessionId =
      providedHeadersObj["dw-sessionid"] ||
      providedHeadersObj["dw-session-id"] ||
      providedHeadersObj["DW-SessionId"] ||
      randomUUID();

    const headers: Record<string, string> = {
      ...providedHeadersObj,
      "DW-SessionId": dwSessionId,
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        await authenticate();
        return makeDSAPIRequest<T>(endpoint, options, timeoutMs);
      }
      const errorText = await response.text();
      console.error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
    }
    throw error;
  }
}

/**
 * Helper function to handle the authentication process
 */
async function authenticate(
  username: string = DEFAULT_USERNAME,
  password: string = DEFAULT_PASSWORD,
  timeoutMs: number = 10000
): Promise<AuthResponse> {
  const url = `${DSAPI_BASE}/Auth?username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;

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
    bearerToken = data.token;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Authentication timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

//#region Filters

async function createFilter(): Promise<string> {
  const result = await makeDSAPIRequest<{ id: string }>("/filters", {
    method: "POST",
    body: JSON.stringify({
      filterObject: {
        id: "00000000-0000-0000-0000-000000000000",
        filterGeneral: {},
        filterAddServices: {
          types: null,
          holidayThemes: null,
          locations: null,
          guestCards: null,
          name: "",
        },
      },
    }),
  });
  return result.id;
}

async function updateFilter(filterId: string, filterObject: any): Promise<string> {
  const result = await makeDSAPIRequest<{ id: string }>(`/filters/${filterId}`, {
    method: "PUT",
    body: JSON.stringify({
      filterObject: {
        id: filterId,
        filterGeneral: {},
        filterAddServices: filterObject,
      },
    }),
  });
  return result.id;
}

/**
 * Create a search object
 * @param dateFrom Start date in ISO 8601 format
 * @param dateTo End date in ISO 8601 format
 * @returns Search object ID
 */
async function createSearch(dateFrom: string, dateTo: string): Promise<string> {
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
  return result.id;
}

/**
 * Helper function to get all available filters
 * @returns All available filters
 */

const getFilters = (): Record<string, any[]> => {
  return {
    "types": [
        {
            "id": "30714197-3628-47e6-98da-6497ecb900d4",
            "name": "Tickets",
            "count": 5
        },
        {
            "id": "684852ec-4b22-4151-8091-e92062520fd7",
            "name": "Geführte Tour",
            "count": 29
        },
        {
            "id": "5c8707cb-3700-49c9-9e11-f8876c333520",
            "name": "Outdoor Aktivitäten",
            "count": 8
        },
        {
            "id": "d84a1829-e748-41dc-bf6d-53f1d79538b8",
            "name": "Slow Food Erlebnis",
            "count": 40
        },
        {
            "id": "9a802ab0-05f0-4815-ba7d-efc67b14d6cc",
            "name": "Magische Momente",
            "count": 4
        },
        {
            "id": "12a2e5dc-8a73-42f4-8bd7-ffb7f31257f3",
            "name": "Naturerlebnis",
            "count": 15
        },
        {
            "id": "6b23f2dc-e588-4a0d-b595-c681893cc623",
            "name": "Kulturerlebnis",
            "count": 2
        },
        {
            "id": "8b3ed7a5-96ca-402b-9940-0f9b144e8108",
            "name": "Kulinarisches Erlebnis",
            "count": 49
        },
        {
            "id": "a92c7859-1ea4-4de6-81d6-a8788578f9bf",
            "name": "Sporterlebnis",
            "count": 2
        },
        {
            "id": "1993bdff-7832-4aa0-bc15-2fa47971ccac",
            "name": "Barrierefreies Erlebnis",
            "count": 1
        },
        {
            "id": "f13086fa-55cf-4797-adbd-aff9d19715e4",
            "name": "Erlebnis für Gruppen",
            "count": 9
        },
        {
            "id": "ee5bbf55-6d28-4af9-99e0-2ec3e67dbe1c",
            "name": "Auszeit & Regeneration",
            "count": 42
        },
        {
            "id": "fd9e5194-c72d-4f8c-9be9-89e5fb7e7b73",
            "name": "Workshops & Seminare",
            "count": 33
        },
        {
            "id": "e959b042-7906-4649-9890-2aa3784877af",
            "name": "Gutscheine",
            "count": 2
        },
        {
            "id": "c02f63d0-f2a7-483b-bcee-97b5fa3eb4d0",
            "name": "Museen & Kultur",
            "count": 4
        },
        {
            "id": "3a8def22-5a4e-40e5-9fe3-fa2892773655",
            "name": "Green Experience",
            "count": 7
        },
        {
            "id": "5c850c32-c27f-4442-a9ac-9e17c30284cc",
            "name": "Freizeit- & Erlebnispark",
            "count": 1
        },
        {
            "id": "37c7dc1c-7438-4bc5-a837-774323c4ebff",
            "name": "Panormastraße",
            "count": 3
        },
        {
            "id": "4620288b-5c86-4f2d-b305-e6fe83bc10bf",
            "name": "1. Slow Food Akademie der Alpen",
            "count": 32
        },
        {
            "id": "2a4afe8f-fb4f-4030-a672-0c75bf841f01",
            "name": "Rad & Bike",
            "count": 1
        },
        {
            "id": "8dff9f7a-088c-4812-a819-5b5eb1541750",
            "name": "Kaltbaden",
            "count": 8
        },
        {
            "id": "b327a210-f5cb-4d6d-bdff-161695302e43",
            "name": "Day Spa",
            "count": 7
        },
        {
            "id": "16736a53-5be8-42ef-a804-548500201990",
            "name": "Dine Around",
            "count": 9
        }
    ],
    "holidayThemes": [
        {
            "id": "a9b7584d-022d-4d1f-bc49-aeea2b389d90",
            "name": " Ausflugsziele",
            "count": 1
        },
        {
            "id": "d087d9cf-ab7d-475a-a6dc-f5b014932396",
            "name": "Advent",
            "count": 5
        },
        {
            "id": "f3e1616b-ba38-4551-85f3-2d2cb106240f",
            "name": "Adventure",
            "count": 2
        },
        {
            "id": "d53d2e82-48b3-4d56-86bd-bc645a3cfc7e",
            "name": "Aktiv Card",
            "count": 2
        },
        {
            "id": "26b1cdfc-fea7-4fd2-9d7b-3d407733c710",
            "name": "Alleinreisende",
            "count": 1
        },
        {
            "id": "1fec85ac-ca30-47c2-8125-00c73ae3beca",
            "name": "Ausflugsziel",
            "count": 1
        },
        {
            "id": "32ff9037-ed71-4ebd-b093-2fade789e006",
            "name": "Ausspannen",
            "count": 4
        },
        {
            "id": "d4784582-6bbd-4f19-9cb1-f2bfb41d792c",
            "name": "Auszeit-Retreats",
            "count": 1
        },
        {
            "id": "ceafd030-22bd-47a8-b64a-12c4cc5ebd68",
            "name": "Bad Kleinkirchheim",
            "count": 14
        },
        {
            "id": "5ee37ba6-c7af-46be-bab7-66c5f955c1e7",
            "name": "Baden",
            "count": 5
        },
        {
            "id": "7f7b493f-07e6-431d-a60c-e00477bd161a",
            "name": "Barrierefrei",
            "count": 1
        },
        {
            "id": "1e78ce15-3126-4927-bb17-54f7940e4231",
            "name": "Convention",
            "count": 6
        },
        {
            "id": "ab7494e2-e29f-4426-a0fa-b372bd72dfb6",
            "name": "Eisklettern im Eisklettergarten Heiligenblut",
            "count": 1
        },
        {
            "id": "090a18ae-5d50-421e-a65a-c5a2b8227ae5",
            "name": "Familie",
            "count": 24
        },
        {
            "id": "795fcd4f-5437-4d5a-ac1c-216e94a3e56c",
            "name": "Fasching",
            "count": 1
        },
        {
            "id": "5cfb5e0a-42e9-4a37-bd4a-e0715419dacc",
            "name": "Frühling",
            "count": 49
        },
        {
            "id": "650d7c65-75c8-4fc4-8368-caa002d1a374",
            "name": "Frühstück & Brunch",
            "count": 8
        },
        {
            "id": "8f03433a-c20d-43bb-a953-79b95fd4f02d",
            "name": "Gästekartermäßigung",
            "count": 2
        },
        {
            "id": "aefc2e1b-98bc-4b5b-8b2b-8f38c58f403f",
            "name": "Gastronomie & Wein",
            "count": 4
        },
        {
            "id": "657ba98d-9333-48c6-bc03-d74d1fd2eb66",
            "name": "Geführtes Programm",
            "count": 3
        },
        {
            "id": "3429567e-a4fe-4a6d-a3ef-12f93ed7a255",
            "name": "Geschichte",
            "count": 1
        },
        {
            "id": "a6300b5c-2dfc-43ef-bc74-c82a9cf4775e",
            "name": "Geschichte & Kultur",
            "count": 1
        },
        {
            "id": "29b04060-f85a-4df8-8e13-a67e493ed958",
            "name": "Gesundheit",
            "count": 11
        },
        {
            "id": "731f593a-1aa3-4482-a85d-8664a0ecd470",
            "name": "Gratis mit Gästekarte",
            "count": 10
        },
        {
            "id": "065e9657-7ecd-4b2d-80bd-d7d296033122",
            "name": "Herbst",
            "count": 60
        },
        {
            "id": "fc484a57-3b94-4d98-8916-92b895cbe21b",
            "name": "Hofladen",
            "count": 2
        },
        {
            "id": "91dd4763-8da3-4d21-b93a-f9ee5130ae0c",
            "name": "Hundefreundlich",
            "count": 1
        },
        {
            "id": "498ee076-fd89-43b0-9a95-8ece53f116fc",
            "name": "Indoor",
            "count": 10
        },
        {
            "id": "f291ed82-d2ac-439e-915d-c252356a3059",
            "name": "Kampagne_Herbst",
            "count": 1
        },
        {
            "id": "301ec545-1b63-4e77-a379-4fb60ef81603",
            "name": "Kärnten Card Ausflugsziele",
            "count": 7
        },
        {
            "id": "4603d483-ada1-4749-831d-699aee3b3a7a",
            "name": "Kärnten Card Ausgabestellen",
            "count": 1
        },
        {
            "id": "38723cc4-c5f0-4707-9401-5f598d892246",
            "name": "Kärnten Erlebnisse",
            "count": 137
        },
        {
            "id": "367b2a92-e45e-4a96-855e-74332339f7b0",
            "name": "Kinder",
            "count": 13
        },
        {
            "id": "2f25da49-dfce-44fb-99a0-dbbc3c8de001",
            "name": "Kinder",
            "count": 1
        },
        {
            "id": "86a164e8-fafd-4b55-abc3-0698f9039ff1",
            "name": "Klagenfurt am Wörthersee",
            "count": 1
        },
        {
            "id": "a06c52da-3083-421e-8a85-4392243d5200",
            "name": "Klettern",
            "count": 1
        },
        {
            "id": "7b4d01c9-0281-4947-9151-15e8ac93fb3b",
            "name": "Kochkurs",
            "count": 6
        },
        {
            "id": "4d3c8306-bf6d-4832-9665-5fe66a596e24",
            "name": "Kraftplätze",
            "count": 1
        },
        {
            "id": "06e91dc7-f910-4382-97fd-e8053649bbeb",
            "name": "Kulinarik & Genuss",
            "count": 1
        },
        {
            "id": "8be7345a-f3d4-40cd-ac77-b0af390e8490",
            "name": "Kulinarisch",
            "count": 51
        },
        {
            "id": "8c52ddfa-0763-49ad-89f0-88709ee03673",
            "name": "Kultur",
            "count": 5
        },
        {
            "id": "998884c4-15cf-4d64-b97b-35004cc53d98",
            "name": "Kunst & Kultur",
            "count": 2
        },
        {
            "id": "22c32656-9d65-44a6-98e4-f049cd9f7262",
            "name": "Kunst und Kultur",
            "count": 1
        },
        {
            "id": "ac40950d-d24d-4323-8b2e-1ec436860fb9",
            "name": "Künstler:innen",
            "count": 1
        },
        {
            "id": "1f1f4868-f465-4757-a5d1-c0e416d7acfb",
            "name": "Kurzaufenthalt",
            "count": 4
        },
        {
            "id": "e55addbf-761e-40b3-8702-3a01a2ba0b1a",
            "name": "Millstätter See – Bad Kleinkirchheim – Nockberge",
            "count": 4
        },
        {
            "id": "e60b1d44-8704-47c1-8ce3-4ce641d673b9",
            "name": "Motorrad",
            "count": 2
        },
        {
            "id": "d6252ce4-1f03-4e32-b35e-6001f14fd210",
            "name": "Musik",
            "count": 1
        },
        {
            "id": "38c667f4-2a71-4a10-b86a-dce5a384f40e",
            "name": "Nationalpark Hohe Tauern",
            "count": 1
        },
        {
            "id": "065f07fd-c494-47f3-a415-12d24231fb10",
            "name": "Naturaktiv",
            "count": 6
        },
        {
            "id": "1afeec51-17a7-450c-a93c-e52a33fd0a5d",
            "name": "Naturparkerlebnis",
            "count": 1
        },
        {
            "id": "c72adc05-be18-485f-a64c-82d3aa10b7a1",
            "name": "Naturwunder",
            "count": 1
        },
        {
            "id": "1adbb893-fd75-4c6e-a9c6-71513e17d8f0",
            "name": "Nockberge",
            "count": 10
        },
        {
            "id": "96802db7-9049-443b-8d39-2ca6a197cfa1",
            "name": "Ostern",
            "count": 1
        },
        {
            "id": "70033466-a5c3-4d03-be74-3c97c7b4b5ac",
            "name": "Outdoor",
            "count": 19
        },
        {
            "id": "b20b17e1-f210-4350-9384-6606255e4cdc",
            "name": "Qualitätsinitiative Kärnten",
            "count": 1
        },
        {
            "id": "526d38ac-b82c-4344-9890-4c47c5f94971",
            "name": "Reduktion mit Gästekarte",
            "count": 5
        },
        {
            "id": "27e81b93-cfa1-4a6c-a10c-a560410ce183",
            "name": "Regionale Produkte",
            "count": 6
        },
        {
            "id": "21c000a6-a5fe-4f44-9f84-6c7e3d227d37",
            "name": "Romantik",
            "count": 8
        },
        {
            "id": "79dc7805-f8d5-4de3-ba1a-6c2e5e721641",
            "name": "Schlechtwetter Tipp",
            "count": 9
        },
        {
            "id": "864de857-eb3d-4acf-b116-4dde23227e2b",
            "name": "Schneeschuh-Wandern",
            "count": 7
        },
        {
            "id": "c998600b-b146-451f-a51e-1364f057c2c0",
            "name": "Schnuppern",
            "count": 1
        },
        {
            "id": "9cba5c87-7f5a-41fc-8fe9-52164ae6e411",
            "name": "Schönheit",
            "count": 6
        },
        {
            "id": "cb0af051-161c-47e1-b089-0cb9782b9eff",
            "name": "Skifahren alpin",
            "count": 1
        },
        {
            "id": "3a542699-883d-4b15-b229-e8199ea86220",
            "name": "Skitouren",
            "count": 2
        },
        {
            "id": "bf88cea8-b839-4971-86f4-b583fc8f6aa8",
            "name": "Slow Food Erlebnis",
            "count": 23
        },
        {
            "id": "b61212d4-2561-4c2c-9854-9ec05ca60502",
            "name": "Slow Food Produzent",
            "count": 2
        },
        {
            "id": "16080c0b-cd27-4b5f-a02e-6f7461d31c4c",
            "name": "Slow Food Travel",
            "count": 40
        },
        {
            "id": "1611aace-8307-47aa-ae26-7415de58cb69",
            "name": "Slow Food Village",
            "count": 4
        },
        {
            "id": "efdf7edf-b161-4d5f-b2c9-c21df98397e5",
            "name": "Sommer",
            "count": 48
        },
        {
            "id": "5e374a8d-9e5e-4f9e-8f0a-6dd055ee3637",
            "name": "Sonnenschein Card",
            "count": 2
        },
        {
            "id": "12e76b98-432c-4863-9174-0f32a961ea61",
            "name": "Spazieren",
            "count": 2
        },
        {
            "id": "622d8ba0-937d-47a4-af45-b2b2e542a5f8",
            "name": "Specials",
            "count": 1
        },
        {
            "id": "8e8ce2d5-35e7-4817-957a-ed183c83ef64",
            "name": "Themenführungen",
            "count": 1
        },
        {
            "id": "29bf8071-4991-487b-a12b-b3ff0179296e",
            "name": "Tourismusakademie",
            "count": 30
        },
        {
            "id": "13f475cc-d6e0-47ae-9000-8a7376fa850b",
            "name": "Turracher Höhe",
            "count": 3
        },
        {
            "id": "6b7e741b-40d6-4eab-b745-1408aaee360a",
            "name": "Veranstaltung",
            "count": 10
        },
        {
            "id": "00d02b60-2166-4be4-947e-ef8f059bc55a",
            "name": "Villach – Faaker See – Ossiacher See",
            "count": 1
        },
        {
            "id": "30aff083-4f67-4d75-ae57-75cd8efc21de",
            "name": "Volkskultur",
            "count": 1
        },
        {
            "id": "ce14a874-131a-4825-b896-64ea99afb9d2",
            "name": "Wandern",
            "count": 1
        },
        {
            "id": "4f322438-6d0c-4a7d-bb24-d520e5543d6e",
            "name": "Wandern",
            "count": 14
        },
        {
            "id": "25f0588a-a040-48c4-a555-fa18d17a134e",
            "name": "Weekend",
            "count": 6
        },
        {
            "id": "2a5e1d12-5c94-4e8c-9d49-92357fefbe6e",
            "name": "Wein",
            "count": 4
        },
        {
            "id": "f2b81ea4-90fe-4ec8-81f3-1ef807a46c7f",
            "name": "Wellness",
            "count": 8
        },
        {
            "id": "cfcb93ef-fca3-4cf7-95c0-375812b2ded2",
            "name": "Wellness & Regeneration",
            "count": 4
        },
        {
            "id": "3d7b461a-ddac-4cdd-a1cd-76a370807d13",
            "name": "Winter",
            "count": 73
        },
        {
            "id": "3a379e1d-0c25-4d2e-aeea-a3a2885ea200",
            "name": "Winterwandern",
            "count": 2
        },
        {
            "id": "260c1c53-99f9-4db2-9347-7d011a96fde3",
            "name": "Workshop",
            "count": 8
        },
        {
            "id": "7692d1ad-7486-487c-8d29-02f9246c7b21",
            "name": "Wörthersee – Rosental",
            "count": 1
        }
    ],
    "locations": [
        {
            "id": "7259a800-7bfa-462a-a120-ec75b114bb77",
            "name": "Althofen",
            "count": 2
        },
        {
            "id": "237acaf2-4403-4ff9-b0f9-ae4f83440218",
            "name": "Bad Kleinkirchheim / St. Oswald",
            "count": 14
        },
        {
            "id": "a6be78e8-3474-4ea4-86b6-994b39ada8de",
            "name": "Baldramsdorf",
            "count": 6
        },
        {
            "id": "ea6827f0-1776-424e-99ed-bb9e552254a4",
            "name": "Berg im Drautal",
            "count": 2
        },
        {
            "id": "55e5eeaf-6b5c-4aaf-a2c6-5dc220db3b21",
            "name": "Dellach im Gailtal",
            "count": 3
        },
        {
            "id": "a6121d13-c9c6-4683-94b1-0816a51ccd21",
            "name": "Döbriach-Radenthein am Millstätter See",
            "count": 3
        },
        {
            "id": "b6237704-5d57-4885-8945-cca2b9af39e5",
            "name": "Feld am See",
            "count": 1
        },
        {
            "id": "5a5dfe12-003a-4ecb-b527-1cbc9e53065d",
            "name": "Feldkirchen in Kärnten / Maltschacher See",
            "count": 1
        },
        {
            "id": "feea6dac-bd92-4fa7-8244-2f6f99c6b4bd",
            "name": "Ferlach",
            "count": 1
        },
        {
            "id": "e438a9e3-7e6d-478a-a0fa-eee2f41a4a72",
            "name": "Frauenstein",
            "count": 2
        },
        {
            "id": "39882f29-236f-4838-8d4d-4ffeecc12dc4",
            "name": "Friesach",
            "count": 3
        },
        {
            "id": "e170a908-6cd5-45f1-a7c0-f82a259d943a",
            "name": "Großkirchheim",
            "count": 1
        },
        {
            "id": "9e450a70-08bf-4427-b2f9-c5f45cf0e9d8",
            "name": "Gurk",
            "count": 1
        },
        {
            "id": "48bbca29-1b5a-488f-89a2-1ac590c16ada",
            "name": "Heiligenblut am Großglockner",
            "count": 7
        },
        {
            "id": "a7e06e85-1946-4685-a327-ab2b4ee901d4",
            "name": "Hermagor-Pressegger See-Nassfeld",
            "count": 11
        },
        {
            "id": "98714585-ca77-46ca-b09d-c40dc2559c84",
            "name": "Kirchbach",
            "count": 2
        },
        {
            "id": "8d224f4a-a64e-4336-87f1-d767448e0052",
            "name": "Klagenfurt am Wörthersee",
            "count": 2
        },
        {
            "id": "3b137f76-f8ba-4086-938c-18f9c6807e04",
            "name": "Kötschach-Mauthen",
            "count": 5
        },
        {
            "id": "f29218f3-c8fd-4856-9641-045ee27ef5b9",
            "name": "Krems in Kärnten - Innerkrems",
            "count": 1
        },
        {
            "id": "a48eb65a-114e-45e8-81fb-44f8289dc7b3",
            "name": "Lendorf",
            "count": 1
        },
        {
            "id": "03cfe1fe-9a67-4757-b75e-2ebb02adf157",
            "name": "Lesachtal",
            "count": 9
        },
        {
            "id": "d6cc5d38-6a13-4db0-8abd-9fd637f6663a",
            "name": "Magdalensberg",
            "count": 2
        },
        {
            "id": "056c80cd-e05d-4317-a850-eb379bec176c",
            "name": "Mallnitz",
            "count": 6
        },
        {
            "id": "fab7270d-640e-460a-9bce-f31f5c4db4f6",
            "name": "Millstatt am Millstätter See",
            "count": 8
        },
        {
            "id": "8e4f4f0a-be1e-40f8-9453-f4421ea0c6a5",
            "name": "Mörtschach",
            "count": 1
        },
        {
            "id": "5ba19525-042d-45e1-a415-ad87d45aa2e4",
            "name": "Mühldorf",
            "count": 1
        },
        {
            "id": "1d0d4cc7-5576-4fcb-ad33-51cd38688646",
            "name": "Reichenau",
            "count": 8
        },
        {
            "id": "ae4a9f14-ad35-4f33-a3e5-7cfb7541faa2",
            "name": "Seeboden am Millstätter See",
            "count": 2
        },
        {
            "id": "c396f26b-453f-49ef-8daf-3e56a52186d2",
            "name": "Spittal an der Drau",
            "count": 1
        },
        {
            "id": "a66645a6-94cb-41fb-972e-7c80a474f9de",
            "name": "St. Paul im Lavanttal",
            "count": 2
        },
        {
            "id": "4029d741-5614-4785-af9f-1148d6c79ad1",
            "name": "St. Veit an der Glan",
            "count": 7
        },
        {
            "id": "e7cd061e-f168-4a46-9773-bfaf8d586b74",
            "name": "St.Kanzian/Klopeiner See",
            "count": 4
        },
        {
            "id": "1fd2e175-b0a7-4cbd-bd56-6c989c266f79",
            "name": "Stockenboi",
            "count": 1
        },
        {
            "id": "dc5d22ea-4b75-43e3-8a52-7c55001a6d74",
            "name": "Straßburg",
            "count": 1
        },
        {
            "id": "69ccc2f8-2c86-4dd2-a855-fc5bdf342e88",
            "name": "Villach Stadt",
            "count": 2
        },
        {
            "id": "214f3099-3c6b-4671-9000-1bee8279fcd2",
            "name": "Weissensee",
            "count": 6
        },
        {
            "id": "62ef7759-b7ee-4a5c-81b1-d65df553cfe9",
            "name": "Wolfsberg",
            "count": 7
        }
    ],
    "guestCards": [
        {
            "id": "92b30d8b-7bcb-4014-a0d0-99564e6cf1d5",
            "name": "Millstätter See Inclusive Card",
            "count": 4,
            "type": 0,
            "typeId": "92b30d8b-7bcb-4014-a0d0-99564e6cf1d5_0",
            "iconUrl": "//resc.deskline.net/images/KTN/7/92b30d8b-7bcb-4014-a0d0-99564e6cf1d5/Millst%c3%a4tter_See_Inclusive_Card.png",
            "webLink": ""
        },
        {
            "id": "27523f3e-7792-478d-9390-9f9445765260",
            "name": "Nationalpark-Partnerkarte",
            "count": 5,
            "type": 0,
            "typeId": "27523f3e-7792-478d-9390-9f9445765260_0",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "90cfa847-390d-4308-b306-7146aa41baff",
            "name": "NocksCard",
            "count": 3,
            "type": 0,
            "typeId": "90cfa847-390d-4308-b306-7146aa41baff_0",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "ed603c41-590b-48e9-8035-818677ad55ae",
            "name": "Sonnenschein Card",
            "count": 4,
            "type": 0,
            "typeId": "ed603c41-590b-48e9-8035-818677ad55ae_0",
            "iconUrl": "//resc.deskline.net/images/KTN/7/ed603c41-590b-48e9-8035-818677ad55ae/Sonnenschein_Card.png",
            "webLink": ""
        },
        {
            "id": "34a26bae-3747-4419-8d4d-e3856d708377",
            "name": "+CARD holiday",
            "count": 1,
            "type": 1,
            "typeId": "34a26bae-3747-4419-8d4d-e3856d708377_1",
            "iconUrl": "//resc.deskline.net/images/KTN/7/34a26bae-3747-4419-8d4d-e3856d708377/CARD_holiday.png",
            "webLink": ""
        },
        {
            "id": "eeda04c6-b9bf-4089-85e1-09716f2c145f",
            "name": "Aktiv Card Lavanttal",
            "count": 6,
            "type": 1,
            "typeId": "eeda04c6-b9bf-4089-85e1-09716f2c145f_1",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "3216e037-e410-44ce-9b8f-7959f05ce8e2",
            "name": "Aktiv Card Südkärnten ",
            "count": 6,
            "type": 1,
            "typeId": "3216e037-e410-44ce-9b8f-7959f05ce8e2_1",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "027054e3-519b-48db-aadd-5b79e40079d2",
            "name": "Kärnten Card",
            "count": 1,
            "type": 1,
            "typeId": "027054e3-519b-48db-aadd-5b79e40079d2_1",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "27523f3e-7792-478d-9390-9f9445765260",
            "name": "Nationalpark-Partnerkarte",
            "count": 5,
            "type": 1,
            "typeId": "27523f3e-7792-478d-9390-9f9445765260_1",
            "iconUrl": "",
            "webLink": ""
        },
        {
            "id": "6bcf00cf-5f85-4383-b9e6-f04cd4d7f26f",
            "name": "Nationalpark-Region Hohe Tauern – Gästekarte",
            "count": 4,
            "type": 1,
            "typeId": "6bcf00cf-5f85-4383-b9e6-f04cd4d7f26f_1",
            "iconUrl": "",
            "webLink": ""
        }
    ]
}
}

/**
 * Maps filter objects to an array of names
 * Transforms {types: [{id, name}], holidayThemes: [{id, name}], ...} to [name1, name2, ...]
 */
const mapFiltersToNameEnum = (filters: Record<string, any[]>): string[] => {
  const names: string[] = [];
  
  for (const items of Object.values(filters)) {
    for (const item of items) {
      if (item.name && !names.includes(item.name)) {
        names.push(item.name);
      }
    }
  }
  
  return names;
};

/**
 * Maps name array back to filter objects with id arrays grouped by category
 * Transforms [name1, name2, ...] to {types: [id1, id2, ...], holidayThemes: [id3, ...], ...}
 */
const mapNameEnumToFilters = (
  nameEnum: string[],
  originalFilters: Record<string, any[]>
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  
  // Create a map of name to item with category for quick lookup
  const nameToItemMap = new Map<string, { id: string; category: string }>();
  
  for (const [category, items] of Object.entries(originalFilters)) {
    for (const item of items) {
      if (item.name && !nameToItemMap.has(item.name)) {
        nameToItemMap.set(item.name, { 
          id: item.id, 
          category 
        });
      }
    }
  }
  
  // Group by category
  for (const name of nameEnum) {
    const item = nameToItemMap.get(name);
    if (item) {
      const category = item.category;
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(item.id);
    }
  }
  
  return result;
};

const filterNames = mapFiltersToNameEnum(getFilters());
//#endregion



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


// ============================================================================
// Tool Registration
// ============================================================================


// Experience Discovery
server.registerTool(
  "getAllExperiences",
  {
    title: "Get All Experiences",
    description: "Get all the experiences from the DSAPI",
    inputSchema: {
      region: z
        .enum(["kaernten"])
        .default("kaernten")
        .describe("Region code"),
      language: z
        .enum(["de", "en", "it"])
        .default("de")
        .describe("Language code"),
      currency: z
        .enum(["EUR", "USD", "GBP"])
        .default("EUR")
        .describe("Currency code"),
      pageNo: z.number().default(0).describe("Page number (0-based)"),
      pageSize: z.number().default(5).describe("Number of results per page"),
    },
  },
  async ({ region, language, currency, pageNo, pageSize }) => {
    const filterId = await createFilter();
    const params = new URLSearchParams({
      filterId,
      currency,
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const result = await makeDSAPIRequest<Record<string, unknown>>(
      `/addservices/${region}/${language}/?${params.toString()}`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }
);

server.registerTool("getAllExperiencesFilteredBy",
  {
    title: "Get All Experiences Filtered By",
    description: "Get all the experiences from the DSAPI filtered by a filter object",
    inputSchema: {
      filters: z.array(z.enum(filterNames as [string, ...string[]]))
      .describe("Filters that could be used to filter experiences"),
      region: z
        .enum(["kaernten"])
        .default("kaernten")
        .describe("Region code"),
      language: z
        .enum(["de", "en", "it"])
        .default("de")
        .describe("Language code"),
      currency: z
        .enum(["EUR", "USD", "GBP"])
        .default("EUR")
        .describe("Currency code"),
      pageNo: z.number().default(0).describe("Page number (0-based)"),
      pageSize: z.number().default(5).describe("Number of results per page"),
    },
  },
  async ({ filters, region, language, currency, pageNo, pageSize }) => {
    const filterId = await createFilter();
    const filterObject = mapNameEnumToFilters(filters, getFilters());
    const updatedFilterId = await updateFilter(filterId, filterObject);
    const params = new URLSearchParams({
      filterId: updatedFilterId,
      currency,
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const result = await makeDSAPIRequest<Record<string, unknown>>(
      `/addservices/${region}/${language}/?${params.toString()}`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }
);
server.registerTool('getAllAvailableFilters',
  {
    title: 'Get All Available Filters',
    description: 'Get all the available filters',
    inputSchema: {
    },
  },
  () =>  ({
    content: [{ type: "text", text: JSON.stringify(filterNames, null, 2) }],
    structuredContent: { filters: filterNames },
  })
);

server.registerTool('getAllAvailableProductsForAnExperience',
  {
    title: 'Get All Available Products For An Experience',
    description: 'Get all the available products for an experience',
    inputSchema: {
      experienceId: z.string().describe('ID of the experience'),
      spIdentity: z.string().describe('ID of the service provider'),
      region: z
        .enum(["kaernten"])
        .default("kaernten")
        .describe("Region code"),
      language: z
        .enum(["de", "en", "it"])
        .default("de")
        .describe("Language code"),
      currency: z
        .enum(["EUR", "USD", "GBP"])
        .default("EUR")
        .describe("Currency code"),
      pageNo: z.number().default(0).describe("Page number (0-based)"),
      pageSize: z.number().default(5).describe("Number of results per page"),
    },
  },
  async ({ experienceId, spIdentity, region, language, currency, pageNo, pageSize }) => {
    const params = new URLSearchParams({
      currency,
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const result = await makeDSAPIRequest<Record<string, unknown>>(
      `/addservices/${region}/${language}/${spIdentity}/services/${experienceId}/products?${params.toString()}`
    );
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
        console.warn('transport', transport);
        res.on('close', () => {
            transport.close();
        });


        res.on('error', (error) => {
            console.error('Error in MCP server:', error);
            transport.close();
        });
        await server.connect(transport);
        console.warn('server connected');
        await transport.handleRequest(req, res, req.body);        
        console.warn('transport handled');
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
