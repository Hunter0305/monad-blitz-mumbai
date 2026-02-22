/**
 * IPFS utilities for proof storage and retrieval.
 * Uses Pinata SDK for uploads and public gateways for fetching.
 */

const PINATA_JWT = process.env.PINATA_JWT;
const GATEWAY_URL = "https://gateway.pinata.cloud/ipfs";

/**
 * Upload proof content to IPFS via Pinata
 * Returns the IPFS CID
 */
export async function uploadProof(
  content: Buffer | string,
  filename: string
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT environment variable not set");
  }

  const blob =
    typeof content === "string"
      ? new Blob([content], { type: "text/plain" })
      : new Blob([content]);

  const formData = new FormData();
  formData.append("file", blob, filename);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  console.log(`📌 Uploaded to IPFS: ${data.IpfsHash}`);
  return data.IpfsHash;
}

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadJSON(
  content: Record<string, unknown>,
  name?: string
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT environment variable not set");
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: name ? { name } : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pinata JSON upload failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  console.log(`📌 Uploaded JSON to IPFS: ${data.IpfsHash}`);
  return data.IpfsHash;
}

/**
 * Fetch proof content from IPFS
 */
export async function fetchProofFromIPFS(
  cidOrURL: string,
  timeout: number = 30000
): Promise<string> {
  try {
    let url: string;

    // Handle raw CID
    if (cidOrURL.startsWith("Qm") || cidOrURL.startsWith("bafy")) {
      url = `${GATEWAY_URL}/${cidOrURL}`;
    } else if (cidOrURL.startsWith("http")) {
      url = cidOrURL;
    } else {
      throw new Error(`Invalid IPFS reference: ${cidOrURL}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error("IPFS fetch error:", error);
    throw new Error(`Failed to fetch proof from IPFS: ${error}`);
  }
}

/**
 * Extract text from common proof formats (markdown, JSON, plain text)
 */
export function parseProofContent(content: string): string {
  try {
    // Try parsing as JSON first
    const json = JSON.parse(content);
    if (json.proof) return json.proof;
    if (json.content) return json.content;
    if (json.description) return json.description;
    return JSON.stringify(json);
  } catch {
    // Not JSON, return as-is
    return content;
  }
}

/**
 * Build a Pinata gateway URL from a CID
 */
export function getIPFSUrl(cid: string): string {
  if (cid.startsWith("http")) return cid;
  return `${GATEWAY_URL}/${cid}`;
}
