-- Migration 003: IPC Sections lookup table
-- Human-readable descriptions for criminal case sections

CREATE TABLE IF NOT EXISTS ipc_sections (
  id            SERIAL PRIMARY KEY,
  section_code  TEXT UNIQUE NOT NULL,
  description_en TEXT NOT NULL,
  description_ta TEXT NOT NULL,
  severity      TEXT CHECK (severity IN ('minor','moderate','serious','grave')) NOT NULL,
  category      TEXT,  -- e.g. 'violence', 'fraud', 'public order', 'corruption'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED: Top ~90 IPC sections found in TN 2021 election data
-- ============================================================

INSERT INTO ipc_sections (section_code, description_en, description_ta, severity, category) VALUES

-- PUBLIC ORDER & ASSEMBLY (most common in political cases)
('143', 'Unlawful assembly', 'சட்டவிரோத கூட்டம்', 'minor', 'public order'),
('144', 'Joining unlawful assembly armed with weapon', 'ஆயுதத்துடன் சட்டவிரோத கூட்டத்தில் சேர்தல்', 'moderate', 'public order'),
('145', 'Joining or continuing in unlawful assembly', 'சட்டவிரோத கூட்டத்தில் தொடர்தல்', 'minor', 'public order'),
('146', 'Rioting', 'கலவரம்', 'moderate', 'violence'),
('147', 'Rioting', 'கலவரம்', 'moderate', 'violence'),
('148', 'Rioting armed with deadly weapon', 'ஆயுதத்துடன் கலவரம்', 'serious', 'violence'),
('149', 'Every member of unlawful assembly guilty of offence committed', 'சட்டவிரோத கூட்டத்தின் உறுப்பினர் குற்றத்திற்கு பொறுப்பு', 'moderate', 'public order'),
('151', 'Knowingly joining or continuing in assembly after it is commanded to disperse', 'கலைக்க உத்தரவிட்ட பின்னும் கூட்டத்தில் தொடர்தல்', 'minor', 'public order'),
('152', 'Assaulting or obstructing public servant when suppressing riot', 'கலவரத்தை அடக்கும் அரசு ஊழியரைத் தாக்குதல்', 'serious', 'violence'),
('153', 'Wantonly giving provocation with intent to cause riot', 'கலவரம் தூண்டும் நோக்கத்துடன் ஆத்திரமூட்டுதல்', 'moderate', 'public order'),
('153A', 'Promoting enmity between groups on grounds of religion, race, etc.', 'மதம், இனம் அடிப்படையில் குழுக்களிடையே பகைமை தூண்டுதல்', 'serious', 'hate speech'),
('153B', 'Assertions prejudicial to national integration', 'தேசிய ஒருமைப்பாட்டிற்கு பாதகமான கூற்றுகள்', 'serious', 'hate speech'),
('155', 'Liability of person for whose benefit riot is committed', 'கலவரத்தால் பயனடைபவரின் பொறுப்பு', 'moderate', 'public order'),

-- CRIMINAL INTIMIDATION & RESTRAINT
('341', 'Wrongful restraint', 'தவறான தடுப்பு', 'minor', 'restraint'),
('342', 'Wrongful confinement', 'தவறான சிறைவைப்பு', 'moderate', 'restraint'),
('343', 'Wrongful confinement for 3 or more days', 'மூன்று நாட்களுக்கு மேல் தவறான சிறைவைப்பு', 'serious', 'restraint'),
('347', 'Wrongful confinement to extort property', 'சொத்து பறிக்க தவறான சிறைவைப்பு', 'serious', 'restraint'),
('504', 'Intentional insult with intent to provoke breach of peace', 'அமைதியை குலைக்கும் நோக்கத்துடன் வேண்டுமென்றே அவமானம்', 'minor', 'intimidation'),
('506', 'Criminal intimidation', 'குற்றவியல் மிரட்டல்', 'moderate', 'intimidation'),
('507', 'Criminal intimidation by anonymous communication', 'அநாமதேய தகவல் மூலம் மிரட்டல்', 'moderate', 'intimidation'),
('509', 'Word, gesture or act intended to insult modesty of a woman', 'பெண்ணின் நாணயத்தை அவமானப்படுத்தும் சொல்/செயல்', 'moderate', 'sexual offence'),

-- HURT & VIOLENCE
('323', 'Voluntarily causing hurt', 'தன்னிச்சையாக காயம் விளைவித்தல்', 'minor', 'violence'),
('324', 'Voluntarily causing hurt by dangerous weapon', 'ஆபத்தான ஆயுதத்தால் காயம்', 'serious', 'violence'),
('325', 'Voluntarily causing grievous hurt', 'தன்னிச்சையாக கடுமையான காயம்', 'serious', 'violence'),
('326', 'Voluntarily causing grievous hurt by dangerous weapon', 'ஆபத்தான ஆயுதத்தால் கடுமையான காயம்', 'grave', 'violence'),
('332', 'Voluntarily causing hurt to deter public servant from duty', 'அரசு ஊழியரை கடமையிலிருந்து தடுக்க காயம்', 'serious', 'violence'),
('333', 'Voluntarily causing grievous hurt to deter public servant', 'அரசு ஊழியரைத் தடுக்க கடுமையான காயம்', 'grave', 'violence'),
('335', 'Voluntarily causing grievous hurt on provocation', 'ஆத்திரத்தில் கடுமையான காயம்', 'moderate', 'violence'),
('336', 'Act endangering life or personal safety of others', 'பிறரின் உயிர் அல்லது பாதுகாப்பை ஆபத்தில் ஆழ்த்தும் செயல்', 'moderate', 'violence'),
('337', 'Causing hurt by act endangering life or safety', 'ஆபத்தான செயலால் காயம்', 'moderate', 'violence'),
('338', 'Causing grievous hurt by act endangering life', 'ஆபத்தான செயலால் கடுமையான காயம்', 'serious', 'violence'),
('351', 'Assault or criminal force to deter public servant from duty', 'அரசு ஊழியரை கடமையிலிருந்து தடுக்க தாக்குதல்', 'moderate', 'violence'),
('352', 'Assault or criminal force otherwise than on grave provocation', 'தூண்டுதல் இல்லாமல் தாக்குதல்', 'minor', 'violence'),
('353', 'Assault or criminal force to deter public servant from duty', 'அரசு ஊழியரை கடமையிலிருந்து தடுக்க தாக்குதல்', 'serious', 'violence'),
('354', 'Assault or criminal force to woman with intent to outrage modesty', 'பெண்ணின் நாணயத்தை சீர்குலைக்க தாக்குதல்', 'serious', 'sexual offence'),
('355', 'Assault or criminal force with intent to dishonour', 'அவமானப்படுத்தும் நோக்கத்துடன் தாக்குதல்', 'moderate', 'violence'),
('356', 'Assault or criminal force in attempt to commit theft', 'திருட்டு முயற்சியில் தாக்குதல்', 'moderate', 'violence'),

-- MURDER & ATTEMPT TO MURDER
('302', 'Murder', 'கொலை', 'grave', 'violence'),
('304', 'Culpable homicide not amounting to murder', 'கொலை அளவிற்கு இல்லாத மரணம் விளைவித்தல்', 'grave', 'violence'),
('304A', 'Causing death by negligence', 'அலட்சியத்தால் மரணம்', 'serious', 'violence'),
('306', 'Abetment of suicide', 'தற்கொலைக்கு உடந்தை', 'grave', 'violence'),
('307', 'Attempt to murder', 'கொலை முயற்சி', 'grave', 'violence'),
('308', 'Attempt to commit culpable homicide', 'மரணம் விளைவிக்க முயற்சி', 'grave', 'violence'),

-- KIDNAPPING
('363', 'Kidnapping', 'கடத்தல்', 'serious', 'kidnapping'),
('364', 'Kidnapping or abducting in order to murder', 'கொலை நோக்கத்தில் கடத்தல்', 'grave', 'kidnapping'),
('365', 'Kidnapping or abducting with intent to secretly confine', 'ரகசிய சிறைவைப்புக்கு கடத்தல்', 'serious', 'kidnapping'),

-- THEFT, ROBBERY & PROPERTY
('379', 'Theft', 'திருட்டு', 'moderate', 'property'),
('380', 'Theft in dwelling house', 'வீட்டில் திருட்டு', 'moderate', 'property'),
('384', 'Extortion', 'மிரட்டி பணம் பறித்தல்', 'serious', 'property'),
('385', 'Putting person in fear of injury to commit extortion', 'பணம் பறிக்க மிரட்டல்', 'serious', 'property'),
('386', 'Extortion by putting a person in fear of death or grievous hurt', 'உயிர் மிரட்டலுடன் பணம் பறித்தல்', 'grave', 'property'),
('387', 'Putting person in fear of death to commit extortion', 'கொலை மிரட்டலுடன் பணம் பறித்தல்', 'grave', 'property'),
('392', 'Robbery', 'கொள்ளை', 'serious', 'property'),
('394', 'Voluntarily causing hurt in committing robbery', 'கொள்ளையில் காயம்', 'grave', 'property'),
('395', 'Dacoity', 'கொள்ளைக்குழு', 'grave', 'property'),
('397', 'Robbery or dacoity with attempt to cause death or grievous hurt', 'கொலை முயற்சியுடன் கொள்ளை', 'grave', 'property'),
('399', 'Making preparation for dacoity', 'கொள்ளைக்கு தயாரிப்பு', 'serious', 'property'),
('400', 'Punishment for belonging to gang of dacoits', 'கொள்ளைக்குழுவில் உறுப்பினர்', 'serious', 'property'),

-- CRIMINAL TRESPASS
('447', 'Criminal trespass', 'குற்றவியல் அத்துமீறல்', 'minor', 'trespass'),
('448', 'House-trespass', 'வீட்டு அத்துமீறல்', 'moderate', 'trespass'),
('449', 'House-trespass to commit offence punishable with death', 'மரண தண்டனை குற்றம் செய்ய வீட்டு அத்துமீறல்', 'grave', 'trespass'),
('450', 'House-trespass to commit offence punishable with imprisonment for life', 'ஆயுள் தண்டனை குற்றம் செய்ய வீட்டு அத்துமீறல்', 'grave', 'trespass'),
('451', 'House-trespass to commit offence', 'குற்றம் செய்ய வீட்டு அத்துமீறல்', 'moderate', 'trespass'),
('452', 'House-trespass after preparation for hurt, assault, or wrongful restraint', 'தாக்குதலுக்கு தயாராகி வீட்டு அத்துமீறல்', 'serious', 'trespass'),
('454', 'Lurking house-trespass or house-breaking to commit offence', 'பதுங்கி வீட்டு அத்துமீறல்', 'serious', 'trespass'),
('457', 'Lurking house-trespass by night to commit offence', 'இரவில் பதுங்கி வீட்டு அத்துமீறல்', 'serious', 'trespass'),

-- MISCHIEF & PROPERTY DAMAGE
('427', 'Mischief causing damage to amount of ₹50 or more', 'சொத்து சேதம்', 'minor', 'property'),
('435', 'Mischief by fire or explosive with intent to cause damage', 'தீ/வெடிமருந்து மூலம் சேதம்', 'serious', 'property'),
('436', 'Mischief by fire or explosive with intent to destroy house', 'வீட்டை அழிக்க தீவைப்பு', 'grave', 'property'),

-- FRAUD, CHEATING & FORGERY
('420', 'Cheating and dishonestly inducing delivery of property', 'மோசடி', 'serious', 'fraud'),
('406', 'Criminal breach of trust', 'நம்பிக்கை மோசடி', 'serious', 'fraud'),
('408', 'Criminal breach of trust by clerk or servant', 'ஊழியர் நம்பிக்கை மோசடி', 'serious', 'fraud'),
('409', 'Criminal breach of trust by public servant or banker', 'அரசு ஊழியர்/வங்கியாளர் நம்பிக்கை மோசடி', 'grave', 'fraud'),
('415', 'Cheating', 'ஏமாற்றுதல்', 'moderate', 'fraud'),
('417', 'Cheating - punishment', 'ஏமாற்றுதல் தண்டனை', 'moderate', 'fraud'),
('418', 'Cheating with knowledge that wrongful loss may ensue', 'இழப்பு ஏற்படும் என்று தெரிந்து ஏமாற்றுதல்', 'moderate', 'fraud'),
('419', 'Cheating by personation', 'போலி அடையாளத்தில் ஏமாற்றுதல்', 'moderate', 'fraud'),
('423', 'Dishonest or fraudulent removal of property', 'மோசடியாக சொத்து அகற்றுதல்', 'moderate', 'fraud'),
('465', 'Forgery', 'ஆவண போலி', 'serious', 'fraud'),
('467', 'Forgery of valuable security', 'மதிப்புள்ள ஆவண போலி', 'grave', 'fraud'),
('468', 'Forgery for purpose of cheating', 'ஏமாற்றுவதற்கு ஆவண போலி', 'grave', 'fraud'),
('471', 'Using forged document as genuine', 'போலி ஆவணத்தை உண்மையானது போல் பயன்படுத்துதல்', 'serious', 'fraud'),
('474', 'Having possession of forged document', 'போலி ஆவணம் வைத்திருத்தல்', 'serious', 'fraud'),
('477A', 'Falsification of accounts', 'கணக்கு பொய்யாக்கல்', 'serious', 'fraud'),

-- DEFAMATION
('499', 'Defamation', 'அவதூறு', 'minor', 'defamation'),
('500', 'Punishment for defamation', 'அவதூறு தண்டனை', 'minor', 'defamation'),
('501', 'Printing or engraving matter known to be defamatory', 'அவதூறு அச்சிடுதல்', 'minor', 'defamation'),

-- OBSCENITY & PUBLIC NUISANCE
('269', 'Negligent act likely to spread infection of disease', 'நோய் பரவ காரணமான அலட்சியமான செயல்', 'minor', 'public nuisance'),
('270', 'Malignant act likely to spread infection of disease', 'நோய் பரவ காரணமான தீங்கான செயல்', 'moderate', 'public nuisance'),
('271', 'Disobedience to quarantine rule', 'தனிமைப்படுத்தல் விதியை மீறுதல்', 'minor', 'public nuisance'),
('278', 'Making atmosphere noxious to health', 'சுகாதாரத்திற்கு தீங்கான சூழல்', 'minor', 'public nuisance'),
('279', 'Rash driving on a public way', 'பொது சாலையில் பொறுப்பற்ற ஓட்டம்', 'moderate', 'public nuisance'),
('283', 'Danger or obstruction in public way', 'பொது பாதையில் ஆபத்து/தடை', 'minor', 'public nuisance'),
('285', 'Negligent conduct with respect to fire or combustible matter', 'தீ/எரிபொருள் பற்றிய அலட்சியம்', 'moderate', 'public nuisance'),
('286', 'Negligent conduct with respect to explosive substance', 'வெடிபொருள் பற்றிய அலட்சியம்', 'moderate', 'public nuisance'),
('288', 'Negligent conduct with respect to pulling down or repairing buildings', 'கட்டிட வேலையில் அலட்சியம்', 'minor', 'public nuisance'),
('290', 'Punishment for public nuisance', 'பொது தொல்லை தண்டனை', 'minor', 'public nuisance'),
('291', 'Continuance of nuisance after injunction to discontinue', 'தடை உத்தரவுக்குப் பின் தொல்லை தொடர்தல்', 'minor', 'public nuisance'),
('294', 'Obscene acts and songs', 'ஆபாச செயல்கள் மற்றும் பாடல்கள்', 'minor', 'obscenity'),
('294B', 'Obscene language in public place', 'பொது இடத்தில் கெட்ட வார்த்தை', 'minor', 'obscenity'),

-- GOVERNMENT & PUBLIC SERVANT OFFENCES
('186', 'Obstructing public servant in discharge of public functions', 'அரசு ஊழியரின் பணியைத் தடுத்தல்', 'moderate', 'government'),
('188', 'Disobedience to order duly promulgated by public servant', 'அரசு உத்தரவை மீறுதல்', 'minor', 'government'),
('189', 'Threat of injury to public servant', 'அரசு ஊழியரை காயப்படுத்த மிரட்டல்', 'moderate', 'government'),
('201', 'Causing disappearance of evidence or giving false information', 'ஆதாரம் அழிப்பு/பொய் தகவல்', 'serious', 'government'),

-- ELECTION OFFENCES
('171C', 'Bribery at elections', 'தேர்தலில் லஞ்சம்', 'serious', 'election'),
('171E', 'Punishment for undue influence at elections', 'தேர்தலில் முறையற்ற செல்வாக்கு', 'serious', 'election'),
('171F', 'Punishment for personation at election', 'தேர்தலில் போலி வாக்களிப்பு', 'serious', 'election'),
('171G', 'False statement in connection with election', 'தேர்தல் தொடர்பான பொய் அறிக்கை', 'moderate', 'election'),
('171H', 'Illegal payments in connection with election', 'தேர்தல் தொடர்பான சட்டவிரோத பணம்', 'serious', 'election'),

-- SEDITION & STATEMENTS
('124A', 'Sedition', 'தேசத்துரோகம்', 'grave', 'sedition'),
('505', 'Statements conducing to public mischief', 'பொது குழப்பம் தூண்டும் அறிக்கைகள்', 'serious', 'public order'),
('295A', 'Deliberate and malicious acts intended to outrage religious feelings', 'மத உணர்வுகளை புண்படுத்தும் வேண்டுமென்ற செயல்', 'serious', 'hate speech'),

-- ABETMENT & CONSPIRACY
('34', 'Acts done by several persons in furtherance of common intention', 'பொது நோக்கத்துடன் கூட்டு செயல்', 'minor', 'abetment'),
('107', 'Abetment of a thing', 'குற்றத்திற்கு உடந்தை', 'moderate', 'abetment'),
('109', 'Punishment of abetment if act abetted is committed', 'உடந்தை குற்றத்திற்கு தண்டனை', 'moderate', 'abetment'),
('120B', 'Criminal conspiracy', 'குற்றவியல் சதி', 'serious', 'conspiracy'),

-- MISC
('138', 'Dishonour of cheque (NI Act)', 'காசோலை மோசடி', 'moderate', 'fraud'),
('166', 'Public servant disobeying law with intent to cause injury', 'அரசு ஊழியர் சட்ட மீறல்', 'moderate', 'government'),
('167', 'Public servant framing incorrect document', 'அரசு ஊழியர் தவறான ஆவணம் தயாரித்தல்', 'moderate', 'government'),
('376', 'Rape', 'பாலியல் வன்கொடுமை', 'grave', 'sexual offence'),
('498A', 'Husband or relative of husband subjecting woman to cruelty', 'கணவன் கொடுமை', 'serious', 'domestic violence'),
('511', 'Punishment for attempting to commit offences', 'குற்ற முயற்சிக்கான தண்டனை', 'minor', 'abetment')

ON CONFLICT (section_code) DO NOTHING;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ipc_section_code ON ipc_sections(section_code);
CREATE INDEX IF NOT EXISTS idx_ipc_severity ON ipc_sections(severity);
