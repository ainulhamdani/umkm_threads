import { mkdir } from "node:fs/promises";

type ApiItem = { code: string; name: string };
type ApiResponse = { data: ApiItem[]; meta?: { updated_at?: string } };
type LocationRecord = { code: string; level: "PROVINCE" | "CITY_REGENCY" | "DISTRICT"; name: string; parentCode: string | null };

const baseUrl = "https://wilayah.id/api";
const sourceUrl = "https://data.go.id/dataset/dataset/kode-administrasi-wilayah";
const snapshotUrl = "https://wilayah.id/";

async function readApi(path: string): Promise<ApiResponse> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${baseUrl}/${path}`, {
      headers: { "user-agent": "Threads-UMKM-location-seed/1.0" },
    });
    if (response.ok) return await response.json() as ApiResponse;
    if (![403, 429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`Gagal memuat dataset wilayah: ${response.status} ${path}`);
    }
    await Bun.sleep(attempt * 500);
  }
  throw new Error(`Gagal memuat dataset wilayah: ${path}`);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const provincesResponse = await readApi("provinces.json");
const locations: LocationRecord[] = provincesResponse.data.map((item) => ({
  code: item.code,
  level: "PROVINCE",
  name: item.name,
  parentCode: null,
}));

const regencyGroups = await mapWithConcurrency(provincesResponse.data, 8, async (province) => {
  const response = await readApi(`regencies/${province.code}.json`);
  return response.data.map((regency) => ({ ...regency, parentCode: province.code }));
});
const regencies = regencyGroups.flat();
for (const regency of regencies) {
  locations.push({ code: regency.code, level: "CITY_REGENCY", name: regency.name, parentCode: regency.parentCode });
}

const districtGroups = await mapWithConcurrency(regencies, 4, async (regency) => {
  const response = await readApi(`districts/${regency.code}.json`);
  return response.data.map((district) => ({ ...district, parentCode: regency.code }));
});
for (const districts of districtGroups) {
  for (const district of districts) {
    locations.push({ code: district.code, level: "DISTRICT", name: district.name, parentCode: district.parentCode });
  }
}

const uniqueCodes = new Set(locations.map((location) => location.code));
if (uniqueCodes.size !== locations.length) throw new Error("Dataset wilayah memiliki kode duplikat.");
const knownCodes = new Set(locations.map((location) => location.code));
if (locations.some((location) => location.parentCode !== null && !knownCodes.has(location.parentCode))) {
  throw new Error("Dataset wilayah memiliki parent yang tidak ditemukan.");
}

const datasetVersion = provincesResponse.meta?.updated_at ?? "tidak-diketahui";
const locationDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(locations)));
const checksumSha256 = Array.from(new Uint8Array(locationDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
const payload = {
  metadata: {
    sourceUrl,
    snapshotUrl,
    retrievedAt: new Date().toISOString().slice(0, 10),
    datasetVersion,
    rowCount: locations.length,
    checksumSha256,
  },
  locations,
};
const serialized = JSON.stringify(payload, null, 2);
await mkdir("data", { recursive: true });
await Bun.write("data/locations.json", `${serialized}\n`);
const checksum = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${serialized}\n`));
const checksumHex = Array.from(new Uint8Array(checksum), (byte) => byte.toString(16).padStart(2, "0")).join("");
console.log(`Dataset wilayah dibuat: ${locations.length} baris, SHA-256 ${checksumSha256} (berkas ${checksumHex})`);

export {};
