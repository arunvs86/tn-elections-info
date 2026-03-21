"""
IPC (Indian Penal Code) Section lookup table.
Maps section numbers to human-readable descriptions in English and Tamil,
with severity levels for UI color-coding.

Severity levels:
  - "grave"    → red    (murder, attempt to murder, kidnapping, dacoity)
  - "serious"  → orange (rioting with weapons, causing grievous hurt, robbery)
  - "moderate" → yellow (cheating, forgery, criminal intimidation, trespass)
  - "minor"    → grey   (unlawful assembly, disobedience, obscene language)
"""

IPC_SECTIONS = {
    # ── Common sections in TN elections (top 80+) ──────────────────────

    # Unlawful assembly & rioting
    "141": {
        "en": "Unlawful assembly",
        "ta": "சட்டவிரோத கூட்டம்",
        "severity": "minor",
    },
    "142": {
        "en": "Being member of unlawful assembly",
        "ta": "சட்டவிரோத கூட்டத்தில் உறுப்பினராக இருத்தல்",
        "severity": "minor",
    },
    "143": {
        "en": "Punishment for unlawful assembly",
        "ta": "சட்டவிரோத கூட்டம் — தண்டனை",
        "severity": "minor",
    },
    "144": {
        "en": "Joining unlawful assembly armed with deadly weapon",
        "ta": "ஆயுதத்துடன் சட்டவிரோத கூட்டத்தில் சேருதல்",
        "severity": "serious",
    },
    "145": {
        "en": "Joining or continuing in unlawful assembly knowing it has been commanded to disperse",
        "ta": "கலைக்கச் சொன்ன பின்னும் சட்டவிரோத கூட்டத்தில் தொடர்தல்",
        "severity": "minor",
    },
    "146": {
        "en": "Rioting",
        "ta": "கலவரம்",
        "severity": "serious",
    },
    "147": {
        "en": "Punishment for rioting",
        "ta": "கலவரத்திற்கு தண்டனை",
        "severity": "serious",
    },
    "148": {
        "en": "Rioting armed with deadly weapon",
        "ta": "ஆயுதத்துடன் கலவரம்",
        "severity": "serious",
    },
    "149": {
        "en": "Every member of unlawful assembly guilty of offence committed",
        "ta": "சட்டவிரோத கூட்டத்தின் எல்லா உறுப்பினர்களும் குற்றவாளிகள்",
        "severity": "minor",
    },

    # Public nuisance & disobedience
    "151": {
        "en": "Knowingly joining or continuing in assembly of five or more after it has been commanded to disperse",
        "ta": "கலைக்கச் சொன்ன பின்னும் கூட்டத்தில் தொடர்தல்",
        "severity": "minor",
    },
    "152": {
        "en": "Assaulting or obstructing public servant when suppressing riot",
        "ta": "கலவரத்தை அடக்கும் அரசு ஊழியரைத் தாக்குதல்",
        "severity": "serious",
    },
    "153": {
        "en": "Wantonly giving provocation with intent to cause riot",
        "ta": "கலவரத்தை தூண்டும் வகையில் வேண்டுமென்றே ஆத்திரமூட்டுதல்",
        "severity": "moderate",
    },
    "153A": {
        "en": "Promoting enmity between groups on grounds of religion, race, etc.",
        "ta": "மதம், இனம் அடிப்படையில் குழுக்களுக்கிடையே பகைமையை வளர்த்தல்",
        "severity": "serious",
    },
    "153B": {
        "en": "Imputations, assertions prejudicial to national integration",
        "ta": "தேசிய ஒருமைப்பாட்டிற்கு எதிரான கூற்றுகள்",
        "severity": "serious",
    },

    # Offences against the State
    "124": {
        "en": "Assaulting or obstructing President, Governor, etc.",
        "ta": "குடியரசுத் தலைவர்/ஆளுநரைத் தாக்குதல்",
        "severity": "grave",
    },
    "124A": {
        "en": "Sedition",
        "ta": "தேசத்துரோகம்",
        "severity": "grave",
    },

    # Election offences
    "171B": {
        "en": "Bribery in elections",
        "ta": "தேர்தலில் லஞ்சம்",
        "severity": "serious",
    },
    "171C": {
        "en": "Undue influence at elections",
        "ta": "தேர்தலில் முறையற்ற செல்வாக்கு",
        "severity": "moderate",
    },
    "171E": {
        "en": "Punishment for bribery in elections",
        "ta": "தேர்தல் லஞ்சத்திற்கு தண்டனை",
        "severity": "serious",
    },
    "171F": {
        "en": "Punishment for undue influence or personation at election",
        "ta": "தேர்தலில் முறையற்ற செல்வாக்கு/ஆள்மாறாட்டத்திற்கு தண்டனை",
        "severity": "moderate",
    },
    "171G": {
        "en": "False statement in connection with election",
        "ta": "தேர்தல் தொடர்பான பொய்யான அறிக்கை",
        "severity": "moderate",
    },
    "171H": {
        "en": "Illegal payments in connection with election",
        "ta": "தேர்தலில் சட்டவிரோத பணப்பரிவர்த்தனை",
        "severity": "serious",
    },

    # Disobedience to public servants
    "186": {
        "en": "Obstructing public servant in discharge of public functions",
        "ta": "அரசு ஊழியரின் பணியைத் தடுத்தல்",
        "severity": "minor",
    },
    "188": {
        "en": "Disobedience to order by public servant",
        "ta": "அரசு ஊழியரின் உத்தரவை மீறுதல்",
        "severity": "minor",
    },
    "189": {
        "en": "Threat of injury to public servant",
        "ta": "அரசு ஊழியரை காயப்படுத்துவதாக மிரட்டல்",
        "severity": "moderate",
    },

    # False evidence & screening offenders
    "201": {
        "en": "Causing disappearance of evidence or giving false information",
        "ta": "ஆதாரங்களை மறைத்தல் / பொய் தகவல் கொடுத்தல்",
        "severity": "moderate",
    },

    # Offences against public tranquillity
    "268": {
        "en": "Public nuisance",
        "ta": "பொது தொல்லை",
        "severity": "minor",
    },
    "269": {
        "en": "Negligent act likely to spread infection of disease",
        "ta": "நோய் பரவ வழிவகுக்கும் அலட்சிய செயல்",
        "severity": "minor",
    },
    "270": {
        "en": "Malignant act likely to spread infection of disease",
        "ta": "நோய் பரவ வேண்டுமென்றே செய்யும் செயல்",
        "severity": "moderate",
    },
    "271": {
        "en": "Disobedience to quarantine rule",
        "ta": "தனிமைப்படுத்தல் விதியை மீறுதல்",
        "severity": "minor",
    },
    "277": {
        "en": "Fouling water of public spring or reservoir",
        "ta": "பொது நீர் நிலையை மாசுபடுத்துதல்",
        "severity": "minor",
    },
    "278": {
        "en": "Making atmosphere noxious to health",
        "ta": "சுகாதாரத்திற்கு தீங்கான சூழலை உருவாக்குதல்",
        "severity": "minor",
    },
    "279": {
        "en": "Rash driving or riding on a public way",
        "ta": "பொது சாலையில் பொறுப்பற்ற வாகன ஓட்டம்",
        "severity": "minor",
    },
    "282": {
        "en": "Conveying person by water for hire in unsafe vessel",
        "ta": "பாதுகாப்பற்ற படகில் ஆள் ஏற்றிச் செல்லுதல்",
        "severity": "minor",
    },
    "283": {
        "en": "Danger or obstruction in public way or line of navigation",
        "ta": "பொது வழியில் ஆபத்து அல்லது தடை",
        "severity": "minor",
    },
    "285": {
        "en": "Negligent conduct with respect to fire or combustible matter",
        "ta": "தீ / எரியும் பொருள் குறித்த அலட்சியம்",
        "severity": "minor",
    },
    "286": {
        "en": "Negligent conduct with respect to explosive substance",
        "ta": "வெடிபொருள் குறித்த அலட்சியம்",
        "severity": "moderate",
    },
    "288": {
        "en": "Negligent conduct with respect to pulling down or repairing buildings",
        "ta": "கட்டிடம் இடிப்பு/பழுதுபார்ப்பில் அலட்சியம்",
        "severity": "minor",
    },
    "290": {
        "en": "Punishment for public nuisance",
        "ta": "பொது தொல்லைக்கு தண்டனை",
        "severity": "minor",
    },
    "291": {
        "en": "Continuance of nuisance after injunction to discontinue",
        "ta": "நிறுத்தச் சொன்ன பின்னும் தொல்லையை தொடர்தல்",
        "severity": "minor",
    },

    # Obscenity
    "292": {
        "en": "Sale of obscene books, etc.",
        "ta": "ஆபாச புத்தகங்கள் விற்பனை",
        "severity": "minor",
    },
    "294": {
        "en": "Obscene acts and songs",
        "ta": "ஆபாச செயல்கள் மற்றும் பாடல்கள்",
        "severity": "minor",
    },
    "294B": {
        "en": "Uttering obscene words in public",
        "ta": "பொது இடத்தில் கெட்ட வார்த்தைகள் பேசுதல்",
        "severity": "minor",
    },
    "295A": {
        "en": "Deliberate acts to outrage religious feelings",
        "ta": "மத உணர்வுகளை வேண்டுமென்றே புண்படுத்துதல்",
        "severity": "serious",
    },
    "297": {
        "en": "Trespassing on burial places, etc.",
        "ta": "இடுகாடு/சுடுகாட்டில் அத்துமீறுதல்",
        "severity": "minor",
    },
    "298": {
        "en": "Uttering words with deliberate intent to wound religious feelings",
        "ta": "மத உணர்வுகளை புண்படுத்த வேண்டுமென்றே வார்த்தைகள் பேசுதல்",
        "severity": "moderate",
    },

    # Offences against human body — Hurt
    "302": {
        "en": "Murder",
        "ta": "கொலை",
        "severity": "grave",
    },
    "304": {
        "en": "Culpable homicide not amounting to murder",
        "ta": "கொலை அளவுக்கு வராத மனிதக்கொலை",
        "severity": "grave",
    },
    "304A": {
        "en": "Death by negligence",
        "ta": "அலட்சியத்தால் மரணம்",
        "severity": "grave",
    },
    "306": {
        "en": "Abetment of suicide",
        "ta": "தற்கொலைக்கு தூண்டுதல்",
        "severity": "grave",
    },
    "307": {
        "en": "Attempt to murder",
        "ta": "கொலை முயற்சி",
        "severity": "grave",
    },
    "308": {
        "en": "Attempt to commit culpable homicide",
        "ta": "மனிதக்கொலை செய்ய முயற்சி",
        "severity": "grave",
    },
    "321": {
        "en": "Voluntarily causing hurt",
        "ta": "வேண்டுமென்றே காயம் விளைவித்தல்",
        "severity": "moderate",
    },
    "323": {
        "en": "Punishment for voluntarily causing hurt",
        "ta": "வேண்டுமென்றே காயம் — தண்டனை",
        "severity": "moderate",
    },
    "324": {
        "en": "Voluntarily causing hurt by dangerous weapons",
        "ta": "ஆபத்தான ஆயுதத்தால் காயம் விளைவித்தல்",
        "severity": "serious",
    },
    "325": {
        "en": "Punishment for voluntarily causing grievous hurt",
        "ta": "கடுமையான காயம் — தண்டனை",
        "severity": "serious",
    },
    "326": {
        "en": "Voluntarily causing grievous hurt by dangerous weapons",
        "ta": "ஆபத்தான ஆயுதத்தால் கடுமையான காயம்",
        "severity": "serious",
    },
    "327": {
        "en": "Voluntarily causing hurt to extort property or valuable security",
        "ta": "சொத்து பறிக்க காயம் விளைவித்தல்",
        "severity": "serious",
    },
    "332": {
        "en": "Voluntarily causing hurt to deter public servant from duty",
        "ta": "அரசு ஊழியரை பணியிலிருந்து தடுக்க காயம் விளைவித்தல்",
        "severity": "serious",
    },
    "333": {
        "en": "Voluntarily causing grievous hurt to deter public servant from duty",
        "ta": "அரசு ஊழியரை பணியிலிருந்து தடுக்க கடுமையான காயம்",
        "severity": "serious",
    },
    "335": {
        "en": "Voluntarily causing grievous hurt on provocation",
        "ta": "ஆத்திரத்தில் கடுமையான காயம் விளைவித்தல்",
        "severity": "serious",
    },
    "336": {
        "en": "Act endangering life or personal safety of others",
        "ta": "பிறர் உயிர் / பாதுகாப்புக்கு ஆபத்தான செயல்",
        "severity": "moderate",
    },
    "337": {
        "en": "Causing hurt by act endangering life or personal safety",
        "ta": "ஆபத்தான செயலால் காயம் விளைவித்தல்",
        "severity": "moderate",
    },
    "338": {
        "en": "Causing grievous hurt by act endangering life",
        "ta": "ஆபத்தான செயலால் கடுமையான காயம்",
        "severity": "serious",
    },

    # Wrongful restraint & confinement
    "341": {
        "en": "Wrongful restraint",
        "ta": "தவறான தடுப்பு / வழிமறித்தல்",
        "severity": "moderate",
    },
    "342": {
        "en": "Wrongful confinement",
        "ta": "தவறான சிறைவைப்பு",
        "severity": "moderate",
    },
    "343": {
        "en": "Wrongful confinement for three or more days",
        "ta": "மூன்று நாட்களுக்கு மேல் தவறான சிறைவைப்பு",
        "severity": "serious",
    },
    "347": {
        "en": "Wrongful confinement to extort property",
        "ta": "சொத்து பறிக்க தவறான சிறைவைப்பு",
        "severity": "serious",
    },

    # Criminal force & assault
    "352": {
        "en": "Punishment for assault or criminal force otherwise than on grave provocation",
        "ta": "தாக்குதல் / குற்றவியல் பலம் — தண்டனை",
        "severity": "moderate",
    },
    "353": {
        "en": "Assault or criminal force to deter public servant from duty",
        "ta": "அரசு ஊழியரைப் பணியிலிருந்து தடுக்க தாக்குதல்",
        "severity": "serious",
    },
    "354": {
        "en": "Assault or criminal force to woman with intent to outrage her modesty",
        "ta": "பெண்ணின் கற்பொழுக்கத்தை சிதைக்கும் நோக்கில் தாக்குதல்",
        "severity": "grave",
    },
    "355": {
        "en": "Assault or criminal force with intent to dishonour person",
        "ta": "அவமானப்படுத்தும் நோக்கில் தாக்குதல்",
        "severity": "moderate",
    },
    "356": {
        "en": "Assault or criminal force in attempt to commit theft",
        "ta": "திருடும் முயற்சியில் தாக்குதல்",
        "severity": "serious",
    },

    # Kidnapping & abduction
    "363": {
        "en": "Kidnapping",
        "ta": "கடத்தல்",
        "severity": "grave",
    },
    "364": {
        "en": "Kidnapping or abducting in order to murder",
        "ta": "கொலை நோக்கில் கடத்தல்",
        "severity": "grave",
    },
    "365": {
        "en": "Kidnapping or abducting with intent to secretly and wrongfully confine",
        "ta": "ரகசியமாக சிறைவைக்கும் நோக்கில் கடத்தல்",
        "severity": "grave",
    },
    "366B": {
        "en": "Importation of girl from foreign country",
        "ta": "வெளிநாட்டிலிருந்து பெண்ணை கொண்டு வருதல்",
        "severity": "grave",
    },
    "370": {
        "en": "Trafficking of persons",
        "ta": "மனித கடத்தல்",
        "severity": "grave",
    },
    "376": {
        "en": "Rape",
        "ta": "பாலியல் வன்கொடுமை",
        "severity": "grave",
    },

    # Robbery & dacoity
    "379": {
        "en": "Theft",
        "ta": "திருட்டு",
        "severity": "moderate",
    },
    "380": {
        "en": "Theft in dwelling house",
        "ta": "வீட்டில் திருட்டு",
        "severity": "moderate",
    },
    "384": {
        "en": "Extortion",
        "ta": "மிரட்டி பணம் பறித்தல்",
        "severity": "serious",
    },
    "385": {
        "en": "Putting person in fear of injury in order to commit extortion",
        "ta": "பணம் பறிக்க அச்சுறுத்துதல்",
        "severity": "serious",
    },
    "386": {
        "en": "Extortion by putting a person in fear of death or grievous hurt",
        "ta": "கொலை/காயம் மிரட்டி பணம் பறிப்பு",
        "severity": "serious",
    },
    "387": {
        "en": "Putting person in fear of death or grievous hurt in order to commit extortion",
        "ta": "பணம் பறிக்க உயிர் மிரட்டல்",
        "severity": "serious",
    },
    "389": {
        "en": "Putting person in fear of accusation of offence in order to commit extortion",
        "ta": "குற்றச்சாட்டு மிரட்டி பணம் பறிப்பு",
        "severity": "serious",
    },
    "392": {
        "en": "Robbery",
        "ta": "கொள்ளை",
        "severity": "grave",
    },
    "394": {
        "en": "Voluntarily causing hurt in committing robbery",
        "ta": "கொள்ளையில் காயம் விளைவித்தல்",
        "severity": "grave",
    },
    "395": {
        "en": "Dacoity",
        "ta": "கொள்ளைக்கூட்டம் (டாக்காயிட்டி)",
        "severity": "grave",
    },
    "397": {
        "en": "Robbery or dacoity with attempt to cause death or grievous hurt",
        "ta": "கொலை முயற்சியுடன் கொள்ளை",
        "severity": "grave",
    },
    "399": {
        "en": "Making preparation to commit dacoity",
        "ta": "கொள்ளைக்கு தயாரிப்பு",
        "severity": "serious",
    },
    "400": {
        "en": "Punishment for belonging to gang of dacoits",
        "ta": "கொள்ளைக்கூட்டத்தில் உறுப்பினராக இருத்தல்",
        "severity": "grave",
    },

    # Criminal misappropriation & breach of trust
    "403": {
        "en": "Dishonest misappropriation of property",
        "ta": "சொத்தை நேர்மையற்ற முறையில் தனதாக்கிக் கொள்ளுதல்",
        "severity": "moderate",
    },
    "405": {
        "en": "Criminal breach of trust",
        "ta": "நம்பிக்கை துரோகம் (குற்றவியல்)",
        "severity": "moderate",
    },
    "406": {
        "en": "Punishment for criminal breach of trust",
        "ta": "நம்பிக்கை துரோகம் — தண்டனை",
        "severity": "moderate",
    },
    "408": {
        "en": "Criminal breach of trust by clerk or servant",
        "ta": "பணியாளரின் நம்பிக்கை துரோகம்",
        "severity": "moderate",
    },
    "409": {
        "en": "Criminal breach of trust by public servant, banker, merchant or agent",
        "ta": "அரசு ஊழியர்/வங்கியாளர் நம்பிக்கை துரோகம்",
        "severity": "serious",
    },

    # Cheating
    "415": {
        "en": "Cheating",
        "ta": "ஏமாற்றுதல்",
        "severity": "moderate",
    },
    "417": {
        "en": "Punishment for cheating",
        "ta": "ஏமாற்றுதல் — தண்டனை",
        "severity": "moderate",
    },
    "418": {
        "en": "Cheating with knowledge that wrongful loss may ensue",
        "ta": "இழப்பு ஏற்படும் என்று தெரிந்தே ஏமாற்றுதல்",
        "severity": "moderate",
    },
    "419": {
        "en": "Cheating by personation",
        "ta": "ஆள்மாறாட்டம் செய்து ஏமாற்றுதல்",
        "severity": "moderate",
    },
    "420": {
        "en": "Cheating and dishonestly inducing delivery of property",
        "ta": "ஏமாற்றி சொத்து பறித்தல்",
        "severity": "serious",
    },
    "423": {
        "en": "Dishonest or fraudulent removal or concealment of property",
        "ta": "சொத்தை மோசடியாக மறைத்தல்/அகற்றுதல்",
        "severity": "moderate",
    },

    # Mischief
    "426": {
        "en": "Punishment for mischief",
        "ta": "குறும்புச் செயல் — தண்டனை",
        "severity": "minor",
    },
    "427": {
        "en": "Mischief causing damage of fifty rupees or more",
        "ta": "சேதம் விளைவிக்கும் குறும்புச் செயல்",
        "severity": "minor",
    },
    "435": {
        "en": "Mischief by fire or explosive with intent to cause damage",
        "ta": "சேதம் விளைவிக்க தீ/வெடிபொருள் பயன்படுத்துதல்",
        "severity": "serious",
    },
    "436": {
        "en": "Mischief by fire or explosive with intent to destroy house, etc.",
        "ta": "வீடு அழிக்க தீ/வெடிபொருள் பயன்படுத்துதல்",
        "severity": "grave",
    },

    # Criminal trespass
    "447": {
        "en": "Criminal trespass",
        "ta": "குற்றவியல் அத்துமீறல்",
        "severity": "minor",
    },
    "448": {
        "en": "House trespass",
        "ta": "வீட்டில் அத்துமீறி நுழைதல்",
        "severity": "moderate",
    },
    "449": {
        "en": "House trespass to commit offence punishable with death",
        "ta": "கொலை நோக்கில் வீட்டில் அத்துமீறல்",
        "severity": "grave",
    },
    "450": {
        "en": "House trespass to commit offence punishable with imprisonment for life",
        "ta": "ஆயுள் தண்டனைக் குற்றம் செய்ய வீட்டில் அத்துமீறல்",
        "severity": "grave",
    },
    "451": {
        "en": "House trespass to commit offence punishable with imprisonment",
        "ta": "சிறைத்தண்டனைக் குற்றம் செய்ய வீட்டில் அத்துமீறல்",
        "severity": "moderate",
    },
    "452": {
        "en": "House trespass after preparation for hurt, assault or wrongful restraint",
        "ta": "தாக்குதல் தயாரிப்புடன் வீட்டில் அத்துமீறல்",
        "severity": "serious",
    },
    "454": {
        "en": "Lurking house trespass or house-breaking to commit offence",
        "ta": "குற்றம் செய்ய வீடு உடைத்தல்",
        "severity": "serious",
    },
    "457": {
        "en": "Lurking house trespass or house-breaking by night to commit offence",
        "ta": "இரவில் வீடு உடைத்தல்",
        "severity": "serious",
    },

    # Forgery
    "465": {
        "en": "Punishment for forgery",
        "ta": "போலி ஆவணம் — தண்டனை",
        "severity": "moderate",
    },
    "466": {
        "en": "Forgery of record of court or of public register",
        "ta": "நீதிமன்ற/அரசு பதிவேட்டில் போலி",
        "severity": "serious",
    },
    "467": {
        "en": "Forgery of valuable security, will, etc.",
        "ta": "மதிப்புள்ள ஆவணம்/உயில் போலி",
        "severity": "serious",
    },
    "468": {
        "en": "Forgery for purpose of cheating",
        "ta": "ஏமாற்றுவதற்காக போலி ஆவணம்",
        "severity": "serious",
    },
    "471": {
        "en": "Using as genuine a forged document",
        "ta": "போலி ஆவணத்தை உண்மையானது போல் பயன்படுத்துதல்",
        "severity": "moderate",
    },
    "473": {
        "en": "Making or possessing counterfeit seal, etc.",
        "ta": "போலி முத்திரை தயாரித்தல்/வைத்திருத்தல்",
        "severity": "moderate",
    },
    "474": {
        "en": "Having possession of forged document with intent to use as genuine",
        "ta": "போலி ஆவணம் வைத்திருத்தல்",
        "severity": "moderate",
    },
    "477A": {
        "en": "Falsification of accounts",
        "ta": "கணக்குகளில் மோசடி",
        "severity": "serious",
    },

    # Defamation
    "499": {
        "en": "Defamation",
        "ta": "அவதூறு",
        "severity": "minor",
    },
    "500": {
        "en": "Punishment for defamation",
        "ta": "அவதூறு — தண்டனை",
        "severity": "minor",
    },
    "501": {
        "en": "Printing or engraving matter known to be defamatory",
        "ta": "அவதூறான பொருளை அச்சிடுதல்",
        "severity": "minor",
    },

    # Criminal intimidation & insult
    "504": {
        "en": "Intentional insult with intent to provoke breach of peace",
        "ta": "அமைதியை குலைக்கும் நோக்கில் வேண்டுமென்றே அவமானம்",
        "severity": "minor",
    },
    "505": {
        "en": "Statements conducing to public mischief",
        "ta": "பொது குழப்பத்தை உருவாக்கும் அறிக்கைகள்",
        "severity": "moderate",
    },
    "506": {
        "en": "Criminal intimidation",
        "ta": "குற்றவியல் மிரட்டல்",
        "severity": "moderate",
    },
    "507": {
        "en": "Criminal intimidation by anonymous communication",
        "ta": "அநாமதேய மிரட்டல்",
        "severity": "moderate",
    },
    "509": {
        "en": "Word, gesture or act intended to insult the modesty of a woman",
        "ta": "பெண்ணின் கற்பொழுக்கத்தை சிதைக்கும் வார்த்தை/செயல்",
        "severity": "serious",
    },
    "511": {
        "en": "Punishment for attempting to commit offences",
        "ta": "குற்றம் செய்ய முயற்சித்ததற்கான தண்டனை",
        "severity": "minor",
    },

    # Common modifiers
    "34": {
        "en": "Acts done by several persons in furtherance of common intention",
        "ta": "கூட்டு நோக்கத்தில் பலர் செய்த செயல்",
        "severity": "minor",
    },
    "107": {
        "en": "Abetment of a thing",
        "ta": "குற்றத்திற்கு உடந்தை",
        "severity": "minor",
    },
    "109": {
        "en": "Punishment of abetment if the act abetted is committed",
        "ta": "உடந்தையான குற்றம் நடந்தால் தண்டனை",
        "severity": "moderate",
    },
    "120B": {
        "en": "Criminal conspiracy",
        "ta": "குற்ற சதி",
        "severity": "serious",
    },

    # NI Act (not IPC but appears in data)
    "138": {
        "en": "Dishonour of cheque (Negotiable Instruments Act)",
        "ta": "காசோலை மோசடி (செக் பவுன்ஸ்)",
        "severity": "moderate",
    },

    # Domestic violence / matrimonial
    "498A": {
        "en": "Husband or relative subjecting woman to cruelty",
        "ta": "கணவர்/உறவினரால் பெண்ணுக்கு கொடுமை",
        "severity": "serious",
    },

    # Additional sections found in TN 2021 data
    "166": {
        "en": "Public servant disobeying law with intent to cause injury",
        "ta": "அரசு ஊழியர் சட்டத்தை வேண்டுமென்றே மீறுதல்",
        "severity": "moderate",
    },
    "166A": {
        "en": "Public servant knowingly disobeying direction of law",
        "ta": "அரசு ஊழியர் தெரிந்தே சட்ட வழிகாட்டுதலை மீறுதல்",
        "severity": "moderate",
    },
    "167": {
        "en": "Public servant framing an incorrect document",
        "ta": "அரசு ஊழியர் தவறான ஆவணம் தயாரித்தல்",
        "severity": "moderate",
    },
    "174A": {
        "en": "Non-appearance in response to proclamation",
        "ta": "பிடியாணைக்கு ஆஜராகாமை",
        "severity": "minor",
    },
    "177": {
        "en": "Furnishing false information",
        "ta": "பொய் தகவல் கொடுத்தல்",
        "severity": "minor",
    },
    "178": {
        "en": "Refusing oath or affirmation when duly required by public servant",
        "ta": "அரசு ஊழியர் கேட்ட சத்தியப்பிரமாணத்தை மறுத்தல்",
        "severity": "minor",
    },
    "180": {
        "en": "Refusing to sign statement",
        "ta": "வாக்குமூலத்தில் கையெழுத்திட மறுத்தல்",
        "severity": "minor",
    },
    "181": {
        "en": "False statement on oath or affirmation",
        "ta": "சத்தியப்பிரமாணத்தின் கீழ் பொய் கூறுதல்",
        "severity": "moderate",
    },
    "183": {
        "en": "Resistance to the taking of property by the lawful authority",
        "ta": "சட்டப்படி சொத்து எடுக்க எதிர்ப்பு",
        "severity": "minor",
    },
    "197": {
        "en": "Issuing or signing false certificate",
        "ta": "பொய்ச் சான்றிதழ் வழங்குதல்",
        "severity": "moderate",
    },
    "217": {
        "en": "Public servant disobeying direction of law with intent to save person from punishment",
        "ta": "தண்டனையிலிருந்து தப்பிக்க உதவும் அரசு ஊழியர்",
        "severity": "moderate",
    },
    "218": {
        "en": "Public servant framing incorrect record to save person from punishment",
        "ta": "குற்றவாளியை காப்பாற்ற தவறான பதிவு",
        "severity": "moderate",
    },
    "225": {
        "en": "Resistance or obstruction to lawful apprehension",
        "ta": "சட்டப்படி கைது செய்வதை எதிர்த்தல்",
        "severity": "moderate",
    },
    "241": {
        "en": "Delivery of coin possessed with knowledge that it is counterfeit",
        "ta": "போலி நாணயம் என்று தெரிந்தே கொடுத்தல்",
        "severity": "moderate",
    },
    "260": {
        "en": "Using as genuine Government stamp known to be counterfeit",
        "ta": "போலி அரசு முத்திரையை உண்மையானது போல் பயன்படுத்துதல்",
        "severity": "moderate",
    },
    "284": {
        "en": "Negligent conduct with respect to poisonous substance",
        "ta": "விஷப்பொருள் குறித்த அலட்சியம்",
        "severity": "moderate",
    },
    "364A": {
        "en": "Kidnapping for ransom",
        "ta": "மீட்புத்தொகைக்காக கடத்தல்",
        "severity": "grave",
    },
    "367": {
        "en": "Kidnapping to subject person to grievous hurt or slavery",
        "ta": "கடுமையான காயம்/அடிமைத்தனத்திற்கு கடத்தல்",
        "severity": "grave",
    },
    "374": {
        "en": "Unlawful compulsory labour",
        "ta": "சட்டவிரோத கட்டாய உழைப்பு",
        "severity": "serious",
    },
    "414": {
        "en": "Assisting in concealment of stolen property",
        "ta": "திருடிய சொத்தை மறைக்க உதவுதல்",
        "severity": "moderate",
    },
    "430": {
        "en": "Mischief by causing diminution of supply of water for agricultural purposes",
        "ta": "விவசாய நீர் வழங்கலை குறைக்கும் குறும்பு",
        "severity": "moderate",
    },
    "434": {
        "en": "Mischief by destroying or moving landmark",
        "ta": "எல்லைக்குறியை அழித்தல்/நகர்த்துதல்",
        "severity": "minor",
    },
    "488": {
        "en": "Neglect to maintain wife/children",
        "ta": "மனைவி/குழந்தைகளை பராமரிக்க தவறுதல்",
        "severity": "moderate",
    },
    "495": {
        "en": "Concealment of former marriage in subsequent marriage",
        "ta": "முந்தைய திருமணத்தை மறைத்து மறுமணம்",
        "severity": "serious",
    },
    "498": {
        "en": "Enticing or detaining married woman with criminal intent",
        "ta": "திருமணமான பெண்ணை குற்ற நோக்கத்துடன் கவர்தல்",
        "severity": "serious",
    },
}


