"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/components/LanguageProvider";

// ── Party data ───────────────────────────────────────
interface Party {
  slug: string;
  name: string;
  abbreviation: string;
  leader: string;
  founded: number;
  color: string;
  seats2021: number;
  ideology: string;
  alliance2026: string;
  keyAchievements: string[];
  keyAllegations: string[];
}

const PARTIES: Party[] = [
  {
    slug: "dmk",
    name: "Dravida Munnetra Kazhagam",
    abbreviation: "DMK",
    leader: "M.K. Stalin",
    founded: 1949,
    color: "#c0392b",
    seats2021: 133,
    ideology: "Dravidian, Social democracy",
    alliance2026: "DMK-SPA (INDIA). ~165 seats + Congress 28, DMDK 10, VCK 8, CPI 5, CPI(M) 5, MDMK 5, IUML 2, others",
    keyAchievements: [
      "Free bus travel for women on government buses",
      "Breakfast scheme for government school children",
      "Naan Mudhalvan youth skills programme",
      "Rs 1,000 Kalaignar Magalir Urimai Thogai for women",
      "Reduced petrol/diesel prices by cutting state tax",
    ],
    keyAllegations: [
      "Cash-for-jobs scam allegations in TNPSC recruitment",
      "Illegal sand mining nexus allegations",
      "Neet exam opposition vs central policy friction",
      "Corruption charges in Chennai Metro Phase 2 contracts",
    ],
  },
  {
    slug: "aiadmk",
    name: "All India Anna Dravida Munnetra Kazhagam",
    abbreviation: "AIADMK",
    leader: "Edappadi K. Palaniswami",
    founded: 1972,
    color: "#2d7a4f",
    seats2021: 66,
    ideology: "Dravidian, Populism",
    alliance2026: "AIADMK-NDA. 178 seats. With BJP (27), PMK (18), AMMK (11), TMC(M), IJK",
    keyAchievements: [
      "AIIMS in Madurai during AIADMK's central alliance",
      "Amma Canteen scheme (subsidized food)",
      "Amma Free Laptop scheme for students",
      "Chennai Metro Phase 1 completion",
    ],
    keyAllegations: [
      "Gutkha scam — alleged bribery for allowing banned products",
      "Party leadership feud: EPS vs OPS faction split",
      "Allegations of governance paralysis after Jayalalithaa's demise",
      "Sterlite Copper plant protest handling in Thoothukudi (13 killed)",
    ],
  },
  {
    slug: "bjp",
    name: "Bharatiya Janata Party",
    abbreviation: "BJP",
    leader: "K. Annamalai",
    founded: 1980,
    color: "#d35400",
    seats2021: 4,
    ideology: "Hindu nationalism, Right-wing",
    alliance2026: "AIADMK-NDA. 27 seats under AIADMK alliance",
    keyAchievements: [
      "AIIMS Madurai sanctioned under NDA government",
      "Puducherry-Chennai connectivity projects",
      "Defence Corridor in Tamil Nadu (Tiruchirappalli-Salem)",
      "PM-Kisan direct benefit transfers",
    ],
    keyAllegations: [
      "Hindi imposition concerns in Tamil Nadu",
      "NEET exam controversy affecting TN students",
      "Allegations of using ED/CBI against opposition parties",
      "Weak grassroots organization in TN",
    ],
  },
  {
    slug: "tvk",
    name: "Tamilaga Vettri Kazhagam",
    abbreviation: "TVK",
    leader: "Vijay",
    founded: 2024,
    color: "#1a5276",
    seats2021: 0,
    ideology: "Social justice, Anti-corruption",
    alliance2026: "Going Solo. All 234 seats. Vijay contesting from Perambur.",
    keyAchievements: [
      "Massive public rally at Villupuram (estimated 1M+ attendance)",
      "Social media mobilization of youth voters",
      "Positioned as clean alternative to established parties",
    ],
    keyAllegations: [
      "No governance track record to evaluate",
      "Party funding sources questioned",
      "Candidate selection criteria unclear",
    ],
  },
  {
    slug: "ntk",
    name: "Naam Tamilar Katchi",
    abbreviation: "NTK",
    leader: "Seeman",
    founded: 2010,
    color: "#6c3483",
    seats2021: 0,
    ideology: "Tamil nationalism, Social justice",
    alliance2026: "Going Solo, 5th time. 117 men + 117 women candidates. Seeman from Karaikudi.",
    keyAchievements: [
      "Consistent 5-7% vote share increase in each election",
      "Strong cadre-based organization",
      "Voice for Sri Lankan Tamil issues",
      "Progressive stance on caste annihilation",
    ],
    keyAllegations: [
      "Controversial statements on sensitive ethnic issues",
      "Accused of splitting anti-DMK votes",
      "No legislative track record (no seats won)",
    ],
  },
  {
    slug: "dmdk",
    name: "Desiya Murpokku Dravida Kazhagam",
    abbreviation: "DMDK",
    leader: "Vijayakanth (Premalatha Vijayakanth)",
    founded: 2005,
    color: "#2e86c1",
    seats2021: 0,
    ideology: "Dravidian, Anti-corruption",
    alliance2026: "DMK-SPA. 10 seats. Shifted from NDA to DMK alliance.",
    keyAchievements: [
      "Won 29 seats in 2011 as part of AIADMK alliance",
      "Captain Vijayakanth's anti-corruption image drew youth voters",
      "Strong base in western Tamil Nadu districts",
    ],
    keyAllegations: [
      "Party weakened after Vijayakanth's health decline",
      "Frequent alliance switches — AIADMK to NDA to DMK",
      "Internal leadership disputes",
    ],
  },
  {
    slug: "pmk",
    name: "Pattali Makkal Katchi",
    abbreviation: "PMK",
    leader: "Anbumani Ramadoss",
    founded: 1989,
    color: "#8b4513",
    seats2021: 5,
    ideology: "Vanniyar community, Social justice",
    alliance2026: "AIADMK-NDA. 18 seats. Joined AIADMK front Jan 7, 2026.",
    keyAchievements: [
      "10.5% internal reservation for Vanniyars (secured in AIADMK alliance)",
      "Anti-liquor agitation legacy",
      "Strong North TN grassroots base",
    ],
    keyAllegations: [
      "Frequent alliance-switching (DMK to AIADMK to NDA)",
      "Caste-based politics criticism",
      "Vanniyar reservation bill legal challenges",
    ],
  },
];

