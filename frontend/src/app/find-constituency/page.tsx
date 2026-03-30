"use client";

import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";
import Link from "next/link";

interface PincodeResult {
  constituencies: string[];
  district: string;
  areas: string[];
  lat: number;
  lon: number;
}

type PincodeMap = Record<string, PincodeResult>;

interface GeoFeature {
  type: string;
  properties: Record<string, string>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoFeatureCollection {
  type: string;
  features: GeoFeature[];
}

export default function FindConstituencyPage() {
  const { t } = useLang();
  const [pincode, setPincode] = useState("");
  const [pincodeMap, setPincodeMap] = useState<PincodeMap | null>(null);
  const [result, setResult] = useState<PincodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_loading] = useState(false); // reserved for future use
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsResult, setGpsResult] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<GeoFeatureCollection | null>(null);

  // Load PIN code map on mount
  useEffect(() => {
    fetch("/data/pincode_constituency_map.json")
      .then((r) => r.json())
      .then((data) => setPincodeMap(data))
      .catch(() => setPincodeMap({}));
  }, []);

  // Lazy-load GeoJSON for GPS lookup
  const loadGeoData = useCallback(async (): Promise<GeoFeatureCollection> => {
    if (geoData) return geoData;
    const resp = await fetch("/data/tn_constituencies.geojson");
    const data = await resp.json() as GeoFeatureCollection;
    setGeoData(data);
    return data;
  }, [geoData]);

  function handlePincodeSearch() {
    setError(null);
    setResult(null);
    setGpsResult(null);

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setError(t("find.error_invalid_pin"));
      return;
    }

    if (!pincodeMap) {
      setError(t("find.error_loading"));
      return;
    }

    const match = pincodeMap[pincode];
    if (match) {
      setResult(match);
    } else {
      setError(t("find.error_not_found"));
    }
  }

  // Point-in-polygon using ray casting (client-side, no library needed)
  function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function findConstituencyByCoords(lat: number, lon: number, features: GeoFeature[]): string | null {
    const point: [number, number] = [lon, lat];
    for (const feat of features) {
      const geom = feat.geometry;
      if (geom.type === "Polygon") {
        if (pointInPolygon(point, geom.coordinates[0] as number[][])) {
          return feat.properties?.AC_NAME || null;
        }
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates as number[][][][]) {
          if (pointInPolygon(point, poly[0] as number[][])) {
            return feat.properties?.AC_NAME || null;
          }
        }
      }
    }
    return null;
  }

  async function handleGPSLookup() {
    setError(null);
    setResult(null);
    setGpsResult(null);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      setError(t("find.error_no_gps"));
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const geo = await loadGeoData();
          const name = findConstituencyByCoords(latitude, longitude, geo.features);
          if (name) {
            setGpsResult(name);
          } else {
            setError(t("find.error_outside_tn"));
          }
        } catch {
          setError(t("find.error_geo_load"));
        }
        setGpsLoading(false);
      },
      () => {
        setError(t("find.error_gps_denied"));
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function constituencySlug(name: string): string {
    return name
      .replace(/\s*\(.*?\)\s*/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header active="home" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-terracotta">{t("nav.home")}</Link>
          {" / "}
          <span className="text-gray-800">{t("find.title")}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
          {t("find.title")}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {t("find.subtitle")}
        </p>

        {/* PIN Code Input */}
        <div className="card mb-6">
          <h2 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">📮</span> {t("find.pin_title")}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handlePincodeSearch()}
              placeholder={t("find.pin_placeholder")}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest outline-none focus:border-terracotta text-center"
            />
            <button
              onClick={handlePincodeSearch}
              disabled={!pincodeMap}
              className="bg-terracotta text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#a33d0e] transition-colors disabled:opacity-50"
            >
              {t("find.search_btn")}
            </button>
          </div>
          {!pincodeMap && (
            <p className="text-xs text-gray-400 mt-2 text-center">{t("common.loading")}</p>
          )}
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">{t("find.or")}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* GPS Lookup */}
        <div className="card mb-6">
          <h2 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">📍</span> {t("find.gps_title")}
          </h2>
          <button
            onClick={handleGPSLookup}
            disabled={gpsLoading}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {gpsLoading ? (
              <>
                <span className="animate-spin">⏳</span> {t("find.gps_loading")}
              </>
            ) : (
              <>📍 {t("find.gps_btn")}</>
            )}
          </button>
          <p className="text-[10px] text-gray-400 mt-2 text-center">{t("find.gps_note")}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* PIN Code Result */}
        {result && (
          <div className="card border-l-4 border-l-terracotta mb-6">
            <h3 className="font-bold text-lg text-gray-900 mb-3">
              {t("find.result_title")}
            </h3>
            {result.constituencies.map((name) => (
              <Link
                key={name}
                href={`/constituency/${constituencySlug(name)}`}
                className="block bg-gradient-to-r from-terracotta/5 to-transparent border border-terracotta/20 rounded-xl px-4 py-3 mb-2 hover:shadow-md transition-all group"
              >
                <p className="font-bold text-terracotta text-lg group-hover:underline">{name}</p>
                <p className="text-xs text-gray-500">{result.district} {t("common.district")}</p>
              </Link>
            ))}
            {result.areas.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">{t("find.areas_covered")}:</p>
                <div className="flex flex-wrap gap-1">
                  {result.areas.map((a) => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GPS Result */}
        {gpsResult && (
          <div className="card border-l-4 border-l-green-500 mb-6">
            <h3 className="font-bold text-lg text-gray-900 mb-3">
              📍 {t("find.gps_result_title")}
            </h3>
            <Link
              href={`/constituency/${constituencySlug(gpsResult)}`}
              className="block bg-gradient-to-r from-green-50 to-transparent border border-green-200 rounded-xl px-4 py-3 hover:shadow-md transition-all group"
            >
              <p className="font-bold text-green-700 text-lg group-hover:underline">{gpsResult}</p>
              <p className="text-xs text-gray-500">{t("find.view_candidates")} →</p>
            </Link>
          </div>
        )}

        {/* Find Your Polling Booth */}
        <div className="bg-[#FFF8F0] border border-[#E8D5C4] rounded-[14px] px-5 py-5 mb-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🗳️</span> Find Your Polling Booth
          </h3>

          <div className="space-y-3 mb-4">
            <a
              href="https://electoralsearch.eci.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-terracotta text-white text-center py-3 rounded-[14px] font-semibold text-sm hover:bg-[#a33d0e] transition-colors"
            >
              Search on ECI Website →
            </a>
            <a
              href="https://www.elections.tn.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white border border-terracotta/30 text-terracotta text-center py-3 rounded-[14px] font-semibold text-sm hover:bg-terracotta/5 transition-colors"
            >
              CEO Tamil Nadu →
            </a>
          </div>

          <div className="bg-white/70 border border-[#E8D5C4] rounded-[14px] px-4 py-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-700">Tip:</span> Your booth number is printed on your Voter ID card (EPIC). Look for &quot;Part No&quot; and &quot;Polling Station&quot;.
            </p>
          </div>
        </div>

        {/* What to Carry */}
        <div className="bg-[#FFF8F0] border border-[#E8D5C4] rounded-[14px] px-5 py-5">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span> What to Carry
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span className="text-gray-700"><span className="font-semibold">Voter ID (EPIC)</span> — primary ID</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span className="text-gray-700"><span className="font-semibold">Any photo ID:</span> Aadhaar, PAN, Passport, Driving License</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">❌</span>
              <span className="text-gray-700"><span className="font-semibold">Mobile phones</span> NOT allowed inside booth</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⏰</span>
              <span className="text-gray-700"><span className="font-semibold">Voting hours:</span> 7 AM – 6 PM, April 23</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
