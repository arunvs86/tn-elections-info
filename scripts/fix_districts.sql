-- ============================================================
-- Fix district assignments for 6 new districts (created 2019-2020)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. CHENGALPATTU (carved from Kanchipuram in 2019)
-- 7 constituencies move: Kanchipuram → Chengalpattu
UPDATE constituencies SET district = 'Chengalpattu'
WHERE district = 'Kanchipuram'
  AND name IN (
    'Chengalpattu',
    'Cheyyur',
    'Maduranthakam',
    'Pallavaram',
    'Shozhinganallur',
    'Tambaram',
    'Thiruporur'
  );
-- Kanchipuram keeps: Alandur, Kancheepuram, Sriperumbudur, Uthiramerur (4)

-- 2. KALLAKURICHI (carved from Villupuram in 2019)
-- 4 constituencies move: Villupuram → Kallakurichi
UPDATE constituencies SET district = 'Kallakurichi'
WHERE district = 'Villupuram'
  AND name IN (
    'Kallakurichi',
    'Rishivandiam',
    'Sankarapuram',
    'Ulundurpet'
  );
-- Villupuram keeps: Gingee, Mailam, Tindivanam, Tirukkoyilur, Vanur, Vikravandi, Villupuram (7)

-- 3. RANIPET (carved from Vellore in 2019)
-- 4 constituencies move: Vellore → Ranipet
UPDATE constituencies SET district = 'Ranipet'
WHERE district = 'Vellore'
  AND name IN (
    'Arakonam',
    'Arcot',
    'Ranipet',
    'Sholinghur'
  );

-- 4. TIRUPATHUR (carved from Vellore in 2019)
-- 4 constituencies move: Vellore → Tirupathur
UPDATE constituencies SET district = 'Tirupathur'
WHERE district = 'Vellore'
  AND name IN (
    'Ambur',
    'Jolarpet',
    'Tiruppattur',
    'Vaniayambadi'
  );
-- Vellore keeps: Anaikattu, Gudiyatham, Katpadi, Kilvaithinankuppam, Vellore (5)

-- 5. TENKASI (carved from Tirunelveli in 2019)
-- 5 constituencies move: Tirunelveli → Tenkasi
UPDATE constituencies SET district = 'Tenkasi'
WHERE district = 'Tirunelveli'
  AND name IN (
    'Alangulam',
    'Kadayanallur',
    'Sankarankovil',
    'Tenkasi',
    'Vasudevanallur'
  );
-- Tirunelveli keeps: Ambasamudram, Nanguneri, Palayamcottai, Radhapuram, Tirunelveli (5)

-- 6. MAYILADUTHURAI (carved from Nagapattinam in 2020)
-- 3 constituencies move: Nagapattinam → Mayiladuthurai
UPDATE constituencies SET district = 'Mayiladuthurai'
WHERE district = 'Nagapattinam'
  AND name IN (
    'Mayiladuthurai',
    'Sirkali',
    'Poompuhar'
  );
-- Nagapattinam keeps: Kilvelur, Nagapattinam, Vedaranyam (3)

-- ============================================================
-- Verify: should show 38 districts
-- ============================================================
SELECT district, COUNT(*) as constituencies
FROM constituencies
GROUP BY district
ORDER BY district;