// ── Party colour helper ────────────────────
function partyColor(party: string): string {
  const found = PARTIES.find((p) => p.abbreviation === party);
  return found?.color || "#888";
}

export default function PartiesPage() {
  const { t } = useLang();
  const [selectedParty, setSelectedParty] = useState<string>("dmk");

  const party = PARTIES.find((p) => p.slug === selectedParty) || PARTIES[0];

  return (
    <div className="min-h-screen bg-cream">
      <Header active="parties" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-2">
          <Link href="/" className="hover:text-terracotta">{t("nav.home")}</Link>
          {" / "}
          <span className="text-gray-600 font-medium">{t("parties.title")}</span>
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          {t("parties.title")}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {t("parties.subtitle")}
        </p>

        {/* Party tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PARTIES.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedParty(p.slug)}
              className={`px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border ${
                selectedParty === p.slug
                  ? "text-white shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              style={
                selectedParty === p.slug
                  ? { background: p.color, borderColor: p.color }
                  : {}
              }
            >
              {p.abbreviation}
            </button>
          ))}
        </div>

        {/* Party detail card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left: Party info */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div
                className="w-full h-2 rounded-full mb-4"
                style={{ background: party.color }}
              />
              <h2 className="text-xl font-bold text-gray-900">{party.name}</h2>
              <p className="text-sm text-gray-500">{party.abbreviation}</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("parties.leader")}</span>
                  <span className="font-medium text-gray-900">{party.leader}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("parties.founded")}</span>
                  <span className="font-medium text-gray-900">{party.founded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("parties.ideology")}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{party.ideology}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("parties.seats_2021")}</span>
                  <span className="font-bold text-lg" style={{ color: party.color }}>{party.seats2021}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("parties.alliance_2026")}</span>
                  <span className="font-medium text-gray-900">{party.alliance2026}</span>
                </div>
              </div>
            </div>

            {/* Seats visual */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-3">{t("parties.seat_share")}</h3>
              <div className="flex rounded-full overflow-hidden h-4 mb-2">
                <div
                  style={{ width: `${(party.seats2021 / 234) * 100}%`, background: party.color }}
                  className="transition-all"
                />
                <div className="flex-1 bg-gray-100" />
              </div>
              <p className="text-xs text-gray-500">
                {party.seats2021} {t("parties.of_234_seats")} ({((party.seats2021 / 234) * 100).toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* Right: Achievements & Allegations */}
          <div className="lg:col-span-2 space-y-4">
            {/* Achievements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {t("parties.achievements")}
              </h3>
              <div className="space-y-2">
                {party.keyAchievements.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                    <span className="text-green-600 text-xs mt-0.5 flex-shrink-0">+</span>
                    <p className="text-sm text-gray-700">{a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Allegations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {t("parties.allegations")}
              </h3>
              <div className="space-y-2">
                {party.keyAllegations.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <span className="text-red-600 text-xs mt-0.5 flex-shrink-0">!</span>
                    <p className="text-sm text-gray-700">{a}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                {t("parties.disclaimer")}
              </p>
            </div>

            {/* Quick comparison */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-3">{t("parties.quick_comparison")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs sm:text-sm text-gray-500 font-medium">{t("parties.table_party")}</th>
                      <th className="text-center py-2 text-xs sm:text-sm text-gray-500 font-medium">{t("parties.table_seats")}</th>
                      <th className="text-center py-2 text-xs sm:text-sm text-gray-500 font-medium">{t("parties.table_alliance")}</th>
                      <th className="text-center py-2 text-xs sm:text-sm text-gray-500 font-medium">{t("parties.table_leader")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PARTIES.map((p) => (
                      <tr
                        key={p.slug}
                        className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                          p.slug === selectedParty ? "bg-gray-50" : ""
                        }`}
                        onClick={() => setSelectedParty(p.slug)}
                      >
                        <td className="py-2 font-medium" style={{ color: p.color }}>
                          {p.abbreviation}
                        </td>
                        <td className="py-2 text-center font-bold">{p.seats2021}</td>
                        <td className="py-2 text-center text-gray-600">{p.alliance2026}</td>
                        <td className="py-2 text-center text-gray-600">{p.leader}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
