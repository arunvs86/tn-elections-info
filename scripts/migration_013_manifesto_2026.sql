-- Migration 013: Create manifesto_promises table + seed 2026 DMK & AIADMK promises
-- Run in Supabase SQL Editor

-- ──────────────────────────────────────────────────────────────────
-- 1. Create table (if not already created by earlier migration)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manifesto_promises (
  id                    SERIAL PRIMARY KEY,
  party                 TEXT NOT NULL,
  election_year         INTEGER NOT NULL DEFAULT 2026,
  promise_text          TEXT NOT NULL,
  promise_text_tamil    TEXT,
  category              TEXT,
  is_flagship           BOOLEAN DEFAULT FALSE,
  -- Scoring (for 2026 promises)
  fiscal_score          NUMERIC(3,1),
  specificity_score     NUMERIC(3,1),
  past_delivery_score   NUMERIC(3,1),
  overall_score         NUMERIC(3,1),
  believability_label   TEXT,   -- 'Very Likely' | 'Likely' | 'Uncertain' | 'Unlikely'
  ai_reasoning          TEXT,
  -- Delivery audit (for past election promises)
  status                TEXT,   -- 'kept' | 'partially_kept' | 'broken' | 'pending'
  evidence              TEXT,
  evidence_ta           TEXT,
  source_url            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE manifesto_promises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read manifesto" ON manifesto_promises;
CREATE POLICY "Public read manifesto" ON manifesto_promises FOR SELECT USING (true);
GRANT SELECT ON manifesto_promises TO anon, authenticated;

-- Add is_flagship column if table already existed without it
ALTER TABLE manifesto_promises ADD COLUMN IF NOT EXISTS is_flagship BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────────
-- 2. Remove any old 2026 seed data (safe re-run)
-- ──────────────────────────────────────────────────────────────────
DELETE FROM manifesto_promises WHERE election_year = 2026;

-- ──────────────────────────────────────────────────────────────────
-- 3. DMK 2026 Manifesto Promises
-- ──────────────────────────────────────────────────────────────────
INSERT INTO manifesto_promises
  (party, election_year, category, is_flagship, promise_text, promise_text_tamil,
   fiscal_score, specificity_score, overall_score, believability_label, ai_reasoning)
VALUES

-- CASH BENEFITS
('DMK', 2026, 'cash_benefits', TRUE,
 'Increase Kalaignar Magalir Urimai Thittam (women''s rights scheme) from ₹1,000 to ₹2,000 per month for eligible women',
 'கலைஞர் மகளிர் உரிமைத் தொகை ₹1,000-லிருந்து ₹2,000-ஆக உயர்த்தப்படும்',
 5.5, 9.0, 7.0, 'Very Likely',
 'Already running scheme — expansion is administratively straightforward. Costs ~₹12,000 crore/year additional. Precedent set by DMK''s own implementation.'),

('DMK', 2026, 'cash_benefits', FALSE,
 'Increase elderly assistance from ₹1,200 to ₹2,000 per month',
 'முதியோர் உதவித்தொகை ₹1,200-லிருந்து ₹2,000-ஆக உயர்த்தப்படும்',
 5.0, 9.0, 7.0, 'Likely',
 'Well-defined promise with clear numbers. Similar increases have been implemented by past governments. Adds ~₹4,000 crore/year.'),

('DMK', 2026, 'cash_benefits', FALSE,
 'Differently-abled allowance raised from ₹1,500 to ₹2,500; severe disability monthly support from ₹2,000 to ₹4,000',
 'மாற்றுத்திறனாளிகளுக்கான உதவித்தொகை ₹1,500-லிருந்து ₹2,500-ஆகவும், கடுமையான குறைபாடுள்ளோருக்கு ₹2,000-லிருந்து ₹4,000-ஆகவும் உயர்த்தப்படும்',
 5.5, 9.0, 7.0, 'Likely',
 'Modest fiscal impact. Precedent from current DMK regime which has been expanding welfare amounts.'),

-- AGRICULTURE
('DMK', 2026, 'agriculture', TRUE,
 'Free electricity for agricultural pump sets for 20 lakh farmers (up from current partial subsidy)',
 '20 லட்சம் விவசாயிகளுக்கு இலவச மின்சாரம் வழங்கப்படும்',
 4.0, 8.0, 6.0, 'Likely',
 'Already partially implemented. Full extension adds fiscal burden ~₹5,000 crore/year but politically high priority.'),

('DMK', 2026, 'agriculture', TRUE,
 'Paddy MSP increased to ₹2,500/quintal immediately, with ₹3,500/quintal as target',
 'நெல்லுக்கு ₹2,500 MSP உடனடியாக, ₹3,500 இலக்காக நிர்ணயிக்கப்படும்',
 4.5, 8.5, 6.5, 'Likely',
 'State MSP top-up is feasible. Current central MSP ~₹2,183. State governments have done this before.'),

('DMK', 2026, 'agriculture', FALSE,
 'Organic farming expansion to 1 lakh hectares with full support infrastructure',
 'இயற்கை விவசாயம் 1 லட்சம் ஹெக்டேர் விரிவாக்கப்படும்',
 5.5, 7.0, 6.5, 'Likely',
 'Ambitious but achievable with existing subsidy framework. Good for branding and sustainability.'),

('DMK', 2026, 'agriculture', FALSE,
 'Loan waiver for farmers under cooperative banks and primary agricultural credit societies',
 'கூட்டுறவு வங்கிகளில் விவசாயிகளுக்கான கடன் தள்ளுபடி',
 3.0, 7.0, 5.0, 'Uncertain',
 'No specific amount mentioned. State loan waivers have partial track records; full delivery is uncertain given fiscal constraints.'),

-- WOMEN
('DMK', 2026, 'women', FALSE,
 'Increase women''s SHG bank loan ceiling from ₹2 lakh crore in 5 years; priority government procurement from SHG products',
 'மகளிர் குழுக்களுக்கு ₹2 லட்சம் கோடி வங்கிக்கடன்; அரசு கொள்முதலில் முன்னுரிமை',
 5.0, 7.5, 6.5, 'Likely',
 'Continuation of existing SHG bank linkage program. Procurement priority has precedent in other states.'),

('DMK', 2026, 'women', FALSE,
 '1,000 childcare centers in industrial cities to help women workers by 2030',
 'தொழிற்சாலை நகரங்களில் 1,000 குழந்தைகாப்பகங்கள் 2030-க்குள் நிறுவப்படும்',
 5.5, 8.0, 6.5, 'Likely',
 'Specific target and timeline given. Addresses real gap for working mothers.'),

('DMK', 2026, 'women', FALSE,
 'Training 5 lakh women in 2-wheeler and bus driving with job placement support',
 '5 லட்சம் பெண்களுக்கு இரு சக்கர வாகன மற்றும் பேரந்து ஓட்டுதல் பயிற்சி',
 5.5, 8.0, 6.5, 'Likely',
 'Specific number given. Skill training programs have good delivery track record.'),

-- EDUCATION
('DMK', 2026, 'education', TRUE,
 'Zero Dropout Tamil Nadu — eliminate all school dropouts through monitoring, meals, and incentives',
 'பள்ளி இடைநிற்றல் இல்லாத தமிழ்நாடு — Zero Dropout TN',
 6.0, 7.5, 7.0, 'Likely',
 'Continuation of existing EMIS monitoring + midnight breakfast expansion. Strong institutional support.'),

('DMK', 2026, 'education', FALSE,
 'Breakfast scheme expanded from grades 1-5 to 1-10 across all government schools',
 'காலை உணவு திட்டம் 1-ஆம் வகுப்பிலிருந்து 10-ஆம் வகுப்பு வரை விரிவாக்கப்படும்',
 5.0, 9.5, 7.0, 'Very Likely',
 'Very specific promise. Adds ~₹1,200 crore/year but high political will. Already piloted.'),

('DMK', 2026, 'education', FALSE,
 '100% Smart Classrooms in all government schools by 2030',
 '2030-க்குள் அனைத்து அரசுப் பள்ளிகளிலும் 100% Smart Classrooms',
 5.5, 8.5, 7.0, 'Likely',
 'Clear target. Ongoing investment needed. DMK track record on school infrastructure is good.'),

('DMK', 2026, 'education', FALSE,
 'Laptops for 35 lakh higher education students in 5 years',
 'உயர்கல்வி மாணவர்களுக்கு 35 லட்சம் மடிக்கணினிகள் 5 ஆண்டுகளில்',
 4.5, 8.5, 6.5, 'Likely',
 'Well precedented — Jayalalithaa''s Amma laptop scheme, then DMK''s Naan Mudhalvan laptops. Roughly ₹5,000 crore.'),

('DMK', 2026, 'education', FALSE,
 'New National Education Policy (NEP) will not be implemented in Tamil Nadu; multi-language imposition will be resisted',
 'தமிழ்நாட்டில் புதிய தேசிய கல்விக் கொள்கை அமல்படுத்தப்படாது',
 8.0, 8.0, 8.0, 'Very Likely',
 'State jurisdiction over education. TN has already passed resolution against NEP. Fully within state''s power.'),

-- HEALTHCARE
('DMK', 2026, 'healthcare', TRUE,
 'HPV vaccination for all girls under 14 years — prevent cervical cancer',
 '14 வயதுக்குட்பட்ட அனைத்துப் பெண் குழந்தைகளுக்கும் HPV தடுப்பூசி',
 6.0, 9.0, 7.5, 'Very Likely',
 'Already piloted in Dharmapuri, Perambalur, Thiruvannamalai, Ariyalur. Central govt also expanding HPV nationally.'),

('DMK', 2026, 'healthcare', FALSE,
 'Free annual health checkup for all elderly citizens at government medical colleges',
 'முதியோர்களுக்கு அரசு மருத்துவக் கல்லூரிகளில் ஆண்டுதோறும் இலவச உடல்நல பரிசோதனை',
 5.5, 8.0, 7.0, 'Likely',
 'Institutionally feasible through existing medical college infrastructure.'),

-- EMPLOYMENT & ECONOMY
('DMK', 2026, 'employment', TRUE,
 'Tamil Nadu to become a $1 trillion economy by 2030 — attract ₹18 lakh crore investment, 50 lakh jobs',
 'தமிழ்நாட்டை 2030-க்குள் $1 டிரில்லியன் பொருளாதாரமாக மாற்றுவோம்',
 6.0, 7.0, 6.5, 'Likely',
 'Ambitious but directionally consistent with current growth trajectory. ₹18L crore MOU target may not all materialize but investment climate is strong.'),

('DMK', 2026, 'employment', FALSE,
 '500 new Global Capability Centres (GCCs) — make Tamil Nadu India''s #1 GCC destination',
 '500 புதிய GCC மையங்கள் — இந்தியாவின் முதல் GCC இடமாக தமிழ்நாடு',
 6.5, 7.5, 7.0, 'Likely',
 'TN already has 500+ GCCs. Additional 500 is ambitious but consistent with talent base and policy support.'),

('DMK', 2026, 'employment', FALSE,
 'Skill training for 50 lakh people by 2030 through Naan Mudhalvan 2.0 and other programs',
 '50 லட்சம் பேருக்கு திறன் பயிற்சி — நான் முதல்வன் 2.0',
 5.5, 8.0, 6.5, 'Likely',
 'Continuation of existing scheme. 48L certificates already issued. Scale-up is credible.'),

('DMK', 2026, 'employment', FALSE,
 'Semiconductor ecosystem — attract ₹50,000 crore investment to build TN as India''s semiconductor hub',
 'அரைக்கடத்தி உற்பத்திக்கு ₹50,000 கோடி முதலீடு ஈர்ப்போம்',
 4.5, 7.5, 6.0, 'Uncertain',
 'Dependent on global semiconductor investment decisions beyond state control. Vision is correct but specific ₹50K crore target uncertain.'),

-- INFRASTRUCTURE & TRANSPORT
('DMK', 2026, 'infrastructure', FALSE,
 '10,000 new modern buses for public transport within 5 years',
 'ஐந்து ஆண்டுகளில் 10,000 புதிய நவீன பேரந்துகள்',
 5.5, 9.0, 7.0, 'Likely',
 'Specific number. Costs ~₹5,000-6,000 crore. TNSTC fleet modernization has precedent.'),

('DMK', 2026, 'infrastructure', FALSE,
 'Metro rail for Coimbatore and Madurai — push central government for approval and funding',
 'கோவை மற்றும் மதுரை மெட்ரோ ரெயிலுக்காக மத்திய அரசை வலியுறுத்துவோம்',
 4.0, 6.5, 5.5, 'Uncertain',
 'Dependent on central government approval. State can only push; Metro is jointly funded. Timeline uncertain.'),

('DMK', 2026, 'infrastructure', FALSE,
 '3 new Multi-Modal Logistics Parks — make Tamil Nadu South Asia''s top logistics hub by 2030',
 '3 புதிய Multi-Modal Logistics Parks — 2030-க்குள் தென்னாசியாவின் முதல் சரக்கு மேலாண்மை மையம்',
 5.5, 7.5, 6.5, 'Likely',
 'Central support available under PM Gati Shakti. State infrastructure investment is credible.'),

-- HOUSING
('DMK', 2026, 'housing', TRUE,
 'Build 5 lakh new houses in 5 years under Kalaignar Dream Home scheme; 10 lakh total new houses',
 'கலைஞர் கனவு இல்லம் திட்டத்தில் 5 ஆண்டுகளில் 5 லட்சம் வீடுகள்',
 5.0, 8.5, 6.5, 'Likely',
 'Continuation of existing scheme. Previous DMK term completed 8.6L houses. Scale-up credible with PMAY support.'),

-- ENVIRONMENT
('DMK', 2026, 'environment', FALSE,
 'Tamil Nadu AI Mission 2.0 for climate adaptation — AI-based heat alerts, water management, agricultural advisories',
 'காலநிலை மாற்றத்திற்கு தமிழ்நாடு AI Mission 2.0',
 6.0, 7.0, 6.5, 'Likely',
 'TN-SPARK already operational. AI climate tools are scalable and cost-effective.'),

('DMK', 2026, 'environment', FALSE,
 'Coastal plantation from Kanniyakumari to Thiruvalluvar; forest fire detection using thermal sensors in Nilgiris, Dharmapuri, Krishnagiri',
 'கடல்கரை நடவுகளும் வனத்தீ கண்டறியும் நவீன உணரிகளும்',
 6.5, 8.0, 7.0, 'Likely',
 'Technically feasible. Forest dept infrastructure can absorb this investment.'),

-- FISHERIES
('DMK', 2026, 'fisheries', FALSE,
 'Fishing ban relief increased from ₹8,000 to ₹12,000; lean-season relief from ₹6,000 to ₹9,000',
 'மீன்பிடித் தடைக்காலத் தொகை ₹8,000-லிருந்து ₹12,000-ஆக; சிறப்பு நிவாரணம் ₹6,000-லிருந்து ₹9,000-ஆக',
 5.5, 9.5, 7.5, 'Very Likely',
 'Very specific amounts — high specificity. Adds ~₹400 crore/year. Politically high priority coastal constituency.'),

('DMK', 2026, 'fisheries', FALSE,
 'Aqua Zones in Cadalore district to boost marine fish production; cage fish production from 200 to 400 tonnes',
 'கடலூரில் Aqua Zones; கூண்டு மீன் உற்பத்தி 200-லிருந்து 400 டன்னாக',
 6.0, 8.0, 7.0, 'Likely',
 'Specific and measurable. Marine fisheries investment has good returns.'),

-- CULTURE & LANGUAGE
('DMK', 2026, 'culture_language', FALSE,
 'Oppose new National Education Policy on language imposition; protect Tamil as primary medium of instruction',
 'இந்தி திணிப்பை எதிர்ப்போம்; தமிழ் வழிக்கல்வியை பாதுகாப்போம்',
 9.0, 8.0, 8.5, 'Very Likely',
 'Core DMK identity. Fully within state government power. Historical consistency on this issue is very high.'),

('DMK', 2026, 'culture_language', FALSE,
 'Heritage Tourism package — special cultural tourism circuits connecting ancient Tholkappiam sites, art centers',
 'பண்பாட்டு சுற்றுலா சர்க்யூட் — தொல்காப்பியம் மற்றும் கலை மையங்களை இணைக்கும் திட்டம்',
 6.5, 7.0, 6.5, 'Likely',
 'Tourism investment has good economic multiplier. DMK has strong track record on cultural promotion.'),

-- SPORTS
('DMK', 2026, 'sports', FALSE,
 'Olympic gold medallists to receive ₹5 crore prize; silver ₹3 crore; bronze ₹2 crore',
 'ஒலிம்பிக் தங்கப் பதக்கம் ₹5 கோடி; வெள்ளி ₹3 கோடி; வெண்கலம் ₹2 கோடி',
 8.0, 9.5, 8.5, 'Very Likely',
 'Very specific and verifiable. Fiscal impact minimal. 19 international events already hosted under DMK 1.0.'),

('DMK', 2026, 'sports', FALSE,
 '400m synthetic running tracks in all district sports venues; Sports Hostels for talented youth athletes',
 'அனைத்து மாவட்ட விளையாட்டு வளாகங்களிலும் 400 மீட்டர் செயற்கை தடகள ஓடுதளங்கள்',
 6.0, 8.5, 7.0, 'Likely',
 'Capital investment with long-term benefits. Strong precedent — TN has invested heavily in sports infrastructure.'),

-- SOCIAL WELFARE
('DMK', 2026, 'social_welfare', FALSE,
 'Transgender Welfare Committee at district level; annual award for transgenders excelling in government departments',
 'மாவட்ட அளவில் திருநர்-திருநங்கையர் நலவாழ்வுக் குழு; ஆண்டுதோறும் விருது',
 7.5, 8.0, 7.5, 'Likely',
 'Low fiscal cost, high symbolic importance. DMK track record on transgender rights is good.'),

('DMK', 2026, 'social_welfare', FALSE,
 'Adi Dravidar and tribal families to get free houses by 2030; Ambedkar Housing ₹2,000 crore scheme',
 'ஆதிதிராவிட மற்றும் பழங்குடியினருக்கு 2030-க்குள் இலவச வீடுகள்',
 5.0, 7.5, 6.0, 'Likely',
 '2030 gives enough runway. ₹2,000 crore is specific. PMAY support makes this achievable.'),

-- LABOUR
('DMK', 2026, 'labour', FALSE,
 'Monthly welfare payment for construction workers, auto drivers, and gig workers raised from ₹1,200 to ₹2,000',
 'கட்டுமானத் தொழிலாளர்கள், ஆட்டோ ஓட்டுநர்கள், Gig workers மாதாந்திர நலவாரியம் ₹1,200-லிருந்து ₹2,000-ஆக',
 5.0, 8.5, 6.5, 'Likely',
 'Existing scheme — increment is administratively simple. Covers politically important groups.'),

('DMK', 2026, 'labour', FALSE,
 '₹1.5 lakh subsidy for auto-rickshaw drivers to switch to EV or CNG/LPG vehicles',
 'ஆட்டோ ஓட்டுநர்களுக்கு மின்சார/CNG/LPG வாகனம் வாங்க ₹1.5 லட்சம் மானியம்',
 5.5, 9.0, 7.0, 'Likely',
 'Specific amount. EV transition is a national priority with central subsidies available. Significant demand.'),

('DMK', 2026, 'labour', FALSE,
 'Sanitation workers to get PPE kits (gloves, masks, boots, safety equipment) and bi-annual medical camps',
 'சாலவைத் தொழிலாளர்களுக்கு PPE கிட்டுகளும் அரை ஆண்டு மருத்துவ முகாம்களும்',
 7.0, 8.5, 7.5, 'Likely',
 'Low cost, high dignity impact. Strong alignment with existing Madras HC orders on sanitation worker protection.');

-- ──────────────────────────────────────────────────────────────────
-- 4. AIADMK 2026 Manifesto Promises
-- ──────────────────────────────────────────────────────────────────
INSERT INTO manifesto_promises
  (party, election_year, category, is_flagship, promise_text, promise_text_tamil,
   fiscal_score, specificity_score, overall_score, believability_label, ai_reasoning)
VALUES

-- CASH BENEFITS
('AIADMK', 2026, 'cash_benefits', TRUE,
 'Rs.10,000 one-time family assistance grant to every family immediately upon assuming power',
 'ஆட்சியில் அமர்ந்தவுடன் ஒவ்வொரு குடும்பத்திற்கும் ₹10,000 ஒருமுறை உதவித்தொகை',
 2.5, 8.5, 4.0, 'Unlikely',
 'Cost ~₹35,000-40,000 crore for one-time payout. Extremely high fiscal burden with no offsetting revenue. No state has successfully implemented this at scale.'),

('AIADMK', 2026, 'cash_benefits', TRUE,
 'Kula Vilakku scheme — ₹2,000 per month for homemakers/housewives in all families',
 'குல விளக்கு திட்டம் — ஒவ்வொரு குடும்பத்திலும் இல்லத்தரசிக்கு ₹2,000 மாதாந்திர உதவி',
 3.0, 8.5, 4.5, 'Uncertain',
 'Much wider eligibility than DMK''s Magalir Urimai (~1.1 crore recipients). Universal scheme could cost ₹25,000+ crore/year. Fiscal sustainability is questionable.'),

('AIADMK', 2026, 'cash_benefits', FALSE,
 'Deepavali gift: free saree + ₹1,000 cash for women; ₹500 for widows and destitute',
 'தீபாவளி பரிசு: இலவச சேலை + ₹1,000 பணம்; விதவைகளுக்கு ₹500',
 4.5, 8.5, 6.0, 'Uncertain',
 'Historically done by AIADMK. Cost is manageable (~₹500-800 crore). Track record exists but implementation consistency has varied.'),

('AIADMK', 2026, 'cash_benefits', FALSE,
 'Old age pension increased from ₹1,200 to ₹2,000 per month',
 'முதியோர் ஓய்வூதியம் ₹1,200-லிருந்து ₹2,000-ஆக உயர்த்தப்படும்',
 5.0, 9.0, 7.0, 'Likely',
 'Same number as DMK. Both parties converging on this figure. Very specific — high credibility for this amount.'),

('AIADMK', 2026, 'cash_benefits', FALSE,
 'Free refrigerator for all eligible BPL families',
 'தகுதியான வறுமைக் கோட்டிற்கு கீழுள்ள குடும்பங்களுக்கு இலவச குளிர்சாதனப் பெட்டி',
 3.0, 7.5, 4.5, 'Unlikely',
 'AIADMK did give free TVs, fans, mixers historically. But refrigerator costs ~₹15,000-20,000 each. Cost for 2 crore families = ₹30,000-40,000 crore. Fiscally implausible.'),

-- TRANSPORT
('AIADMK', 2026, 'infrastructure', TRUE,
 'Free bus travel for all citizens (men and women) on government buses',
 'அரசு பேரந்துகளில் அனைத்து குடிமக்களுக்கும் இலவசப் பயணம்',
 2.5, 8.5, 4.0, 'Uncertain',
 'DMK gives free bus to women — extension to all would add ~₹4,000-5,000 crore/year to existing TNSTC losses. Risk of reducing TNSTC viability.'),

-- WOMEN
('AIADMK', 2026, 'women', TRUE,
 'Amma Two-Wheeler scheme — ₹25,000 subsidy for 5 lakh women to buy two-wheelers',
 'அம்மா இரு சக்கர வாகன திட்டம் — 5 லட்சம் பெண்களுக்கு ₹25,000 மானியம்',
 4.5, 9.0, 6.5, 'Likely',
 'Specific number and subsidy amount. Similar schemes have been implemented. AIADMK has track record with Amma branded programs. Cost ~₹1,250 crore.'),

('AIADMK', 2026, 'women', FALSE,
 'Amma Illam — free houses for all eligible families (continuation of earlier scheme)',
 'அம்மா இல்லம் — தகுதியான அனைத்துக் குடும்பங்களுக்கும் இலவச வீடுகள்',
 4.5, 7.0, 5.5, 'Uncertain',
 'AIADMK built houses in earlier tenures. "All eligible families" is vague — depends on definition. PMAY support makes some housing delivery likely but not universal free housing.'),

-- AGRICULTURE
('AIADMK', 2026, 'agriculture', TRUE,
 'Increase MGNREGS work days from 100 to 150 days per year for rural workers',
 'MGNREGS வேலை நாட்களை 100-லிருந்து 150 நாட்களாக அதிகரிக்க மத்திய அரசை வலியுறுத்துவோம்',
 6.0, 8.5, 6.5, 'Uncertain',
 'This requires central government approval — a state cannot unilaterally increase MGNREGS days. AIADMK can only pressure the centre, where NDA allies have influence.'),

('AIADMK', 2026, 'agriculture', FALSE,
 'Free 1 kg dal and 1 litre cooking oil per family through PDS every month',
 'PDS மூலம் ஒவ்வொரு குடும்பத்திற்கும் மாதந்தோறும் 1 கிலோ பருப்பு + 1 லிட்டர் எண்ணெய் இலவசம்',
 4.5, 9.0, 6.0, 'Uncertain',
 'AIADMK has done 1kg dal previously. Cost ~₹2,000+ crore/year. Feasible if central support available but adds procurement complexity.'),

('AIADMK', 2026, 'agriculture', FALSE,
 'Paddy procurement at higher MSP with full bonus; crop insurance extended to all crops',
 'நெல்லுக்கு அதிக MSP + முழு போனஸ்; அனைத்து பயிர்களுக்கும் பயிர் காப்பீடு',
 5.0, 6.5, 5.5, 'Uncertain',
 'Vague on specific amounts — "higher MSP" without number is low specificity. Crop insurance extension is feasible but operationally complex.'),

-- EDUCATION
('AIADMK', 2026, 'education', FALSE,
 'Education loan waiver for students who have taken loans for higher education',
 'உயர்கல்விக்கு கல்விக் கடன் வாங்கிய மாணவர்களுக்கு கடன் தள்ளுபடி',
 3.0, 7.0, 4.5, 'Uncertain',
 'No amount specified. Total outstanding education loans in TN ~₹25,000 crore. Full waiver is fiscally very difficult. Partial waiver is more likely.'),

('AIADMK', 2026, 'education', FALSE,
 'Scholarships for meritorious students to study in foreign universities',
 'திறமையான மாணவர்களுக்கு வெளிநாட்டு பல்கலைக்கழகங்களில் படிக்க புலமைப்பரிசில்',
 6.5, 7.0, 6.5, 'Likely',
 'DMK also does this. Relatively low cost (~₹100-200 crore/year for limited seats). Both parties likely to implement.'),

-- HEALTHCARE
('AIADMK', 2026, 'healthcare', FALSE,
 'Expansion of Amma Unavagam canteens across all districts with improved menu and quality',
 'அம்மா உணவகங்களை அனைத்து மாவட்டங்களிலும் விரிவாக்கம்; மேம்படுத்தப்பட்ட மெனு',
 5.5, 7.5, 6.5, 'Likely',
 'Amma canteens are AIADMK''s iconic scheme. Has proven popularity. DMK currently runs them too. Expansion is feasible.'),

('AIADMK', 2026, 'healthcare', FALSE,
 'Medical insurance coverage increase for all families; specialist hospitals in all districts',
 'அனைத்துக் குடும்பங்களுக்கும் மருத்துவ காப்பீடு அதிகரிப்பு; மாவட்டங்களில் நிபுணர் மருத்துவமனைகள்',
 5.0, 6.0, 5.5, 'Uncertain',
 'Both amounts and scope are vague. Specialist hospitals need significant capital and staffing investment.'),

-- GAS / ESSENTIALS
('AIADMK', 2026, 'cash_benefits', FALSE,
 '3 free LPG gas cylinders per year for all BPL and Antodaya families',
 'BPL மற்றும் அந்தோதய குடும்பங்களுக்கு வருடம் 3 இலவச LPG சிலிண்டர்கள்',
 4.0, 8.5, 5.5, 'Uncertain',
 'Central PM Ujjwala already gives 1 free cylinder. Three free cylinders by state adds ~₹2,500 crore/year. Feasible but fiscally stretching.'),

-- FEDERAL / GOVERNANCE
('AIADMK', 2026, 'governance', TRUE,
 'Demand for greater federal autonomy — states to get larger share of GST revenue; oppose centralization',
 'மாநில நலனுக்காக GST வருவாயில் அதிக பங்கு கோருவோம்; மத்தியமயமாக்கலை எதிர்ப்போம்',
 7.5, 7.5, 7.0, 'Uncertain',
 'Principled position. But AIADMK''s NDA alliance complicates full-throated opposition to centre. Credibility gap given recent BJP alliance history.'),

('AIADMK', 2026, 'governance', FALSE,
 'Single Window clearance for all business approvals within 30 days',
 '30 நாட்களில் அனைத்து வணிக அனுமதிகளும் Single Window மூலம்',
 7.0, 8.0, 7.0, 'Likely',
 'Both parties commit to ease of business. Administratively feasible. TN already has some single window.'),

-- SOCIAL WELFARE
('AIADMK', 2026, 'social_welfare', FALSE,
 'Increase disability pension from ₹1,500 to ₹3,000; free assistive devices for all differently-abled',
 'மாற்றுத்திறனாளிகளுக்கான உதவித்தொகை ₹1,500-லிருந்து ₹3,000-ஆக; இலவச உதவி கருவிகள்',
 5.0, 8.0, 6.5, 'Likely',
 'Specific amount. Competitive with DMK''s ₹2,500 offer. Assistive devices program exists nationally.'),

('AIADMK', 2026, 'social_welfare', FALSE,
 'SC/ST housing: all Adi Dravidar families to get proper housing with amenities by 2030',
 'ஆதிதிராவிட குடும்பங்களுக்கு 2030-க்குள் அனைத்து வசதிகளுடன் கூடிய வீடுகள்',
 5.0, 7.0, 6.0, 'Uncertain',
 'Similar to DMK promise. "All families" is very broad. PMAY support helps but "all" is optimistic.'),

-- LABOUR
('AIADMK', 2026, 'labour', FALSE,
 'MGNREGS wages increase from current rate; construction workers welfare board benefits expansion',
 'MGNREGS ஊதிய உயர்வு; கட்டுமானத் தொழிலாளர் நலவாரிய சலுகைகள் விரிவாக்கம்',
 5.5, 6.0, 5.5, 'Uncertain',
 'MGNREGS wages set by centre — state cannot directly increase. Welfare board expansion is feasible.'),

-- FISHERIES
('AIADMK', 2026, 'fisheries', FALSE,
 'Fishing ban relief increased; modern fishing boats and equipment for fishermen at subsidized rates',
 'மீன்பிடித் தடைக்காலத் தொகை உயர்வு; நவீன படகுகள் மற்றும் உபகரணங்கள் மானியத்தில்',
 5.5, 6.5, 6.0, 'Uncertain',
 'Specific amount not given for relief increase (lower specificity than DMK). Equipment subsidies have precedent.'),

-- CULTURE
('AIADMK', 2026, 'culture_language', FALSE,
 'Protect Tamil language rights; oppose imposition of Hindi through any central policy',
 'தமிழ் மொழி உரிமைகளை பாதுகாப்போம்; இந்தி திணிப்பை எதிர்ப்போம்',
 7.0, 7.0, 6.0, 'Uncertain',
 'Both parties claim Tamil rights. AIADMK''s NDA alliance creates credibility questions — BJP has been pushing Hindi-centric policies.'),

-- PRICE CONTROL
('AIADMK', 2026, 'cash_benefits', FALSE,
 'Price control measures on essential commodities; mobile price control squads in all districts',
 'அத்தியாவசிய பொருட்கள் விலை கட்டுப்பாடு; மாவட்டங்களில் விலை கண்காணிப்புக் குழுக்கள்',
 5.5, 7.5, 6.0, 'Uncertain',
 'Price control is always promised but rarely delivered. AIADMK had Amma price stores historically. Enforcement is difficult.'),

-- HOUSING
('AIADMK', 2026, 'housing', FALSE,
 'Complete all pending housing schemes; new Amma Illam scheme for urban and rural homeless',
 'நிலுவையில் உள்ள வீட்டு திட்டங்களை முடிப்போம்; நகர்ப்புற மற்றும் கிராமப்புறங்களில் அம்மா இல்லம்',
 5.0, 6.5, 5.5, 'Uncertain',
 '"All homeless" is a very broad target. "Completing pending schemes" is more credible. Depends heavily on PMAY funding.'),

-- SPORTS
('AIADMK', 2026, 'sports', FALSE,
 'Promote traditional sports — Silambam, Kabaddi, Jallikattu; international competitions for Tamil Nadu',
 'சிலம்பம், கபடி, ஜல்லிக்கட்டு போன்ற பாரம்பரிய விளையாட்டுகளை ஊக்குவிப்போம்',
 6.5, 7.0, 6.5, 'Likely',
 'Both parties support these. Low fiscal cost, high cultural resonance. Jallikattu protection is politically important.'),

-- ENVIRONMENT
('AIADMK', 2026, 'environment', FALSE,
 'Restore Palar, Tamirabarani, Cauvery river ecosystems; prevent encroachment of water bodies',
 'பாலாறு, தாமிரபரணி, காவேரி நதிகளை மீட்போம்; நீர்நிலைகள் ஆக்கிரமிப்பை தடுப்போம்',
 5.5, 6.5, 6.0, 'Uncertain',
 'River restoration is complex and multi-jurisdictional. Encroachment removal is politically difficult but technically achievable.'),

-- MSME
('AIADMK', 2026, 'employment', FALSE,
 'Easy loans for small traders and MSME entrepreneurs; single window for all business registrations',
 'சிறு வணிகர்களுக்கும் MSME தொழில்முனைவோருக்கும் எளிதான கடன் வசதி',
 6.0, 7.0, 6.5, 'Likely',
 'MSME loan access is a common cross-party promise. Existing MUDRA, SIDBI frameworks can be leveraged.');

-- ──────────────────────────────────────────────────────────────────
-- 5. Additional DMK 2026 promises (20 more across remaining chapters)
-- ──────────────────────────────────────────────────────────────────
INSERT INTO manifesto_promises
  (party, election_year, category, is_flagship, promise_text, promise_text_tamil,
   fiscal_score, specificity_score, overall_score, believability_label, ai_reasoning)
VALUES

-- DAIRY
('DMK', 2026, 'agriculture', FALSE,
 'Milk procurement price increased by ₹5 per litre; 1,000 new dairy farms per year; dairy exports raised from ₹450 crore to ₹850 crore',
 'பால் கொள்முதல் விலை லிட்டருக்கு ₹5 உயர்வு; ஆண்டுக்கு 1,000 பால் பண்ணைகள்; ஏற்றுமதி ₹450 கோடியிலிருந்து ₹850 கோடியாக',
 5.5, 8.5, 7.0, 'Likely',
 'DMK reduced milk price on taking power in 2021 — raising procurement price is a credible reversal. Export target specific and measurable.'),

-- LIVESTOCK
('DMK', 2026, 'agriculture', FALSE,
 'Livestock population target increased to 3 crore; 24-hour veterinary hospitals in every district; cooperative livestock loans raised from ₹250 crore to ₹1,000 crore',
 'கால்நடை எண்ணிக்கை 3 கோடியாக உயர்த்துவோம்; ஒவ்வொரு மாவட்டத்திலும் 24 மணி நேர கால்நடை மருத்துவமனை',
 5.5, 8.0, 6.5, 'Likely',
 'Livestock development has consistent cross-party support. 24-hour vet hospitals is specific and feasible with existing vet college infrastructure.'),

-- TEMPLE RENOVATION
('DMK', 2026, 'culture_language', FALSE,
 'Kumbabishekam for 5,000 temples in 5 years; annual temple renovation fund raised from ₹10 crore to ₹25 crore; 3 lakh temples to get basic facilities',
 '5 ஆண்டுகளில் 5,000 கோவில்களுக்கு குடமுழுக்கு; ஆண்டு நிதி ₹10 கோடியிலிருந்து ₹25 கோடியாக',
 6.0, 9.0, 7.5, 'Very Likely',
 'Very specific — number of temples, timeline, and fund amount all given. HR&CE dept handles this routinely. DMK has strong track record despite perception of being "anti-temple".'),

-- TOURISM
('DMK', 2026, 'infrastructure', FALSE,
 'Heritage Tourism circuit connecting Tholkappiam-era sites, ancient ports, and folk art centers; MICE tourism infrastructure in Coimbatore and Chennai',
 'பண்பாட்டு சுற்றுலா சர்க்யூட்; கோவை மற்றும் சென்னையில் MICE சுற்றுலா கட்டமைப்பு',
 6.0, 7.0, 6.5, 'Likely',
 'Tourism investment has good economic multiplier. MICE tourism in Coimbatore is a realistic goal given the city''s connectivity. Heritage circuit aligns with DMK''s cultural positioning.'),

-- RURAL POVERTY
('DMK', 2026, 'social_welfare', TRUE,
 'Eliminate Ultra Poor (extreme poverty) from Tamil Nadu — comprehensive welfare package for all households below poverty line',
 'தமிழ்நாட்டில் தீவிர வறுமையை ஒழிப்போம் — Ultra Poor குடும்பங்களுக்கு முழு நலன் தொகுப்பு',
 5.5, 7.0, 6.5, 'Likely',
 'TN already has 2nd lowest poverty rate nationally. Convergence of Kalaignar schemes has shown results. "Ultra Poor" elimination is ambitious but directionally credible.'),

-- URBAN DEVELOPMENT
('DMK', 2026, 'infrastructure', FALSE,
 '"Complete Streets" — pedestrian-friendly roads with shade trees in all cities; 30% wastewater recycled by 2030; Bio-CNG plants in major cities',
 'நடைபாதை, நிழல் மரங்கள் — நகர சாலைகளில் "Complete Streets"; 2030-க்குள் 30% கழிவு நீர் மறுசுழற்சி',
 6.0, 8.0, 7.0, 'Likely',
 'Specific target (30% by 2030). Bio-CNG plants have central support under Swachh Bharat. Urban infrastructure investment has strong precedent.'),

-- MSME & GI
('DMK', 2026, 'employment', FALSE,
 'Tamil Nadu GI Mission — identify and register GI products in every district; 5 lakh new MSME units in 5 years; participation in Canton Fair and global trade events',
 'தமிழ்நாடு GI மிஷன் — ஒவ்வொரு மாவட்டத்திலும் GI தயாரிப்புகள்; 5 லட்சம் புதிய MSME நிறுவனங்கள்',
 6.0, 8.0, 7.0, 'Likely',
 'GI tagging is a proven economic tool. Canton Fair participation is a continuation of existing TIDCO programs. 5 lakh new MSMEs is a stretch goal but directionally right.'),

-- STARTUPS
('DMK', 2026, 'employment', FALSE,
 'District-level startup incubators in all 38 districts; 5,000 rural and agri-tech startups in 5 years; GPU Compute Credits for AI startups',
 'அனைத்து 38 மாவட்டங்களிலும் புத்தொழில் இடைவளாகங்கள்; 5 ஆண்டுகளில் 5,000 கிராமப்புற startups',
 6.5, 8.5, 7.5, 'Likely',
 'TN already has TIDEL Parks and incubators in major cities. District extension is feasible through colleges. GPU credits for AI startups is an innovative policy tool.'),

-- BC/MBC LOANS
('DMK', 2026, 'social_welfare', FALSE,
 'TABCEDCO loan ceiling for BC/MBC entrepreneurs raised from ₹15 lakh to ₹30 lakh; vocational training in jewelry, leather, and computer industries',
 'TABCEDCO கடன் வரம்பு ₹15 லட்சத்திலிருந்து ₹30 லட்சமாக; நகை, தோல், கணினி தொழில்பயிற்சி',
 6.5, 9.0, 7.5, 'Very Likely',
 'Very specific numbers. Doubling the loan ceiling is administratively simple. DMK has strong BC/MBC constituency and delivery track record on TABCEDCO.'),

-- JOURNALISTS
('DMK', 2026, 'governance', FALSE,
 'Journalist medical help raised to ₹3.5 lakh; 3% housing reservation for journalists; CM''s comprehensive health card for all journalists',
 'பத்திரிக்கையாளர் மருத்துவ உதவி ₹3.5 லட்சமாக; 3% வீட்டு இடஒதுக்கீடு',
 7.0, 9.0, 7.5, 'Very Likely',
 'Very specific and low-cost promises. Journalist welfare has bipartisan support. Housing reservation and health card are both administratively simple.'),

-- MINORITIES SKILL
('DMK', 2026, 'social_welfare', FALSE,
 'Skill improvement centers in minority-concentrated districts; TAMCO loan ceiling raised to ₹30 lakh; 25,000 minority youth trained per year',
 'சிறுபான்மையினர் திறன் மேம்பாட்டு மையங்கள்; TAMCO கடன் வரம்பு ₹30 லட்சமாக',
 6.5, 8.5, 7.0, 'Likely',
 'Continuation of existing programs with specific enhancements. TAMCO loan doubling parallels TABCEDCO — same mechanism, feasible.'),

-- POWER / ENERGY
('DMK', 2026, 'infrastructure', FALSE,
 'Solar power expansion in Tiruchirapalli, Salem, Tirunelveli, Erode, Thanjavur; 30% EV vehicles in Tamil Nadu by 2030',
 'திருச்சிராப்பள்ளி, சேலம், திருநெல்வேலி, ஈரோடு, தஞ்சாவூரில் சூரிய சக்தி விரிவாக்கம்',
 6.5, 8.5, 7.5, 'Likely',
 'TN already top solar state. City-specific solar rollout is credible. 30% EV by 2030 is ambitious but consistent with national trajectory.'),

-- GOVERNANCE / SUPER APP
('DMK', 2026, 'governance', FALSE,
 'Super App for all government services — single fingertip access to 1,000 citizen services; online certification for all documents',
 'அனைத்து அரசு சேவைகளும் ஒரே Super App-ல்; 1,000 குடிமக்கள் சேவைகள் கைவிரல் நுனியில்',
 7.0, 8.5, 7.5, 'Likely',
 'TN already has iGoTN and various portals. Consolidation into a Super App is technically feasible. E-Governance investment has been a DMK priority.'),

-- TRADERS
('DMK', 2026, 'governance', FALSE,
 'Trade licenses valid for 10 years via single window; night shop protection — no arbitrary police harassment; festival season hawker protection zones',
 'வணிக உரிமம் 10 ஆண்டுகளுக்கு சாரத்தில்; இரவு நேரக் கடைகளுக்கு பாதுகாப்பு',
 7.5, 8.5, 7.5, 'Likely',
 'Ease-of-business reforms at low fiscal cost. 10-year license is a specific commitment. Night shop protection addresses a real pain point.'),

-- WEAVERS DETAIL
('DMK', 2026, 'labour', FALSE,
 '10 handloom parks; ₹2,000 crore total handloom sales target; 90% subsidy to revive 10,000 dormant looms; GI tagging for Tamil Nadu handloom varieties nationally',
 '10 நெசவு பூங்காக்கள்; ₹2,000 கோடி கைத்தறி விற்பனை இலக்கு; 10,000 நெசவுகளை மீட்க 90% மானியம்',
 5.5, 8.5, 7.0, 'Likely',
 'Specific sales target and park count. Handloom revival has NHDC central support. 90% subsidy on 10,000 looms costs ~₹500 crore — feasible.'),

-- WATER MANAGEMENT
('DMK', 2026, 'agriculture', FALSE,
 'Cauvery water rights fully utilized; micro-irrigation for 5 lakh acres; rainwater harvesting mandatory in all government buildings',
 'காவேரி நீர் உரிமம் முழுமையாக பயன்படுத்தப்படும்; 5 லட்சம் ஏக்கருக்கு நுண்ணீர்ப்பாசனம்',
 5.5, 7.5, 6.5, 'Likely',
 'Cauvery water utilization is within state capacity. Micro-irrigation has central PMKSY support. Rainwater harvesting mandate for govt buildings is easily legislated.'),

-- CHILD PROTECTION
('DMK', 2026, 'social_welfare', FALSE,
 'Special Child Protection Law enacted; fast-track POCSO courts in all districts; child helpline 1098 upgraded to international standard',
 'சிறப்பு குழந்தை பாதுகாப்புச் சட்டம்; அனைத்து மாவட்டங்களிலும் POCSO நீதிமன்றங்கள்; குழந்தை உதவி எண் 1098 மேம்படுத்தல்',
 7.0, 8.5, 7.5, 'Likely',
 'Fast-track POCSO courts already operational in some districts — expansion is feasible. 1098 upgrade has central support. Child protection law is a state-level legislative action.'),

-- ELDERLY SOCIAL CENTERS
('DMK', 2026, 'cash_benefits', FALSE,
 'Anbu Solai senior citizen welfare centers expanded statewide; free medical checkup every 6 months for all elderly over 65',
 'அன்பு சோலை முதியோர் நல மையங்கள் மாநிலம் முழுவதும் விரிவாக்கம்; 65 வயதுக்கு மேல் 6 மாதத்திற்கு ஒருமுறை இலவச பரிசோதனை',
 6.0, 8.0, 7.0, 'Likely',
 'Anbu Solai expansion is continuation of existing scheme. Medical checkups for elderly via PHCs are structurally feasible.'),

-- DEFENCE MANUFACTURING
('DMK', 2026, 'employment', FALSE,
 'Defence manufacturing hub in Coimbatore — leverage existing ecosystem for aerospace, robotics, and defence electronics industries',
 'கோவையில் பாதுகாப்பு தொழில்நுட்பப் பூங்கா — விமானம், ரோபாட்டிக்ஸ், பாதுகாப்பு மின்னணுவியல்',
 6.0, 7.5, 6.5, 'Likely',
 'Coimbatore already has precision engineering base. Defence corridor policy exists nationally. State can offer land and incentives — central approval needed for defence firms.'),

-- ROADS / CONNECTIVITY
('DMK', 2026, 'infrastructure', FALSE,
 '30,000 km rural roads renovated at ₹10,000 crore cost; 3 lakh new meters of roads with proper drainage in rural areas',
 '30,000 கிமீ கிராமப்புற சாலை நவீனமயமாக்கல் ₹10,000 கோடி; 3 லட்சம் மீட்டர் புதிய சாலைகள்',
 5.5, 8.5, 7.0, 'Likely',
 'Specific km and cost. PMGSY central support available. Rural road investment has high political and development returns. DMK has done significant rural road work.');

-- ──────────────────────────────────────────────────────────────────
-- 6. Additional AIADMK 2026 promises (20 more)
-- ──────────────────────────────────────────────────────────────────
INSERT INTO manifesto_promises
  (party, election_year, category, is_flagship, promise_text, promise_text_tamil,
   fiscal_score, specificity_score, overall_score, believability_label, ai_reasoning)
VALUES

-- FARMERS / CROP INSURANCE
('AIADMK', 2026, 'agriculture', FALSE,
 'Crop insurance extended to all crops including fruits and vegetables; soil health cards for all 65 lakh farmers within 2 years',
 'அனைத்து பயிர்களுக்கும் பயிர் காப்பீடு; 65 லட்சம் விவசாயிகளுக்கும் மண் சோதனை அட்டை',
 5.0, 7.5, 6.0, 'Uncertain',
 'Crop insurance requires PMFBY participation — state can top up but not fully control coverage. Soil health cards have central scheme support but 2-year timeline for all farmers is tight.'),

-- WATER / DRINKING WATER
('AIADMK', 2026, 'infrastructure', FALSE,
 'Drinking water to all rural households — complete Jal Jeevan Mission; clean Cauvery water to all delta districts',
 'அனைத்து கிராமங்களுக்கும் குடிநீர் — Jal Jeevan Mission முடிப்போம்; கோடை மாவட்டங்களுக்கு காவேரி நீர்',
 5.5, 7.5, 6.0, 'Likely',
 'JJM is centrally funded — state needs to execute last-mile. Both parties committed to this. Cauvery water to delta is feasible with existing infrastructure.'),

-- FREE POWER TO FARMERS
('AIADMK', 2026, 'agriculture', TRUE,
 'Free electricity to all agricultural pumpsets — no cap on hours; solar-powered pump sets for farmers in non-electrified areas',
 'அனைத்து விவசாய பம்புசெட்களுக்கும் இலவச மின்சாரம் — நேர வரம்பு இல்லை',
 3.5, 8.0, 5.0, 'Uncertain',
 'Fiscally very heavy — currently ~₹6,000 crore/year for partial coverage. "No cap on hours" is unprecedented and could cost ₹12,000+ crore. Grid stability concerns also significant.'),

-- NUTRITION / ANGANWADI
('AIADMK', 2026, 'social_welfare', FALSE,
 'Upgrade all anganwadis to "Amma Anganwadi" standard; nutritious noon meal improvement with eggs and fruits daily for all school children',
 'அனைத்து அங்கன்வாடிகளையும் "அம்மா அங்கன்வாடி" தரத்திற்கு; பள்ளி மாணவர்களுக்கு தினமும் முட்டை மற்றும் பழங்கள்',
 5.5, 7.5, 6.5, 'Likely',
 'Both parties support improved mid-day meals. Eggs in school meals has been partially implemented by DMK. AIADMK upgrading this with fruits is credible and low-cost.'),

-- GOLD SCHEME FOR MARRIAGES
('AIADMK', 2026, 'cash_benefits', FALSE,
 'Amma Gold Scheme — 8 grams of gold for daughters'' marriages for BPL families (revival of Jayalalithaa-era scheme)',
 'அம்மா தங்கத் திட்டம் — BPL குடும்பங்களில் திருமணங்களுக்கு 8 கிராம் தங்கம்',
 4.0, 8.5, 5.5, 'Uncertain',
 'AIADMK has done this before (Jayalalithaa era — Ninaivu Marumalarchi scheme). Revival is credible but gold prices have tripled since then, making cost ~₹3,000 crore/year.'),

-- ANTI-CORRUPTION
('AIADMK', 2026, 'governance', FALSE,
 'Establish an independent Lokayukta with real teeth; mandatory property declaration for all government officials; anti-corruption helpline',
 'தனிச் சட்ட அதிகாரங்களுடன் லோக் ஆயுக்தா அமைப்போம்; அனைத்து அரசு அலுவலர்களும் சொத்துப் பட்டியல் வெளியிட வேண்டும்',
 7.5, 7.5, 6.5, 'Uncertain',
 'Both parties promise anti-corruption measures. Lokayukta is politically sensitive — past attempts have been watered down. Credibility is mixed given AIADMK''s own corruption cases during earlier tenure.'),

-- WOMEN SAFETY
('AIADMK', 2026, 'women', FALSE,
 'Fast-track courts for crimes against women in all districts; more women police stations; CCTV on all major roads and public spaces',
 'மாவட்டங்களில் பெண்களுக்கு எதிரான குற்றங்களுக்கு விரைவு நீதிமன்றங்கள்; அதிக பெண் காவல் நிலையங்கள்',
 6.5, 7.5, 6.5, 'Likely',
 'Fast-track courts have central support (Nirbhaya Fund). Women police stations have strong precedent — AIADMK set up many during Jayalalithaa era.'),

-- URBAN SLUM REGULARIZATION
('AIADMK', 2026, 'housing', FALSE,
 'Regularize all urban slums and issue pattas to residents; no forced eviction without alternative accommodation',
 'நகர்ப்புற குடிசை பகுதிகளை ஒழுங்குபடுத்தி பட்டா வழங்குவோம்; மாற்று இடமின்றி வெளியேற்றம் இல்லை',
 5.0, 7.0, 6.0, 'Uncertain',
 'Slum regularization is a complex legal process. "No forced eviction" is politically popular but creates infrastructure challenges. Partial implementation is likely; full regularization is difficult.'),

-- DIGITAL CONNECTIVITY
('AIADMK', 2026, 'governance', FALSE,
 'High-speed internet connectivity to all villages; digital literacy program for 50 lakh people in 5 years',
 'அனைத்து கிராமங்களுக்கும் அதிவேக இணையம்; 50 லட்சம் பேருக்கு டிஜிட்டல் கல்வி',
 6.0, 7.5, 6.5, 'Likely',
 'BharatNet central scheme is already doing this — state can execute last-mile. Digital literacy program has precedent. Both achievable with central support.'),

-- NRI / OVERSEAS TAMILS
('AIADMK', 2026, 'governance', FALSE,
 'Dedicated Overseas Tamils Department; NRI property protection cell; facilitate return migration for Tamils in Gulf countries',
 'வெளிநாட்டு தமிழர்களுக்கு தனி அமைச்சகம்; NRI சொத்து பாதுகாப்பு அலுவலகம்',
 7.0, 7.5, 7.0, 'Likely',
 'Both parties have overseas Tamil welfare cells. Dedicated department is feasible at low cost. NRI property protection cell is popular with the diaspora.'),

-- RIVER CLEAN-UP
('AIADMK', 2026, 'environment', FALSE,
 'Clean Palar, Cooum, and Buckingham Canal rivers; desalination plants in coastal water-scarce areas; restore traditional water bodies (ooranis)',
 'பாலாறு, கூவம், பக்கிங்ஹாம் கால்வாய் சுத்திகரிப்பு; நீர் பஞ்சம் உள்ள கடற்கரை பகுதிகளில் கடல்நீர் சுத்திகரிப்பு ஆலைகள்',
 4.5, 7.0, 5.5, 'Uncertain',
 'River clean-up has been promised by every government for decades — complex industrial and agricultural polluter enforcement. Desalination is capital-intensive but Chennai has precedent.'),

-- WEAVERS (AIADMK)
('AIADMK', 2026, 'labour', FALSE,
 'Power loom modernization subsidy; handloom weavers'' monthly support ₹2,000; state procurement of handloom products for government use',
 'பவர்லூம் நவீனமயமாக்கல் மானியம்; கைத்தறி நெசவாளர்களுக்கு ₹2,000 மாத ஆதரவு',
 5.5, 7.5, 6.5, 'Likely',
 'Same monthly amount as DMK''s weavers promise — both parties converging on ₹2,000. Power loom modernization has TUFS central support. State procurement is politically feasible.'),

-- SC/ST SCHOLARSHIP
('AIADMK', 2026, 'social_welfare', FALSE,
 'SC/ST scholarship amounts doubled; Ambedkar centenary celebrations with major scholarship fund; post-matric scholarship 100% coverage',
 'SC/ST புலமைப்பரிசில் இரட்டிப்பாக்கப்படும்; அம்பேத்கர் நூற்றாண்டு மலர்விழா',
 5.5, 7.5, 6.5, 'Likely',
 'SC/ST scholarships have central matching funds. Doubling is credible. Ambedkar centenary events are low-cost, high-visibility political wins.'),

-- TRANSPORT (AIADMK specific)
('AIADMK', 2026, 'infrastructure', FALSE,
 'Flyovers and underpasses at accident-prone junctions in all major cities; NH road widening to 4 lanes where still 2 lanes',
 'விபத்துப் போக்குவரத்துப் புள்ளிகளில் பறக்கும் பாலங்கள்; நான்கு வழி அகல சாலை விரிவாக்கம்',
 5.0, 7.0, 6.0, 'Likely',
 'NH widening is central government responsibility — state can only advocate. Flyovers in cities are state responsibility and feasible. Both parties promise road infrastructure.'),

-- TRIBAL WELFARE (AIADMK)
('AIADMK', 2026, 'social_welfare', FALSE,
 'More tribal welfare residential schools; enforce Forest Rights Act fully; tribal youth training in traditional crafts and modern skills',
 'பழங்குடியின நல குடியிருப்பு பள்ளிகள்; வன உரிமைச் சட்டம் முழுமையாக செயல்படுத்தல்',
 5.5, 7.0, 6.0, 'Uncertain',
 'Forest Rights Act enforcement requires state will and district-level implementation. Tribal residential schools have budget and infrastructure constraints. Partial implementation likely.'),

-- AMMA CANTEEN EXPANSION
('AIADMK', 2026, 'cash_benefits', TRUE,
 'Amma Unavagam canteens — expand to all taluks; ₹5 meals restored; new canteens near hospitals, railway stations, and bus stands',
 'அம்மா உணவகங்கள் அனைத்து வட்டங்களிலும்; ₹5 சாப்பாடு மீட்டெடுப்போம்',
 5.0, 8.5, 6.5, 'Likely',
 'AIADMK''s most iconic scheme — strong institutional memory and popular demand. ₹5 meal is politically powerful. DMK runs them too so institutional framework exists. Taluk-level expansion feasible.'),

-- POWER FOR HOMES
('AIADMK', 2026, 'cash_benefits', FALSE,
 '100 units free electricity for all domestic consumers (no income limit); solar panels for BPL homes at state cost',
 'அனைத்து வீட்டு நுகர்வோருக்கும் 100 யூனிட் இலவச மின்சாரம்; BPL வீடுகளில் சூரிய மின் பலகை',
 3.5, 8.5, 5.0, 'Uncertain',
 'AIADMK previously gave 100 free units. Extension without income limit at current TANGEDCO financial stress would cost ₹4,000+ crore/year additionally. Solar for BPL homes has PM-KUSUM support.'),

-- POLICE MODERNIZATION
('AIADMK', 2026, 'governance', FALSE,
 'Modern weapons and equipment for police force; 10,000 new constable recruitments; body cameras for all patrol officers',
 'காவல் துறைக்கு நவீன ஆயுதங்கள் மற்றும் உபகரணங்கள்; 10,000 காவலர் ஆட்சேர்ப்பு; body cameras',
 5.5, 8.5, 6.5, 'Likely',
 'Police modernization is bipartisan. 10,000 constable recruitment is specific and achievable (TN has large recruitment capacity). Body cameras are increasingly common nationally.'),

-- INVESTOR SUMMIT
('AIADMK', 2026, 'employment', FALSE,
 'Global Investors Meet every 2 years; attract ₹10 lakh crore investment; streamline industrial approvals to 15 days',
 'உலகளாவிய முதலீட்டாளர் மாநாடு 2 ஆண்டுக்கொருமுறை; ₹10 லட்சம் கோடி முதலீடு ஈர்ப்போம்',
 5.0, 7.0, 5.5, 'Uncertain',
 'AIADMK hosted successful investor summits. But ₹10L crore target is vague compared to DMK''s ₹18L crore. 15-day industrial approval is specific and feasible through single window.'),

-- COASTAL FISHING RIGHTS
('AIADMK', 2026, 'fisheries', FALSE,
 'Revise India-Lanka fisheries agreement; protect Tamil fishermen from Sri Lankan Navy arrests; deep-sea fishing subsidies increased',
 'இந்திய-இலங்கை மீன்பிடி ஒப்பந்தம் திருத்தம்; தமிழக மீனவர்களை இலங்கை கடற்படை கைது தடுப்போம்',
 7.0, 8.0, 7.0, 'Uncertain',
 'Protecting fishermen from Sri Lanka Navy arrests requires central/foreign policy action. State can only raise voice at Centre. Both parties make this promise — delivery depends on diplomatic progress.'),

-- ARTS / CULTURE SCHOLARSHIPS (AIADMK)
('AIADMK', 2026, 'culture_language', FALSE,
 'Monthly stipend of ₹5,000 for folk artists; Jallikattu permanent protection enshrined in state law; Tamil classical music schools in all districts',
 'கலைஞர்களுக்கு மாதம் ₹5,000 உதவி; ஜல்லிக்கட்டுக்கு நிரந்தர சட்ட பாதுகாப்பு; மாவட்டங்களில் தமிழ் இசை பள்ளிகள்',
 6.5, 8.0, 7.0, 'Likely',
 'Folk artist stipend at ₹5,000 is specific and low-cost. Jallikattu protection law is politically popular and within state legislature''s power. Music schools feasible through Dept of Culture.');

-- ──────────────────────────────────────────────────────────────────
-- 7. Verify seed
-- ──────────────────────────────────────────────────────────────────
SELECT party, COUNT(*) as promise_count
FROM manifesto_promises
WHERE election_year = 2026
GROUP BY party
ORDER BY party;