def normalize_section(raw: str) -> str:
    """
    Normalize IPC section strings to match lookup keys.
    Examples:
      '294b' → '294B'
      '506(ii)' → '506'
      '120(b)' → '120B'
      '505(1)(b)' → '505'
      '188 OF IPC' → '188'
    """
    import re
    s = raw.strip()
    # Remove "OF IPC", "IPC" suffixes
    s = re.sub(r'\s*(OF\s+)?IPC\s*', '', s, flags=re.IGNORECASE).strip()
    # Remove "Sec." prefix
    s = re.sub(r'^Sec\.?\s*', '', s, flags=re.IGNORECASE).strip()
    # Remove "NI Act" suffix but keep section number
    s = re.sub(r'\s*NI\s+Act\s*', '', s, flags=re.IGNORECASE).strip()

    # Try to match base section + optional letter suffix
    # e.g., "506(ii)" → base="506", "120(b)" → "120B", "153A(1)(a)" → "153A"
    m = re.match(r'^(\d+)\s*([A-Za-z])?\s*(?:\(.*\))?$', s)
    if m:
        base = m.group(1)
        suffix = (m.group(2) or '').upper()
        return base + suffix

    # Fallback: uppercase it
    return s.upper()


def lookup_section(raw: str) -> dict:
    """
    Look up a raw IPC section string and return its description.
    Returns dict with keys: section, en, ta, severity.
    If not found, returns a generic entry.
    """
    normalized = normalize_section(raw)

    # Direct match
    if normalized in IPC_SECTIONS:
        info = IPC_SECTIONS[normalized]
        return {
            "section": normalized,
            "en": info["en"],
            "ta": info["ta"],
            "severity": info["severity"],
        }

    # Try without trailing letter (e.g., "294C" → "294")
    import re
    m = re.match(r'^(\d+)[A-Z]$', normalized)
    if m and m.group(1) in IPC_SECTIONS:
        info = IPC_SECTIONS[m.group(1)]
        return {
            "section": normalized,
            "en": info["en"] + f" (Section {normalized})",
            "ta": info["ta"] + f" (பிரிவு {normalized})",
            "severity": info["severity"],
        }

    # Unknown section
    return {
        "section": normalized,
        "en": f"IPC Section {normalized}",
        "ta": f"இந்திய தண்டனைச் சட்டம் பிரிவு {normalized}",
        "severity": "moderate",
    }


def parse_criminal_details(criminal_details_str: str) -> list:
    """
    Parse a MyNeta criminal_details string into structured case data.

    Input:  "147, 148, 294B, 341, 324, 506(II); 341, 336, 290, 143, 188"
    Output: [
        {
            "case_number": 1,
            "sections": [
                {"section": "147", "en": "Punishment for rioting", "ta": "கலவரத்திற்கு தண்டனை", "severity": "serious"},
                ...
            ],
            "summary_en": "Rioting with deadly weapon, obscene language, wrongful restraint, causing hurt, criminal intimidation",
            "summary_ta": "ஆயுதத்துடன் கலவரம், கெட்ட வார்த்தைகள், தவறான தடுப்பு, காயம், மிரட்டல்",
            "max_severity": "serious"
        },
        ...
    ]
    """
    if not criminal_details_str or not criminal_details_str.strip():
        return []

    cases = []
    severity_rank = {"grave": 4, "serious": 3, "moderate": 2, "minor": 1}

    for i, case_str in enumerate(criminal_details_str.split(';'), 1):
        case_str = case_str.strip()
        if not case_str:
            continue

        sections = []
        max_sev = "minor"
        summaries_en = []
        summaries_ta = []

        for sec_raw in case_str.split(','):
            sec_raw = sec_raw.strip()
            if not sec_raw:
                continue
            info = lookup_section(sec_raw)
            sections.append(info)

            if severity_rank.get(info["severity"], 0) > severity_rank.get(max_sev, 0):
                max_sev = info["severity"]

            # Build short summary (avoid duplicates)
            # Use a shorter description for summary
            short_en = info["en"].split(" — ")[0].split(" (Section")[0]
            short_ta = info["ta"].split(" — ")[0].split(" (பிரிவு")[0]
            if short_en not in summaries_en:
                summaries_en.append(short_en)
            if short_ta not in summaries_ta:
                summaries_ta.append(short_ta)

        cases.append({
            "case_number": i,
            "sections": sections,
            "summary_en": ", ".join(summaries_en),
            "summary_ta": ", ".join(summaries_ta),
            "max_severity": max_sev,
        })

    return cases


# ── Quick test ──────────────────────────────────────────────────────
if __name__ == "__main__":
    test = "147, 148, 294B, 341, 324, 506(II); 341, 336, 290, 143, 188"
    print(f"Input: {test}\n")
    for case in parse_criminal_details(test):
        print(f"Case {case['case_number']} [{case['max_severity'].upper()}]:")
        print(f"  EN: {case['summary_en']}")
        print(f"  TA: {case['summary_ta']}")
        for s in case['sections']:
            print(f"    § {s['section']:8s} → {s['en']}")
        print()
