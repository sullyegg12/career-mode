/* =====================================================================
   CAREER MODE — app.js
   A fully client-side, localStorage-backed multi-sport career simulator.
   No backend. No frameworks. Built for GitHub Pages + homescreen install.
   ===================================================================== */
'use strict';

/* ----------------------------------------------------------------------
   0. CORE UTILITIES
   ---------------------------------------------------------------------- */
const STORAGE_KEY = 'careerMode.save.v1';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function pickN(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function weightedRandom(weightFn, items) {
  const total = items.reduce((s, it) => s + weightFn(it), 0);
  let r = Math.random() * total;
  for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
  return items[items.length - 1];
}
// roughly-normal random in [0,1] (sum of uniforms)
function rngNormal01() { return (Math.random() + Math.random() + Math.random()) / 3; }
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function fmtNum(n) { return n.toLocaleString('en-US'); }
function fmtMoney(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function inToFeet(inches) {
  const ft = Math.floor(inches / 12), inch = inches % 12;
  return `${ft}'${inch}"`;
}
function ageFromBirthday(birthdayISO, refYear) {
  const b = new Date(birthdayISO);
  return refYear - b.getFullYear();
}
function monthDay(birthdayISO) {
  const b = new Date(birthdayISO + 'T00:00:00');
  return b.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/* ----------------------------------------------------------------------
   1. NAME / WORLD-BUILDING POOLS  (all fictional — no real leagues/teams)
   ---------------------------------------------------------------------- */
const CITY_NAMES = ["Waukesha","Ironview","Brookhaven","Crestwood","Fairview","Lakeside","Summit Ridge",
  "Riverside","Harborview","Stonegate","Maple Ridge","Silver Creek","Granite Falls","Cedar Bluff","Northgate",
  "Eastport","Westfield","Highland Park","Bayshore","Millbrook","Pine Hollow","Redstone","Clearwater","Oakhurst",
  "Sunridge","Copper Hill","Elmwood","Foxborough","Greystone","Hartwell","Stillwater","Ashford","Brightwood",
  "Dunmore","Kingsford","Ravenwood","Thornfield","Wexford","Larkspur","Mossbridge"];
const MASCOTS = ["Wolves","Hawks","Titans","Comets","Raptors","Miners","Mariners","Sentinels","Knights","Outlaws",
  "Vipers","Bison","Falcons","Thunder","Storm","Rebels","Pioneers","Wildcats","Rangers","Crushers","Marauders",
  "Foxes","Sharks","Stallions","Cyclones","Grizzlies","Phantoms","Lancers","Royals","Vultures","Express",
  "Ironclads","Voyagers","Blaze","Anchors","Talons"];
const COLLEGE_SUFFIX = ["State University","University","Tech","A&M","Polytechnic","College","Christian University"];
const CONFERENCE_NAMES = ["Atlantic Conference","Pacific Conference","Heartland Conference","Mountain Conference",
  "Coastal Conference","Big Lakes Conference","Frontier Conference","Metro Conference"];
const DIVISION_NAMES = ["North", "South", "East", "West"];
const STATES = ["California","Texas","Florida","New York","Ohio","Georgia","Illinois","Arizona","Wisconsin",
  "Colorado","Oregon","Tennessee","North Carolina","Pennsylvania","Michigan","Indiana","Minnesota","Missouri",
  "Alabama","Louisiana","Kentucky","Washington","Virginia","South Carolina","Oklahoma","Utah","Nevada"];
const FIRST_NAMES_M = ["James","Michael","Marcus","David","Chris","Andre","Jordan","Tyler","Brandon","Justin",
  "Anthony","Kevin","Derek","Malik","Trevor","Xavier","Cole","Wyatt","Isaiah","Jalen","Caleb","Dominic","Eli",
  "Gabriel","Hunter","Ian","Jaxon","Kai","Lucas","Mason","Nolan","Owen","Pierce","Quincy","Riley","Sawyer",
  "Theo","Victor","Wesley","Zane"];
const FIRST_NAMES_F = ["Aaliyah","Brianna","Camila","Destiny","Elena","Faith","Gabrielle","Hailey","Imani",
  "Jasmine","Kayla","Leah","Maya","Naomi","Olivia","Paige","Quinn","Reagan","Sienna","Talia","Uma","Victoria",
  "Willow","Ximena","Yara","Zoe","Alexis","Bria","Chloe","Diana"];
const LAST_NAMES = ["Carter","Bennett","Hayes","Reed","Coleman","Brooks","Foster","Sanders","Powell","Hunt",
  "Sawyer","Cross","Mercer","Lowe","Stone","Vance","Holt","Pratt","Beck","Ward","Drake","Nash","Quinn","Rhodes",
  "Sloan","Tate","Voss","Wren","Yates","Briggs","Calhoun","Dunbar","Ellison","Frost","Gentry","Hargrove",
  "Iverson","Jennings","Kessler","Lockwood","Monroe","Norwood","Osborn","Pemberton","Ridley","Sterling",
  "Thorne","Underwood","Vasquez","Whitfield"];
const NATIONALITY_HOMETOWNS = ["Toronto, ON","London, England","Sydney, Australia","Berlin, Germany",
  "Lagos, Nigeria","Seoul, South Korea","Mexico City, Mexico","Sao Paulo, Brazil","Manila, Philippines",
  "Kingston, Jamaica"];

function randomFullName(gender) {
  const first = gender === 'female' ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  return `${first} ${pick(LAST_NAMES)}`;
}
function randomHometown() {
  if (Math.random() < 0.12) return pick(NATIONALITY_HOMETOWNS);
  return `${pick(CITY_NAMES)}, ${pick(STATES)}`;
}
function randomBirthday(minAge, maxAge, refYear) {
  const age = randInt(minAge, maxAge);
  const year = refYear - age;
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function uniqueTeamNames(count) {
  const cities = pickN(CITY_NAMES, count);
  const mascots = pickN(MASCOTS, count);
  return cities.map((c, i) => ({ city: c, mascot: mascots[i], name: `${c} ${mascots[i]}` }));
}
function randomCollegeName() {
  return `${pick(CITY_NAMES)} ${pick(COLLEGE_SUFFIX)}`;
}

/* ----------------------------------------------------------------------
   2. SPORT CONFIGURATION
   Each sport defines: label/icon, whether positions exist, position list,
   6 attributes per position (uniform UI), league shape, physical baselines.
   ---------------------------------------------------------------------- */
const SPORTS = ['football', 'basketball', 'baseball', 'bowling', 'golf'];

const SPORT_META = {
  football:  { label: 'Football',   icon: '🏈', accent: '#3FA34D', accentSoft: 'rgba(63,163,77,.16)',
               leagueName: 'Gridiron Pro League', leagueAbbr: 'GPL', draftLabel: 'GPL Draft',
               proTermPlural: 'pro teams', unit: 'games' },
  basketball:{ label: 'Basketball', icon: '🏀', accent: '#E2832C', accentSoft: 'rgba(226,131,44,.16)',
               leagueName: 'Hardwood Pro League', leagueAbbr: 'HPL', draftLabel: 'HPL Draft',
               proTermPlural: 'pro teams', unit: 'games' },
  baseball:  { label: 'Baseball',   icon: '⚾', accent: '#C0503D', accentSoft: 'rgba(192,80,61,.16)',
               leagueName: 'Diamond Pro League', leagueAbbr: 'DPL', draftLabel: 'DPL Draft',
               proTermPlural: 'pro teams', unit: 'games' },
  bowling:   { label: 'Bowling',    icon: '🎳', accent: '#3E8FE8', accentSoft: 'rgba(62,143,232,.16)',
               leagueName: 'Pro Bowling Circuit', leagueAbbr: 'PBC', draftLabel: null,
               proTermPlural: 'tour stops', unit: 'tournaments' },
  golf:      { label: 'Golf',       icon: '⛳', accent: '#1f8a5f', accentSoft: 'rgba(31,138,95,.16)',
               leagueName: 'Pro Golf Circuit', leagueAbbr: 'PGC', draftLabel: null,
               proTermPlural: 'tour stops', unit: 'tournaments' },
};

const HAS_POSITIONS = { football: true, basketball: true, baseball: true, bowling: false, golf: false };
const HAS_TRADES = { football: true, basketball: true, baseball: true, bowling: false, golf: false };
const HAS_MINORS = { baseball: true };

// position -> { label, group, attrs[6], heightIn, weightLb }  (height/weight = baseline for build calc)
const POSITIONS = {
  football: {
    QB: { label: 'Quarterback', group: 'passer', attrs: ['Arm Power','Accuracy','Awareness','Speed','Agility','Strength'], h: 74, w: 220 },
    RB: { label: 'Running Back', group: 'rusher', attrs: ['Speed','Agility','Power','Vision','Hands','Stamina'], h: 70, w: 210 },
    WR: { label: 'Wide Receiver', group: 'receiver', attrs: ['Speed','Route Running','Hands','Agility','Jumping','Strength'], h: 72, w: 195 },
    TE: { label: 'Tight End', group: 'receiver', attrs: ['Hands','Route Running','Blocking','Strength','Speed','Awareness'], h: 76, w: 250 },
    OL: { label: 'Offensive Line', group: 'oline', attrs: ['Run Blocking','Pass Blocking','Strength','Awareness','Agility','Stamina'], h: 77, w: 310 },
    DL: { label: 'Defensive Line', group: 'dline', attrs: ['Pass Rush','Run Defense','Strength','Speed','Tackling','Awareness'], h: 75, w: 290 },
    LB: { label: 'Linebacker', group: 'front7', attrs: ['Tackling','Coverage','Speed','Strength','Awareness','Pursuit'], h: 73, w: 240 },
    CB: { label: 'Cornerback', group: 'secondary', attrs: ['Coverage','Speed','Agility','Tackling','Awareness','Ball Skills'], h: 71, w: 190 },
    S:  { label: 'Safety', group: 'secondary', attrs: ['Coverage','Tackling','Speed','Awareness','Hit Power','Range'], h: 72, w: 205 },
    K:  { label: 'Kicker', group: 'kicker', attrs: ['Kick Power','Kick Accuracy','Awareness','Consistency','Clutch','Stamina'], h: 71, w: 200 },
  },
  basketball: {
    PG: { label: 'Point Guard', group: 'guard', attrs: ['Ball Handling','Passing','Three Point','Speed','Perimeter Defense','Vision'], h: 74, w: 180 },
    SG: { label: 'Shooting Guard', group: 'guard', attrs: ['Three Point','Mid Range','Finishing','Speed','Perimeter Defense','Ball Handling'], h: 77, w: 195 },
    SF: { label: 'Small Forward', group: 'wing', attrs: ['Three Point','Finishing','Athleticism','Perimeter Defense','Rebounding','Ball Handling'], h: 79, w: 215 },
    PF: { label: 'Power Forward', group: 'big', attrs: ['Post Scoring','Rebounding','Mid Range','Strength','Post Defense','Athleticism'], h: 81, w: 235 },
    C:  { label: 'Center', group: 'big', attrs: ['Post Scoring','Rebounding','Post Defense','Shot Blocking','Strength','Finishing'], h: 83, w: 250 },
  },
  baseball: {
    SP: { label: 'Starting Pitcher', group: 'pitcher', attrs: ['Velocity','Control','Movement','Stamina','Mental Game','Fielding'], h: 74, w: 210 },
    RP: { label: 'Relief Pitcher', group: 'pitcher', attrs: ['Velocity','Control','Movement','Composure','Mental Game','Fielding'], h: 74, w: 210 },
    C:  { label: 'Catcher', group: 'hitter', attrs: ['Contact','Power','Plate Discipline','Arm Strength','Blocking','Speed'], h: 72, w: 205 },
    '1B': { label: 'First Base', group: 'hitter', attrs: ['Contact','Power','Plate Discipline','Fielding','Speed','Arm Strength'], h: 74, w: 210 },
    '2B': { label: 'Second Base', group: 'hitter', attrs: ['Contact','Power','Speed','Fielding','Arm Strength','Plate Discipline'], h: 71, w: 185 },
    '3B': { label: 'Third Base', group: 'hitter', attrs: ['Contact','Power','Fielding','Arm Strength','Speed','Plate Discipline'], h: 73, w: 200 },
    SS: { label: 'Shortstop', group: 'hitter', attrs: ['Contact','Fielding','Arm Strength','Speed','Power','Plate Discipline'], h: 71, w: 185 },
    OF: { label: 'Outfield', group: 'hitter', attrs: ['Contact','Power','Speed','Fielding','Arm Strength','Plate Discipline'], h: 73, w: 195 },
    DH: { label: 'Designated Hitter', group: 'hitter', attrs: ['Contact','Power','Plate Discipline','Speed','Mental Game','Consistency'], h: 74, w: 215 },
  },
  bowling: { GEN: { label: 'Bowler', group: 'bowler', attrs: ['Accuracy','Power','Spin Control','Spare Conversion','Mental Game','Consistency'], h: 70, w: 180 } },
  golf:    { GEN: { label: 'Golfer', group: 'golfer', attrs: ['Driving Power','Driving Accuracy','Approach Play','Short Game','Putting','Mental Game'], h: 71, w: 175 } },
};

function positionList(sport) { return Object.keys(POSITIONS[sport]); }
function posInfo(sport, posKey) { return POSITIONS[sport][posKey] || POSITIONS[sport]['GEN']; }
function roleAttrs(sport, posKey) { return posInfo(sport, posKey).attrs; }

// Which attribute represents "power" and "speed" for build-bonus purposes
const POWER_ATTR_HINTS = ['Power','Strength','Run Blocking','Post Scoring','Velocity','Hit Power','Kick Power','Driving Power'];
const SPEED_ATTR_HINTS = ['Speed','Agility','Quickness','Athleticism'];
function findHintAttr(attrs, hints) {
  for (const h of hints) if (attrs.includes(h)) return h;
  return null;
}

// League shape per sport: team count, conferences, divisions/conf, season length multiplier
const LEAGUE_SHAPE = {
  football:  { teams: 8,  conferences: 2, divisions: 2, roundsEachOpponent: 2, playoffTeams: 4 },
  basketball:{ teams: 12, conferences: 2, divisions: 2, roundsEachOpponent: 2, playoffTeams: 8 },
  baseball:  { teams: 10, conferences: 2, divisions: 2, roundsEachOpponent: 2, playoffTeams: 6 },
};
const MINORS_SHAPE = { teams: 10, gamesToCallUpEligible: 5 }; // baseball single-A pool, callup check starts after N games

// Tour shape (bowling / golf)
const TOUR_SHAPE = {
  bowling: { eventsPerSeason: 14, fieldSize: 80 },
  golf:    { eventsPerSeason: 16, fieldSize: 90 },
};

/* ----------------------------------------------------------------------
   3. STATE / PERSISTENCE
   ---------------------------------------------------------------------- */
function defaultState() {
  const careers = {};
  SPORTS.forEach(s => careers[s] = []);
  return { version: 1, careers, settings: { lastSport: null } };
}
let STATE = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.careers) return defaultState();
    SPORTS.forEach(s => { if (!parsed.careers[s]) parsed.careers[s] = []; });
    return parsed;
  } catch (e) {
    console.warn('Save data unreadable, starting fresh.', e);
    return defaultState();
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.error('Could not save progress', e);
    toast('Could not save — your browser storage may be full.', 'error');
  }
}
function getCareers(sport) { return STATE.careers[sport]; }
function getCareer(sport, id) { return STATE.careers[sport].find(c => c.id === id); }
function deleteCareer(sport, id) {
  STATE.careers[sport] = STATE.careers[sport].filter(c => c.id !== id);
  saveState();
}

/* ----------------------------------------------------------------------
   4. ATTRIBUTES / OVERALL / PROGRESSION ENGINE
   ---------------------------------------------------------------------- */
const START_OVERALL_TARGET = 65;
const ATTR_MIN = 25, ATTR_MAX = 99;

function generateStartingAttributes(sport, posKey, heightIn, weightLb) {
  const attrs = roleAttrs(sport, posKey);
  const base = {};
  // distribute values that average to START_OVERALL_TARGET
  let raw = attrs.map(() => randInt(58, 68));
  const avg = raw.reduce((a, b) => a + b, 0) / raw.length;
  const diff = START_OVERALL_TARGET - avg;
  raw = raw.map(v => clamp(Math.round(v + diff), 45, 75));
  attrs.forEach((a, i) => base[a] = raw[i]);

  // build bonus from height/weight relative to position baseline
  const info = posInfo(sport, posKey);
  const heightDelta = (heightIn - info.h) / info.h;
  const weightDelta = (weightLb - info.w) / info.w;
  const powerAttr = findHintAttr(attrs, POWER_ATTR_HINTS);
  const speedAttr = findHintAttr(attrs, SPEED_ATTR_HINTS);
  if (powerAttr) base[powerAttr] = clamp(base[powerAttr] + clamp(Math.round(weightDelta * 22), -9, 9), ATTR_MIN, ATTR_MAX);
  if (speedAttr) base[speedAttr] = clamp(base[speedAttr] + clamp(Math.round(-weightDelta * 14 - heightDelta * 6), -9, 9), ATTR_MIN, ATTR_MAX);

  return base;
}
function computeOverall(attributes) {
  const vals = Object.values(attributes);
  return clamp(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), 40, 99);
}
function upgradeCost(currentVal) {
  if (currentVal >= 95) return 4;
  if (currentVal >= 90) return 3;
  if (currentVal >= 80) return 2;
  return 1;
}
function canUpgrade(career, attrName) {
  const val = career.attributes[attrName];
  if (val >= ATTR_MAX) return false;
  return career.skillPoints >= upgradeCost(val);
}
function upgradeAttribute(career, attrName) {
  if (!canUpgrade(career, attrName)) return false;
  const cost = upgradeCost(career.attributes[attrName]);
  career.skillPoints -= cost;
  career.attributes[attrName] = clamp(career.attributes[attrName] + 1, ATTR_MIN, ATTR_MAX);
  career.overall = computeOverall(career.attributes);
  saveState();
  return true;
}
function performanceScore(career) {
  // 0-100 "how well did they play" — driven by overall + randomness (regression to the mean for unproven players)
  const base = career.overall;
  const noise = (rngNormal01() - 0.5) * 60; // +/-30ish
  return clamp(Math.round(base * 0.6 + 40 * rngNormal01() * 0.6 + noise * 0.5 + base * 0.1), 5, 100);
}
function skillPointsEarned(stage, perf) {
  const stageBase = { highschool: 1, college: 2, minors: 2, pro: 3, tour: 3 }[stage] ?? 2;
  return stageBase + Math.round((perf / 100) * 3);
}

/* ----------------------------------------------------------------------
   5. AVATAR (stylized SVG bust — fully generated, no external assets)
   ---------------------------------------------------------------------- */
const SKIN_TONES = ['#3A2618', '#5C3A21', '#8A5A36', '#C68B59', '#E0AC76', '#F2D2A9'];
const HAIR_COLORS = ['#0B0B0B', '#2C1B10', '#5A3825', '#8C6239', '#C9A05C', '#E8E0D0', '#B23A3A', '#3E6FB0'];
const HAIR_STYLES = ['bald', 'buzz', 'short', 'medium', 'curly', 'long', 'mohawk', 'braids'];

function hairPath(style, color) {
  switch (style) {
    case 'bald': return '';
    case 'buzz': return `<path d="M62 86a48 48 0 0 1 96 0v6H62z" fill="${color}"/>`;
    case 'short': return `<path d="M58 92a52 52 0 0 1 104 0v14h-14v-10c0-6-4-10-10-10H82c-6 0-10 4-10 10v10H58z" fill="${color}"/>`;
    case 'medium': return `<path d="M54 100a56 56 0 0 1 112 0v26h-16v-22c0-8-6-14-14-14H84c-8 0-14 6-14 14v22H54z" fill="${color}"/>`;
    case 'curly': return `<g fill="${color}">
        <circle cx="68" cy="78" r="14"/><circle cx="86" cy="68" r="16"/><circle cx="106" cy="64" r="17"/>
        <circle cx="126" cy="68" r="16"/><circle cx="142" cy="80" r="14"/><circle cx="110" cy="92" r="18"/>
      </g>`;
    case 'long': return `<path d="M54 96a56 56 0 0 1 112 0v54h-15v-40c0-7-5-12-11-12h-2v52h-14v-52H96v52H82v-52h-2c-6 0-11 5-11 12v40H54z" fill="${color}"/>`;
    case 'mohawk': return `<path d="M96 36c6 0 10 6 10 16v44c0 6-4 10-10 10s-10-4-10-10V52c0-10 4-16 10-16z" fill="${color}"/>
        <path d="M58 96a52 52 0 0 1 14-36c-4 10-6 22-6 36v14H58z" fill="${color}" opacity=".55"/>
        <path d="M154 96a52 52 0 0 0-14-36c4 10 6 22 6 36v14h8z" fill="${color}" opacity=".55"/>`;
    case 'braids': return `<g fill="${color}">
        <path d="M58 94a52 52 0 0 1 104 0v8H58z"/>
        <rect x="56" y="100" width="9" height="46" rx="4"/><rect x="70" y="104" width="9" height="50" rx="4"/>
        <rect x="143" y="100" width="9" height="46" rx="4"/><rect x="129" y="104" width="9" height="50" rx="4"/>
      </g>`;
    default: return '';
  }
}
function buildAvatarSVG(opts) {
    const { skinTone, hairStyle, hairColor, jerseyColor, number, heightIn, weightLb } = opts; // [cite: 575, 576]
    const bmi = weightLb / (heightIn * heightIn) * 703; // [cite: 577]
    const frameScale = clamp(0.86 + (bmi - 21) / 38, 0.84, 1.22).toFixed(3); // [cite: 578]
    const numStr = (number === "" || number === null || number === undefined) ? '' : String(number); // [cite: 579]

    return `
    <svg viewBox="0 0 208 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="player avatar" class="avatar-canvas">
        <defs>
            <clipPath id="frameClip"><rect x="0" y="0" width="208" height="220" rx="20"/></clipPath>
        </defs>
        <g clip-path="url(#frameClip)">
            <rect width="208" height="220" fill="#171B21"/>
            
            <g transform="translate(104 222) scale(${frameScale} 1) translate(-104 -222)">
                <path d="M40 220c0-34 10-58 26-70 8 14 22 22 38 22s30-8 38-22c16 12 26 36 26 70z" fill="${jerseyColor}"/>
                <path d="M40 220c0-34 10-58 26-70 3 5 6.5 9.5 10.5 13-10 16-16 36-16 57z" fill="#000" opacity=".12"/>
                <text x="104" y="206" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="30" fill="#fff" opacity=".92">${escapeHtmlSvg(numStr)}</text>
                
                <rect x="92" y="98" width="24" height="34" rx="8" fill="${skinTone}"/>
                
                <g class="avatar-layer-neck-shadow">
                    <rect x="92" y="98" width="24" height="14" fill="#000000" opacity="0.2"/>
                </g>
                
                <circle cx="104" cy="78" r="40" fill="${skinTone}"/>
                
                ${hairPath(hairStyle, hairColor)}
            </g>
        </g>
    </svg>
    `;
}
function escapeHtmlSvg(s) { return String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

/* ----------------------------------------------------------------------
   6. STAT FIELD DEFINITIONS (for tables) + zeroed totals
   ---------------------------------------------------------------------- */
const FOOTBALL_STAT_FIELDS = {
  passer:   [['gp','GP'],['completions','CMP'],['attempts','ATT'],['passYds','YDS'],['passTD','TD'],['ints','INT'],['rushYds','RUSH YDS']],
  rusher:   [['gp','GP'],['carries','ATT'],['rushYds','YDS'],['rushTD','TD'],['rec','REC'],['recYds','REC YDS']],
  receiver: [['gp','GP'],['targets','TGT'],['rec','REC'],['recYds','YDS'],['recTD','TD']],
  oline:    [['gp','GP'],['pancakes','PANCAKES'],['sacksAllowed','SACKS ALLOWED']],
  dline:    [['gp','GP'],['tackles','TKL'],['sacks','SACK'],['tfl','TFL']],
  front7:   [['gp','GP'],['tackles','TKL'],['sacks','SACK'],['ints','INT']],
  secondary:[['gp','GP'],['tackles','TKL'],['ints','INT'],['passDef','PD']],
  kicker:   [['gp','GP'],['fgm','FGM'],['fga','FGA'],['xpm','XPM'],['points','PTS']],
};
const BASKETBALL_STAT_FIELDS = [['gp','GP'],['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['fgm','FGM'],['fga','FGA'],['tpm','3PM']];
const BASEBALL_STAT_FIELDS = {
  hitter:  [['gp','G'],['ab','AB'],['h','H'],['hr','HR'],['rbi','RBI'],['r','R'],['sb','SB'],['bb','BB'],['so','SO']],
  pitcher: [['gp','G'],['ip','IP'],['er','ER'],['h','H'],['bb','BB'],['k','K'],['w','W'],['l','L'],['sv','SV']],
};
const BOWLING_STAT_FIELDS = [['eventsPlayed','EVT'],['games','GM'],['pinfall','PINS'],['highGame','HI GM'],['titles','TITLES'],['top5','TOP 5'],['cashes','CASHES'],['earnings','EARNINGS'],['points','TOUR PTS']];
const GOLF_STAT_FIELDS = [['eventsPlayed','EVT'],['cutsMade','CUTS'],['wins','W'],['top10','T10'],['roundsPlayed','RNDS'],['strokesTotal','STRK'],['earnings','EARNINGS'],['points','TOUR PTS']];

function statGroupFor(sport, posKey) {
  if (sport === 'football') return posInfo(sport, posKey).group;
  if (sport === 'baseball') return ['SP', 'RP'].includes(posKey) ? 'pitcher' : 'hitter';
  return null;
}
function statFieldsFor(sport, posKey) {
  if (sport === 'football') return FOOTBALL_STAT_FIELDS[statGroupFor(sport, posKey)];
  if (sport === 'basketball') return BASKETBALL_STAT_FIELDS;
  if (sport === 'baseball') return BASEBALL_STAT_FIELDS[statGroupFor(sport, posKey)];
  if (sport === 'bowling') return BOWLING_STAT_FIELDS;
  if (sport === 'golf') return GOLF_STAT_FIELDS;
}
function newStatTotals(sport, posKey) {
  const fields = statFieldsFor(sport, posKey);
  const t = {};
  fields.forEach(([k]) => t[k] = 0);
  return t;
}
function addStatTotals(totals, line) {
  Object.keys(line).forEach(k => { totals[k] = (totals[k] || 0) + line[k]; });
}

/* ----------------------------------------------------------------------
   7. GAME STATLINE GENERATION
   ---------------------------------------------------------------------- */
function r(min, max) { return Math.round(randFloat(min, max)); }

function generateFootballLine(posKey, perf) {
  const group = posInfo('football', posKey).group;
  const p = perf / 100;
  switch (group) {
    case 'passer': {
      const completions = clamp(r(10, 18) + Math.round(p * 12), 4, 40);
      const attempts = completions + r(4, 10);
      const passYds = clamp(Math.round(completions * (6 + p * 6)) + r(-15, 25), 0, 480);
      const passTD = p > 0.82 ? r(2, 4) : p > 0.6 ? r(1, 3) : r(0, 1);
      const ints = p < 0.35 ? r(1, 3) : p < 0.65 ? (Math.random() < 0.35 ? 1 : 0) : 0;
      const rushYds = clamp(r(-3, 10) + Math.round(p * 15), -5, 90);
      return { gp: 1, completions, attempts, passYds, passTD, ints, rushYds };
    }
    case 'rusher': {
      const carries = clamp(r(8, 16) + Math.round(p * 6), 3, 32);
      const rushYds = clamp(Math.round(carries * (3 + p * 5.5)) + r(-12, 20), -5, 260);
      const rushTD = p > 0.82 ? r(1, 3) : p > 0.55 ? (Math.random() < 0.5 ? 1 : 0) : 0;
      const rec = r(0, 4);
      const recYds = rec * r(4, 12);
      return { gp: 1, carries, rushYds, rushTD, rec, recYds };
    }
    case 'receiver': {
      const targets = clamp(r(3, 8) + Math.round(p * 6), 1, 18);
      const catchRate = clamp(0.45 + p * 0.4, 0.3, 0.92);
      const rec = clamp(Math.round(targets * catchRate), 0, targets);
      const recYds = clamp(rec * r(7, 16) + r(-10, 20), 0, 230);
      const recTD = p > 0.85 ? r(1, 2) : (p > 0.6 && Math.random() < 0.35) ? 1 : 0;
      return { gp: 1, targets, rec, recYds, recTD };
    }
    case 'oline': {
      const pancakes = clamp(r(1, 5) + Math.round(p * 4), 0, 12);
      const sacksAllowed = p < 0.35 ? r(1, 2) : (Math.random() < 0.12 ? 1 : 0);
      return { gp: 1, pancakes, sacksAllowed };
    }
    case 'dline': {
      const tackles = clamp(r(1, 5) + Math.round(p * 4), 0, 12);
      const sacks = p > 0.82 ? (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0) : (p > 0.55 && Math.random() < 0.3 ? 1 : 0);
      const tfl = r(0, 3);
      return { gp: 1, tackles, sacks, tfl };
    }
    case 'front7': {
      const tackles = clamp(r(4, 9) + Math.round(p * 4), 2, 18);
      const sacks = (p > 0.8 && Math.random() < 0.45) ? 1 : 0;
      const ints = (p > 0.85 && Math.random() < 0.18) ? 1 : 0;
      return { gp: 1, tackles, sacks, ints };
    }
    case 'secondary': {
      const tackles = clamp(r(2, 6) + Math.round(p * 3), 0, 14);
      const ints = (p > 0.82 && Math.random() < 0.22) ? 1 : 0;
      const passDef = clamp(r(0, 2) + Math.round(p * 2), 0, 6);
      return { gp: 1, tackles, ints, passDef };
    }
    case 'kicker': {
      const fga = r(1, 4);
      const successProb = clamp(0.55 + p * 0.4, 0.4, 0.97);
      let fgm = 0; for (let i = 0; i < fga; i++) if (Math.random() < successProb) fgm++;
      const xpa = r(1, 4);
      let xpm = 0; for (let i = 0; i < xpa; i++) if (Math.random() < 0.94) xpm++;
      return { gp: 1, fgm, fga, xpm, points: fgm * 3 + xpm };
    }
  }
}
function generateBasketballLine(posKey, perf) {
  const group = posInfo('basketball', posKey).group;
  const p = perf / 100;
  const isBig = group === 'big';
  const isGuard = group === 'guard';
  const pts = clamp(r(6, 14) + Math.round(p * 22), 0, 62);
  const reb = clamp(r(1, isBig ? 6 : 2) + Math.round(p * (isBig ? 10 : 5)), 0, 28);
  const ast = clamp(r(0, isGuard ? 5 : 2) + Math.round(p * (isGuard ? 8 : 4)), 0, 18);
  const stl = clamp(r(0, 2) + (Math.random() < p * 0.6 ? 1 : 0), 0, 6);
  const blk = clamp((isBig ? r(0, 2) : 0) + (Math.random() < p * 0.3 ? 1 : 0), 0, 8);
  const fga = clamp(r(6, 12) + Math.round(p * 8), 1, 32);
  const fgm = clamp(Math.round(fga * clamp(0.36 + p * 0.32, 0.28, 0.68)), 0, fga);
  const tpm = group === 'big' ? (Math.random() < 0.1 ? 1 : 0) : clamp(r(0, 2) + Math.round(p * 3), 0, 9);
  return { gp: 1, pts, reb, ast, stl, blk, fgm, fga, tpm };
}
function generateBaseballLine(posKey, perf) {
  const isPitcher = ['SP', 'RP'].includes(posKey);
  const p = perf / 100;
  if (isPitcher) {
    const isStarter = posKey === 'SP';
    const ip = isStarter ? roundToThirds(clamp(4.2 + p * 2.6 + randFloat(-0.6, 0.6), 2, 9)) : roundToThirds(clamp(0.7 + p * 1.2 + randFloat(-0.2, 0.4), 0.3, 3));
    const h = clamp(Math.round(ip * clamp(1.35 - p * 0.7, 0.4, 1.5)), 0, 12);
    const er = clamp(Math.round(ip * clamp(0.7 - p * 0.6, 0, 1.1) * randFloat(0.5, 1.4)), 0, 9);
    const bb = clamp(r(0, 3) + (p < 0.4 ? r(0, 2) : 0), 0, 8);
    const k = clamp(Math.round(ip * clamp(0.9 + p * 1.3, 0.5, 2.4)), 0, 16);
    const winChance = isStarter ? clamp(0.15 + p * 0.5, 0.05, 0.7) : clamp(0.05 + p * 0.15, 0, 0.25);
    const w = Math.random() < winChance ? 1 : 0;
    const l = (!w && p < 0.4 && Math.random() < 0.4) ? 1 : 0;
    const sv = (!isStarter && p > 0.78 && Math.random() < 0.3) ? 1 : 0;
    return { gp: 1, ip, h, er, bb, k, w, l, sv };
  } else {
    const ab = r(3, 5);
    const hitProb = clamp(0.22 + p * 0.32, 0.12, 0.55);
    let h = 0; for (let i = 0; i < ab; i++) if (Math.random() < hitProb) h++;
    const hr = (h > 0 && Math.random() < 0.08 + p * 0.12) ? 1 : 0;
    const rbi = clamp(h * (Math.random() < 0.4 ? 1 : 0) + hr * r(1, 2), 0, 6);
    const rr = clamp((h > 0 ? r(0, 1) : 0) + (Math.random() < p * 0.3 ? 1 : 0), 0, 4);
    const sb = (Math.random() < 0.08 + p * 0.05) ? 1 : 0;
    const bb = (Math.random() < 0.18) ? 1 : 0;
    const so = clamp(ab - h - (Math.random() < 0.5 ? 1 : 0), 0, ab);
    return { gp: 1, ab, h, hr, rbi, r: rr, sb, bb, so: Math.max(0, so) };
  }
}
function round1(n) { return Math.round(n * 10) / 10; }
function roundToThirds(n) { return Math.round(n * 3) / 3; }
function formatIP(n) {
  const whole = Math.floor(n + 1e-9);
  const outs = Math.round((n - whole) * 3);
  return `${whole}.${outs}`;
}

/* ---- Bowling / Golf single-event simulation ---- */
function simulateBowlingEvent(career) {
  const p = performanceScore(career) / 100;
  const games = 6;
  let pinfall = 0, highGame = 0;
  for (let i = 0; i < games; i++) {
    const score = clamp(Math.round(140 + p * 115 + randFloat(-22, 22)), 90, 300);
    pinfall += score; highGame = Math.max(highGame, score);
  }
  return { games, pinfall, highGame, avg: pinfall / games, perf: p };
}
function simulateGolfEvent(career) {
  const p = performanceScore(career) / 100;
  const par = 72;
  const roundScore = () => clamp(Math.round(par - p * 7 + randFloat(-4.5, 4.5)), 62, 88);
  const r1 = roundScore(), r2 = roundScore();
  const throughTwo = r1 + r2;
  const cutLine = par * 2 + 4; // +4 typical cut
  const madeCut = throughTwo <= cutLine || Math.random() < clamp(p - 0.3, 0, 0.9);
  let rounds = [r1, r2];
  if (madeCut) { rounds.push(roundScore()); rounds.push(roundScore()); }
  const strokesTotal = rounds.reduce((a, b) => a + b, 0);
  const relToPar = strokesTotal - rounds.length * par;
  return { rounds: rounds.length, strokesTotal, relToPar, madeCut, perf: p };
}

/* ----------------------------------------------------------------------
   8. TEAM LEAGUE ENGINE (football / basketball / baseball pro leagues)
   ---------------------------------------------------------------------- */
function generateLeague(sport) {
  const shape = LEAGUE_SHAPE[sport];
  const teamNames = uniqueTeamNames(shape.teams);
  const confNames = pickN(CONFERENCE_NAMES, shape.conferences);
  const teams = teamNames.map((tn, i) => {
    const confIdx = i % shape.conferences;
    const divIdx = Math.floor(i / shape.conferences) % shape.divisions;
    return {
      id: 'T' + i,
      name: tn.name, city: tn.city, mascot: tn.mascot,
      conference: confNames[confIdx],
      division: DIVISION_NAMES[divIdx],
      rating: randInt(68, 92),
      wins: 0, losses: 0, ties: 0,
      pf: 0, pa: 0, // points/runs for & against
      streak: 0,
    };
  });
  const schedule = buildRoundRobinSchedule(teams.map(t => t.id), shape.roundsEachOpponent);
  return { sport, teams, schedule, week: 0, season: 1, playoffTeams: shape.playoffTeams, complete: false, playoffResult: null };
}
// Circle-method round robin. Returns weeks: [{matchups:[{home,away}]}]
function buildRoundRobinSchedule(teamIds, rounds) {
  let ids = teamIds.slice();
  const bye = ids.length % 2 !== 0;
  if (bye) ids.push(null);
  const n = ids.length;
  const weeksPerRound = n - 1;
  const half = n / 2;
  const allWeeks = [];
  let arr = ids.slice();
  for (let rd = 0; rd < rounds; rd++) {
    let working = arr.slice();
    for (let w = 0; w < weeksPerRound; w++) {
      const matchups = [];
      for (let i = 0; i < half; i++) {
        const a = working[i], b = working[n - 1 - i];
        if (a !== null && b !== null) {
          const flip = (rd % 2 === 1);
          matchups.push(flip ? { home: b, away: a } : { home: a, away: b });
        }
      }
      allWeeks.push({ matchups, played: false });
      // rotate (keep first fixed)
      const fixed = working[0];
      const rest = working.slice(1);
      rest.unshift(rest.pop());
      working = [fixed, ...rest];
    }
    arr = working;
  }
  return allWeeks;
}
function teamById(league, id) { return league.teams.find(t => t.id === id); }

function homeFieldEdge() { return 2.2; }
function winProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, -(ratingA - ratingB) / 14));
}
// Generate a plausible final score for the sport given winner/loser & rating gap
function generateScore(sport, winnerRating, loserRating) {
  const gap = clamp((winnerRating - loserRating) / 4, 0, 10);
  if (sport === 'football') {
    const loserScore = clamp(r(6, 24) - Math.round(gap * 0.6), 0, 38);
    const winnerScore = clamp(loserScore + r(3, 17) + Math.round(gap), loserScore + 1, 52);
    return { winnerScore, loserScore };
  }
  if (sport === 'basketball') {
    const loserScore = clamp(r(88, 108) - Math.round(gap), 70, 118);
    const winnerScore = clamp(loserScore + r(2, 14) + Math.round(gap * 0.8), loserScore + 1, 134);
    return { winnerScore, loserScore };
  }
  // baseball
  const loserScore = clamp(r(0, 4), 0, 9);
  const winnerScore = clamp(loserScore + r(1, 5) + (gap > 4 ? 1 : 0), loserScore + 1, 13);
  return { winnerScore, loserScore };
}
function applyResult(league, sport, homeId, awayId, homeScore, awayScore) {
  const home = teamById(league, homeId), away = teamById(league, awayId);
  home.pf += homeScore; home.pa += awayScore;
  away.pf += awayScore; away.pa += homeScore;
  if (homeScore === awayScore) { home.ties++; away.ties++; home.streak = 0; away.streak = 0; }
  else if (homeScore > awayScore) { home.wins++; away.losses++; home.streak = home.streak > 0 ? home.streak + 1 : 1; away.streak = away.streak < 0 ? away.streak - 1 : -1; }
  else { away.wins++; home.losses++; away.streak = away.streak > 0 ? away.streak + 1 : 1; home.streak = home.streak < 0 ? home.streak - 1 : -1; }
}
function winPct(t) { const g = t.wins + t.losses + t.ties; return g === 0 ? 0 : (t.wins + t.ties * 0.5) / g; }
function standingsSorted(teams) {
  return teams.slice().sort((a, b) => winPct(b) - winPct(a) || (b.pf - b.pa) - (a.pf - a.pa));
}
function divisionStandings(league) {
  const groups = {};
  league.teams.forEach(t => {
    const key = t.conference + ' — ' + t.division;
    (groups[key] = groups[key] || []).push(t);
  });
  return Object.entries(groups).map(([key, teams]) => ({ key, teams: standingsSorted(teams) }));
}
function conferenceStandings(league) {
  const groups = {};
  league.teams.forEach(t => { (groups[t.conference] = groups[t.conference] || []).push(t); });
  return Object.entries(groups).map(([conf, teams]) => ({ conf, teams: standingsSorted(teams) }));
}
function playoffPicture(league) {
  const perConf = Math.ceil(league.playoffTeams / Object.keys(groupBy(league.teams, 'conference')).length);
  return conferenceStandings(league).map(({ conf, teams }) => ({
    conf,
    inPlayoffs: teams.slice(0, perConf),
    onBubble: teams.slice(perConf, perConf + 2),
  }));
}
function groupBy(arr, key) { const o = {}; arr.forEach(x => (o[x[key]] = o[x[key]] || []).push(x)); return o; }

// Simulate the next unplayed week: simulates ALL matchups (so the league feels alive),
// returns the user's own game result (if any) for narrative display.
function simulateLeagueWeek(league, sport, userTeamId, userCareer) {
  if (league.week >= league.schedule.length) return null;
  const weekObj = league.schedule[league.week];
  let userResult = null;
  weekObj.matchups.forEach(m => {
    const home = teamById(league, m.home), away = teamById(league, m.away);
    const involvesUser = m.home === userTeamId || m.away === userTeamId;
    let homeRating = home.rating, awayRating = away.rating;
    let perf = null;
    if (involvesUser) {
      perf = performanceScore(userCareer);
      const boost = (perf - 60) / 6; // user's individual performance nudges team rating that game
      if (m.home === userTeamId) homeRating += boost; else awayRating += boost;
    }
    const pHome = winProbability(homeRating + homeFieldEdge(), awayRating);
    const homeWins = Math.random() < pHome;
    const { winnerScore, loserScore } = generateScore(sport, homeWins ? homeRating : awayRating, homeWins ? awayRating : homeRating);
    const homeScore = homeWins ? winnerScore : loserScore;
    const awayScore = homeWins ? loserScore : winnerScore;
    applyResult(league, sport, m.home, m.away, homeScore, awayScore);
    m.played = true; m.homeScore = homeScore; m.awayScore = awayScore;
    if (involvesUser) {
      const isHome = m.home === userTeamId;
      const oppId = isHome ? m.away : m.home;
      const won = isHome ? homeScore > awayScore : awayScore > homeScore;
      const tied = homeScore === awayScore;
      userResult = {
        week: league.week, opponentId: oppId, isHome, perf,
        teamScore: isHome ? homeScore : awayScore, oppScore: isHome ? awayScore : homeScore,
        won, tied,
      };
    }
  });
  league.week++;
  if (league.week >= league.schedule.length) league.complete = true;
  return userResult;
}

/* ----------------------------------------------------------------------
   9. TOUR ENGINE (bowling / golf — individual tournament circuits)
   ---------------------------------------------------------------------- */
function generateRivals(sport) {
  const shape = TOUR_SHAPE[sport];
  const count = shape.fieldSize - 1;
  const names = new Set();
  const rivals = [];
  while (rivals.length < count) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const name = randomFullName(gender);
    if (names.has(name)) continue;
    names.add(name);
    rivals.push({ name, rating: clamp(Math.round(randNormal(70, 11)), 42, 97) });
  }
  return rivals;
}
function randNormal(mean, sd) { return mean + (rngNormal01() - 0.5) * 2 * sd * 1.7; }

function generateTourSchedule(sport) {
  const shape = TOUR_SHAPE[sport];
  const usedNames = new Set();
  const events = [];
  for (let i = 0; i < shape.eventsPerSeason; i++) {
    let city;
    do { city = pick(CITY_NAMES); } while (usedNames.has(city));
    usedNames.add(city);
    events.push({
      name: `${city} ${sport === 'bowling' ? 'Open' : 'Classic'}`,
      city, played: false, result: null,
    });
  }
  return events;
}
function purseForRank(rank, fieldSize, sport) {
  const top = sport === 'bowling' ? 60000 : 1800000;
  const scale = clamp(1 - (rank - 1) / (fieldSize * 0.9), 0.01, 1);
  return Math.round(top * Math.pow(scale, 2.1) / 100) * 100;
}
function pointsForRank(rank) { return clamp(Math.round(150 - rank * 1.6), 1, 150); }

// Simulate one tour event for the user; ranks them against a simulated field.
function simulateTourEvent(career) {
  const sport = career.sport;
  const shape = TOUR_SHAPE[sport];
  const field = career.tour.rivals.map(rv => ({ ref: rv, name: rv.name, rating: rv.rating }));
  let userScoreMetric, userLine, madeCut = true;
  if (sport === 'bowling') {
    const res = simulateBowlingEvent(career);
    userScoreMetric = res.pinfall;
    userLine = res;
    field.forEach(f => {
      let pins = 0;
      for (let i = 0; i < 6; i++) pins += clamp(Math.round(140 + (f.rating / 100) * 115 + randFloat(-22, 22)), 90, 300);
      f.metric = pins;
    });
  } else {
    const res = simulateGolfEvent(career);
    userScoreMetric = -res.relToPar; // higher is better
    userLine = res; madeCut = res.madeCut;
    field.forEach(f => {
      const par = 72;
      const rs = () => clamp(Math.round(par - (f.rating / 100) * 7 + randFloat(-4.5, 4.5)), 62, 88);
      const rounds = [rs(), rs(), rs(), rs()];
      f.metric = -(rounds.reduce((a, b) => a + b, 0) - rounds.length * par);
    });
  }
  field.push({ name: career.name, metric: userScoreMetric, isUser: true });
  field.sort((a, b) => b.metric - a.metric);
  // award season points to every rival in the field based on this event's finish, so
  // tour standings reflect real accumulated results rather than a static estimate
  field.forEach((f, i) => { if (!f.isUser) f.ref.seasonPoints = (f.ref.seasonPoints || 0) + pointsForRank(i + 1); });
  let place = field.findIndex(f => f.isUser) + 1;
  // ties
  const tiedAtSameMetric = field.filter(f => f.metric === userScoreMetric).length > 1;
  const earnings = madeCut ? purseForRank(place, field.length, sport) : Math.round(purseForRank(field.length - 5, field.length, sport) * 0.3);
  const points = madeCut ? pointsForRank(place) : 1;
  return { place, tied: tiedAtSameMetric, fieldSize: field.length, earnings, points, madeCut, line: userLine, leaderboard: field.slice(0, 10) };
}

/* ----------------------------------------------------------------------
   10. CAREER FACTORY
   ---------------------------------------------------------------------- */
function createCareer(sport, form) {
  const posKey = HAS_POSITIONS[sport] ? form.position : 'GEN';
  const attributes = generateStartingAttributes(sport, posKey, form.heightIn, form.weightLb);
  const hsCity = (form.hometown.split(',')[0] || form.hometown).trim();
  const career = {
    id: uid(), sport,
    name: form.name, number: form.number, gender: form.gender, hometown: form.hometown,
    heightIn: form.heightIn, weightLb: form.weightLb, birthday: form.birthday,
    position: HAS_POSITIONS[sport] ? form.position : null,
    appearance: form.appearance,
    createdAt: Date.now(), updatedAt: Date.now(),
    stage: 'highschool', season: 1, skillPoints: 0,
    attributes, overall: computeOverall(attributes),
    highSchool: { name: `${hsCity} High School`, gamesPlayed: 0, targetGames: 2, games: [] },
    college: null, draft: null, minors: null, proLeague: null, team: null, tour: null,
    seasonStats: newStatTotals(sport, posKey),
    careerStatsLog: [],
    gameLog: [],
    history: [{ text: `${form.name} steps onto the field for ${hsCity} High School, ready to begin a career.`, t: Date.now() }],
    trade: { lastRequestGameCount: -999 },
    seasonGameCount: 0,
  };
  return career;
}
function logHistory(career, text) { career.history.unshift({ text, t: Date.now() }); career.history = career.history.slice(0, 60); }
function logGame(career, entry) { career.gameLog.unshift(entry); career.gameLog = career.gameLog.slice(0, 80); }
function awardPoints(career, stage, perf) {
  const pts = skillPointsEarned(stage, perf);
  career.skillPoints += pts;
  return pts;
}
function genStatline(career, perf) {
  const sport = career.sport, pos = career.position || 'GEN';
  if (sport === 'football') return generateFootballLine(pos, perf);
  if (sport === 'basketball') return generateBasketballLine(pos, perf);
  if (sport === 'baseball') return generateBaseballLine(pos, perf);
}
function statlineSummary(sport, posKey, line) {
  const group = sport === 'football' ? posInfo('football', posKey).group : (sport === 'baseball' ? statGroupFor('baseball', posKey) : null);
  if (sport === 'football') {
    if (group === 'passer') return `${line.completions}/${line.attempts}, ${line.passYds} yds, ${line.passTD} TD, ${line.ints} INT`;
    if (group === 'rusher') return `${line.carries} car, ${line.rushYds} yds, ${line.rushTD} TD`;
    if (group === 'receiver') return `${line.rec} rec, ${line.recYds} yds, ${line.recTD} TD`;
    if (group === 'oline') return `${line.pancakes} pancakes, ${line.sacksAllowed} sacks allowed`;
    if (group === 'dline' || group === 'front7') return `${line.tackles} tkl, ${line.sacks} sack`;
    if (group === 'secondary') return `${line.tackles} tkl, ${line.ints} INT, ${line.passDef} PD`;
    if (group === 'kicker') return `${line.fgm}/${line.fga} FG, ${line.points} pts`;
  }
  if (sport === 'basketball') return `${line.pts} pts, ${line.reb} reb, ${line.ast} ast`;
  if (sport === 'baseball') {
    if (group === 'pitcher') return `${formatIP(line.ip)} IP, ${line.er} ER, ${line.k} K`;
    return `${line.h}-${line.ab}, ${line.hr} HR, ${line.rbi} RBI`;
  }
  return '';
}

/* ----------------------------------------------------------------------
   11. STAGE PROGRESSION ENGINE
   ---------------------------------------------------------------------- */
function simulateHighSchoolGame(career) {
  const perf = performanceScore(career);
  const opponent = `${pick(CITY_NAMES)} High School`;
  const won = Math.random() < clamp(0.4 + perf / 250, 0.25, 0.88);
  let line = null, summary = '';
  if (career.sport === 'bowling') { const res = simulateBowlingEvent(career); line = res; summary = `Avg ${res.avg.toFixed(1)}, high game ${res.highGame}`; }
  else if (career.sport === 'golf') { const res = simulateGolfEvent(career); line = res; summary = `${res.strokesTotal} strokes (${res.relToPar >= 0 ? '+' : ''}${res.relToPar})`; }
  else { line = genStatline(career, perf); addStatTotals(career.seasonStats, line); summary = statlineSummary(career.sport, career.position, line); }
  const entry = { type: 'highschool', label: `${career.highSchool.name} vs ${opponent}`, opponent, won, summary, perf, t: Date.now() };
  career.highSchool.games.push(entry);
  career.highSchool.gamesPlayed++;
  logGame(career, entry);
  const pts = awardPoints(career, 'highschool', perf);
  logHistory(career, `HS Game ${career.highSchool.gamesPlayed}: ${won ? 'W' : 'L'} vs ${opponent} — ${summary} (+${pts} skill pts)`);
  if (career.highSchool.gamesPlayed >= career.highSchool.targetGames) career.stage = 'hs_complete';
  saveState();
  return entry;
}

function generateCollegeOffers(n) {
  const offers = [];
  const used = new Set();
  while (offers.length < n) {
    const name = randomCollegeName();
    if (used.has(name)) continue;
    used.add(name);
    offers.push({ name, conference: pick(CONFERENCE_NAMES), prestige: randInt(2, 5) });
  }
  return offers.sort((a, b) => b.prestige - a.prestige);
}
function commitToCollege(career, offer) {
  archiveSeason(career, 'highschool', career.highSchool.name);
  career.college = { name: offer.name, conference: offer.conference, prestige: offer.prestige, gamesPlayed: 0, targetGames: 3, games: [] };
  career.seasonStats = newStatTotals(career.sport, career.position || 'GEN');
  career.stage = 'college';
  logHistory(career, `Committed to play at ${offer.name} (${offer.conference}).`);
  saveState();
}
function simulateCollegeGame(career) {
  const perf = performanceScore(career);
  const opponent = randomCollegeName();
  const won = Math.random() < clamp(0.42 + perf / 240, 0.25, 0.88);
  let line = null, summary = '';
  if (career.sport === 'bowling') { const res = simulateBowlingEvent(career); line = res; summary = `Avg ${res.avg.toFixed(1)}, high game ${res.highGame}`; }
  else if (career.sport === 'golf') { const res = simulateGolfEvent(career); line = res; summary = `${res.strokesTotal} strokes (${res.relToPar >= 0 ? '+' : ''}${res.relToPar})`; }
  else { line = genStatline(career, perf); addStatTotals(career.seasonStats, line); summary = statlineSummary(career.sport, career.position, line); }
  const entry = { type: 'college', label: `${career.college.name} vs ${opponent}`, opponent, won, summary, perf, t: Date.now() };
  career.college.games.push(entry);
  career.college.gamesPlayed++;
  logGame(career, entry);
  const pts = awardPoints(career, 'college', perf);
  logHistory(career, `College Game ${career.college.gamesPlayed}: ${won ? 'W' : 'L'} vs ${opponent} — ${summary} (+${pts} skill pts)`);
  if (career.college.gamesPlayed >= career.college.targetGames) career.stage = 'college_complete';
  saveState();
  return entry;
}

function archiveSeason(career, stageKey, label) {
  career.careerStatsLog.push({
    season: career.season, stage: stageKey, label,
    totals: career.seasonStats,
    position: career.position,
  });
}

/* ---- Draft (football / basketball) ---- */
function runDraft(career) {
  const ov = career.overall;
  let round;
  if (ov >= 88) round = 1; else if (ov >= 80) round = 2; else if (ov >= 73) round = 3;
  else if (ov >= 67) round = randInt(4, 5); else round = randInt(6, 7);
  const pickNum = randInt(1, 32);
  const league = generateLeague(career.sport);
  const team = weightedRandom(t => 1 / (t.rating + 1), league.teams);
  career.draft = { round, pick: pickNum, drafted: ov >= 60 || Math.random() < 0.9, teamName: team.name };
  archiveSeason(career, 'college', career.college.name);
  career.proLeague = league;
  career.team = team.id;
  career.seasonStats = newStatTotals(career.sport, career.position || 'GEN');
  career.stage = 'pro';
  career.season = 1;
  career.seasonGameCount = 0;
  if (career.draft.drafted) {
    logHistory(career, `Drafted in Round ${round}, Pick ${pickNum} by the ${team.name}!`);
  } else {
    logHistory(career, `Went undrafted, but signed as a free agent with the ${team.name}.`);
  }
  saveState();
  return career.draft;
}

/* ---- Draft -> Minors -> Call-up (baseball) ---- */
function runDraftBaseball(career) {
  const ov = career.overall;
  let round;
  if (ov >= 88) round = 1; else if (ov >= 80) round = randInt(2, 3); else if (ov >= 73) round = randInt(4, 6);
  else if (ov >= 67) round = randInt(7, 12); else round = randInt(13, 20);
  const pickNum = randInt(1, 30);
  const league = generateLeague('baseball');
  const team = weightedRandom(t => 1 / (t.rating + 1), league.teams);
  const minorNames = uniqueTeamNames(MINORS_SHAPE.teams);
  const minorAffiliate = minorNames[0];
  career.draft = { round, pick: pickNum, teamName: team.name };
  archiveSeason(career, 'college', career.college.name);
  career.proLeague = league;
  career.team = team.id;
  career.minors = { affiliateName: `${minorAffiliate.name} (AA)`, gamesPlayed: 0, games: [], level: 'AA' };
  career.seasonStats = newStatTotals('baseball', career.position);
  career.stage = 'minors';
  career.season = 1;
  career.seasonGameCount = 0;
  logHistory(career, `Drafted in Round ${round}, Pick ${pickNum} by the ${team.name} organization. Reporting to ${career.minors.affiliateName}.`);
  saveState();
  return career.draft;
}
function pick0(arr) { return arr[0]; }

function simulateMinorsGame(career) {
  const perf = performanceScore(career);
  const opponent = `${pick(CITY_NAMES)} ${pick(MASCOTS)} (AA)`;
  const won = Math.random() < clamp(0.45 + perf / 260, 0.3, 0.85);
  const line = generateBaseballLine(career.position, perf);
  addStatTotals(career.seasonStats, line);
  const summary = statlineSummary('baseball', career.position, line);
  const entry = { type: 'minors', label: `${career.minors.affiliateName} vs ${opponent}`, opponent, won, summary, perf, t: Date.now() };
  career.minors.games.push(entry);
  career.minors.gamesPlayed++;
  logGame(career, entry);
  const pts = awardPoints(career, 'minors', perf);
  logHistory(career, `Minors Game ${career.minors.gamesPlayed}: ${won ? 'W' : 'L'} vs ${opponent} — ${summary} (+${pts} skill pts)`);
  saveState();
  let calledUp = false;
  if (career.minors.gamesPlayed >= MINORS_SHAPE.gamesToCallUpEligible) {
    const chance = clamp(0.1 + (career.overall - 65) / 110 + (perf - 50) / 300, 0.04, 0.5);
    if (Math.random() < chance) { callUpToMajors(career); calledUp = true; }
  }
  return { entry, calledUp };
}
function callUpToMajors(career) {
  archiveSeason(career, 'minors', career.minors.affiliateName);
  career.seasonStats = newStatTotals('baseball', career.position);
  career.stage = 'pro';
  const team = teamById(career.proLeague, career.team);
  logHistory(career, `CALLED UP to the Majors by the ${team.name}!`);
  saveState();
}

/* ---- Turn pro (bowling / golf) ---- */
function declareTurnPro(career) {
  archiveSeason(career, 'college', career.college.name);
  career.tour = { rivals: generateRivals(career.sport), schedule: generateTourSchedule(career.sport), eventIndex: 0 };
  career.seasonStats = newStatTotals(career.sport, 'GEN');
  career.stage = 'tour';
  career.season = 1;
  logHistory(career, `Turned pro and earned a card on the ${SPORT_META[career.sport].leagueName}.`);
  saveState();
}

/* ----------------------------------------------------------------------
   12. PRO TEAM-SPORT SEASON ENGINE
   ---------------------------------------------------------------------- */
const PLAYOFF_ROUND_NAMES = ['Wild Card Round', 'Divisional Round', 'Conference Championship', 'Championship Round'];

function simulateProGame(career) {
  const league = career.proLeague;
  if (league.complete) return null;
  const result = simulateLeagueWeek(league, career.sport, career.team, career);
  if (!result) return null;
  const line = genStatline(career, result.perf);
  addStatTotals(career.seasonStats, line);
  const summary = statlineSummary(career.sport, career.position, line);
  const opp = teamById(league, result.opponentId);
  const myTeam = teamById(league, career.team);
  const entry = {
    type: 'pro', label: `${result.isHome ? 'vs' : '@'} ${opp.name}`, opponent: opp.name,
    won: result.won, tied: result.tied, score: `${result.teamScore}-${result.oppScore}`,
    summary, perf: result.perf, t: Date.now(),
  };
  logGame(career, entry);
  const pts = awardPoints(career, 'pro', result.perf);
  career.seasonGameCount++;
  logHistory(career, `${myTeam.name} ${result.won ? 'beat' : result.tied ? 'tied' : 'fell to'} ${opp.name} ${entry.score} — ${summary} (+${pts} skill pts)`);
  let seasonOver = false, playoffResult = null;
  if (league.complete) {
    seasonOver = true;
    playoffResult = runPlayoffs(league, career.sport, career.team);
    league.playoffResult = playoffResult;
    logHistory(career, `Regular season complete. ${playoffResult.summary}`);
  }
  saveState();
  return { entry, seasonOver, playoffResult };
}

function runPlayoffs(league, sport, userTeamId) {
  const picture = playoffPicture(league);
  let field = [];
  picture.forEach(p => field.push(...p.inPlayoffs));
  field = field.slice(0, league.playoffTeams);
  field = standingsSorted(field);
  let round = 0;
  let userEliminatedRound = field.find(t => t.id === userTeamId) ? -1 : -2; // -2 = missed playoffs
  let remaining = field.map(t => ({ id: t.id, name: t.name, rating: t.rating }));
  if (userEliminatedRound === -2) {
    return { madePlayoffs: false, summary: 'Missed the playoffs this season.', champion: null };
  }
  let champion = null;
  while (remaining.length > 1) {
    const next = [];
    for (let i = 0; i < remaining.length / 2; i++) {
      const a = remaining[i], b = remaining[remaining.length - 1 - i];
      const pA = winProbability(a.rating + 1.5, b.rating);
      const aWins = Math.random() < pA;
      const winner = aWins ? a : b, loser = aWins ? b : a;
      if (loser.id === userTeamId) userEliminatedRound = round;
      next.push(winner);
    }
    remaining = next;
    round++;
  }
  champion = remaining[0];
  if (champion.id === userTeamId) {
    return { madePlayoffs: true, summary: `Won the Championship! 🏆`, champion: champion.name, wonIt: true };
  }
  const roundName = PLAYOFF_ROUND_NAMES[clamp(userEliminatedRound, 0, PLAYOFF_ROUND_NAMES.length - 1)];
  return { madePlayoffs: true, summary: `Eliminated in the ${roundName}. Champion: ${champion.name}.`, champion: champion.name, wonIt: false };
}

function startNewProSeason(career) {
    let totalGames = 16; // Default fallback

    switch(career.sport) {
        case 'football': totalGames = 17; break;
        case 'basketball': totalGames = 82; break;
        case 'baseball': totalGames = 162; break;
        case 'golf': totalGames = 20; break;
    }
  const league = career.proLeague;
  const team = teamById(league, career.team);
  archiveSeason(career, 'pro', `${team.name} (Season ${career.season})`);
  league.teams.forEach(t => {
    t.wins = 0; t.losses = 0; t.ties = 0; t.pf = 0; t.pa = 0; t.streak = 0;
    t.rating = clamp(t.rating + randInt(-4, 4), 60, 99);
  });
  league.schedule = buildRoundRobinSchedule(league.teams.map(t => t.id), LEAGUE_SHAPE[career.sport].roundsEachOpponent);
  league.week = 0; league.complete = false; league.playoffResult = null;
  career.season++;
  career.seasonGameCount = 0;
  career.seasonStats = newStatTotals(career.sport, career.position || 'GEN');
  logHistory(career, `Season ${career.season} begins with the ${team.name}.`);
  saveState();
}

/* ---- Trade requests ---- */
function requestTrade(career) {
  const cooldownGames = 4;
  if (career.seasonGameCount - career.trade.lastRequestGameCount < cooldownGames) {
    return { ok: false, reason: 'cooldown', gamesLeft: cooldownGames - (career.seasonGameCount - career.trade.lastRequestGameCount) };
  }
  career.trade.lastRequestGameCount = career.seasonGameCount;
  const acceptChance = clamp(0.25 + (career.overall - 65) / 130, 0.15, 0.7);
  const accepted = Math.random() < acceptChance;
  if (accepted) {
    const league = career.proLeague;
    const choices = league.teams.filter(t => t.id !== career.team);
    const newTeam = pick(choices);
    const oldTeam = teamById(league, career.team);
    career.team = newTeam.id;
    logHistory(career, `TRADE: Moved from the ${oldTeam.name} to the ${newTeam.name}.`);
    saveState();
    return { ok: true, accepted: true, team: newTeam };
  } else {
    logHistory(career, `Requested a trade — the front office denied the request.`);
    saveState();
    return { ok: true, accepted: false };
  }
}

/* ----------------------------------------------------------------------
   13. TOUR (bowling / golf) EVENT + SEASON WRAPPER
   ---------------------------------------------------------------------- */
function simulateTourEventForCareer(career) {
  const tour = career.tour;
  if (tour.eventIndex >= tour.schedule.length) return null;
  const event = tour.schedule[tour.eventIndex];
  const result = simulateTourEvent(career);
  event.played = true;
  event.result = result;
  addStatTotals(career.seasonStats, {
    eventsPlayed: 1,
    games: result.line.games || 0,
    pinfall: result.line.pinfall || 0,
    highGame: 0, // handled via max below
    cutsMade: result.madeCut && career.sport === 'golf' ? 1 : 0,
    wins: result.place === 1 ? 1 : 0,
    top5: career.sport === 'bowling' && result.place <= 5 ? 1 : 0,
    top10: career.sport === 'golf' && result.place <= 10 ? 1 : 0,
    cashes: career.sport === 'bowling' && result.earnings > 0 ? 1 : 0,
    titles: result.place === 1 ? 1 : 0,
    roundsPlayed: result.line.rounds || 0,
    strokesTotal: result.line.strokesTotal || 0,
    earnings: result.earnings,
    points: result.points,
  });
  if (career.sport === 'bowling' && result.line.highGame > (career.seasonStats.highGame || 0)) {
    career.seasonStats.highGame = result.line.highGame;
  }
  const entry = {
    type: 'tour', label: event.name, opponent: event.city,
    place: result.place, fieldSize: result.fieldSize, won: result.place === 1,
    summary: career.sport === 'bowling'
      ? `${result.line.avg.toFixed(1)} avg — finished ${ordinal(result.place)} of ${result.fieldSize}`
      : `${result.madeCut ? (result.line.relToPar >= 0 ? '+' : '') + result.line.relToPar : 'MC'} — finished ${result.madeCut ? ordinal(result.place) + ' of ' + result.fieldSize : 'missed cut'}`,
    earnings: result.earnings, points: result.points, perf: result.line.perf, t: Date.now(),
  };
  logGame(career, entry);
  const pts = awardPoints(career, 'tour', result.line.perf * 100);
  tour.eventIndex++;
  logHistory(career, `${event.name}: ${entry.summary} — ${fmtMoney(result.earnings)} (+${pts} skill pts)`);
  let seasonOver = false;
  if (tour.eventIndex >= tour.schedule.length) seasonOver = true;
  saveState();
  return { entry, leaderboard: result.leaderboard, seasonOver };
}
function startNewTourSeason(career) {
  const tour = career.tour;
  archiveSeason(career, 'tour', `${SPORT_META[career.sport].leagueName} (Season ${career.season})`);
  tour.rivals.forEach(rv => { rv.rating = clamp(rv.rating + randInt(-5, 5), 40, 99); rv.seasonPoints = 0; });
  tour.schedule = generateTourSchedule(career.sport);
  tour.eventIndex = 0;
  career.season++;
  career.seasonStats = newStatTotals(career.sport, 'GEN');
  logHistory(career, `Season ${career.season} of the ${SPORT_META[career.sport].leagueName} begins.`);
  saveState();
}

/* ----------------------------------------------------------------------
   14. UI SHELL — ROUTER, MODAL, TOAST
   ---------------------------------------------------------------------- */
const appEl = () => document.getElementById('app');
const modalRoot = () => document.getElementById('modalRoot');
const toastRoot = () => document.getElementById('toastRoot');

function navigate(hash) {
  if (location.hash === hash) { router(); } else { location.hash = hash; }
}
function rerenderCurrentRoute() { router(); }
function currentCareerFromRoute() {
  const p = parseRoute();
  if (p[0] === 'career') return getCareer(p[1], p[2]);
  return null;
}
function currentSportFromRoute() { return parseRoute()[1]; }
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  return h.split('/').filter(Boolean).map(decodeURIComponent);
}
function router() {
  const parts = parseRoute();
  closeModal();
  window.scrollTo(0, 0);
  if (parts.length === 0) return renderHome();
  if (parts[0] === 'sport' && parts[1] && parts[2] === 'new') return renderCreate(parts[1]);
  if (parts[0] === 'sport' && parts[1]) return renderSportList(parts[1]);
  if (parts[0] === 'career' && parts[1] && parts[2]) return renderCareerHub(parts[1], parts[2], parts[3] || 'overview');
  return renderHome();
}
window.addEventListener('hashchange', router);

function toast(msg, type) {
  const root = toastRoot();
  while (root.children.length >= 2) root.removeChild(root.firstChild);
  const el = document.createElement('div');
  el.className = 'toast toast--' + (type || 'info');
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => { el.classList.remove('toast--show'); setTimeout(() => el.remove(), 300); }, 2400);
}
function openModal(html, opts) {
  opts = opts || {};
  modalRoot().innerHTML = `<div class="modalOverlay" data-action="modal-close-overlay">
      <div class="modalCard ${opts.wide ? 'modalCard--wide' : ''}" role="dialog" aria-modal="true">${html}</div>
    </div>`;
  modalRoot().classList.add('modalRoot--open');
  document.body.classList.add('noScroll');
}
function closeModal() {
  modalRoot().innerHTML = '';
  modalRoot().classList.remove('modalRoot--open');
  document.body.classList.remove('noScroll');
}

/* Delegated click handling for the whole app */
document.addEventListener('click', (e) => {
  const overlayClose = e.target.closest('[data-action="modal-close-overlay"]');
  if (overlayClose && e.target === overlayClose) { closeModal(); return; }
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  if (action === 'modal-close-overlay') return;
  handleAction(action, btn, e);
});

function qs(id) { return document.getElementById(id); }
function todayYear() { return new Date().getFullYear(); }

/* ----------------------------------------------------------------------
   15. SHARED RENDER HELPERS
   ---------------------------------------------------------------------- */
function setAccent(sport) {
  document.documentElement.style.setProperty('--accent', SPORT_META[sport].accent);
  document.documentElement.style.setProperty('--accent-soft', SPORT_META[sport].accentSoft);
}
function clearAccent() {
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent-soft');
}
function pageShell(headerHtml, contentHtml) {
  appEl().innerHTML = `<div class="page">${headerHtml}<div class="pageContent">${contentHtml}</div></div>`;
}
function topBar(title, opts) {
  opts = opts || {};
  return `<header class="topBar">
    <div class="topBar__row">
      ${opts.back ? `<button class="iconBtn" data-action="nav-back" aria-label="Back">${ICON_BACK}</button>` : `<span class="topBar__brandDot"></span>`}
      <h1 class="topBar__title">${escapeHtml(title)}</h1>
      ${opts.right || '<span class="topBar__spacer"></span>'}
    </div>
    ${opts.sub ? `<div class="topBar__sub">${opts.sub}</div>` : ''}
  </header>`;
}
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none"><path d="M14.7 4.3l5 5L8 21H3v-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

function stageLabel(career) {
  const sm = SPORT_META[career.sport];
  switch (career.stage) {
    case 'highschool': return `High School · Game ${career.highSchool.gamesPlayed + 1} of ${career.highSchool.targetGames}`;
    case 'hs_complete': return `High School Complete — Ready to Commit`;
    case 'college': return `${career.college.name} · Game ${career.college.gamesPlayed + 1} of ${career.college.targetGames}`;
    case 'college_complete': return HAS_POSITIONS[career.sport] || career.sport === 'baseball'
      ? `College Complete — Ready for the ${sm.draftLabel || 'Draft'}` : `College Complete — Ready to Turn Pro`;
    case 'minors': return `${career.minors.affiliateName} · Season ${career.season}`;
    case 'pro': return `${sm.leagueAbbr} Pro · Season ${career.season}`;
    case 'tour': return `${sm.leagueAbbr} Tour · Season ${career.season}`;
    default: return career.stage;
  }
}
function stageBadgeClass(career) {
  if (career.stage.startsWith('highschool') || career.stage === 'hs_complete') return 'badge--hs';
  if (career.stage.startsWith('college')) return 'badge--college';
  if (career.stage === 'minors') return 'badge--minors';
  return 'badge--pro';
}
function stageShortTag(career) {
  if (career.stage === 'highschool' || career.stage === 'hs_complete') return 'HS';
  if (career.stage === 'college' || career.stage === 'college_complete') return 'COLLEGE';
  if (career.stage === 'minors') return 'MINORS';
  if (career.stage === 'tour') return 'TOUR';
  return 'PRO';
}
function teamNameForCareer(career) {
  if (career.stage === 'minors') return career.minors.affiliateName;
  if (career.stage === 'pro' && career.proLeague) return teamById(career.proLeague, career.team).name;
  if (career.stage === 'college' || career.stage === 'college_complete') return career.college.name;
  if (career.stage === 'highschool' || career.stage === 'hs_complete') return career.highSchool.name;
  if (career.stage === 'tour') return SPORT_META[career.sport].leagueName;
  return '—';
}
function recordSnippet(career) {
  if (career.stage === 'pro' && career.proLeague) {
    const t = teamById(career.proLeague, career.team);
    return `${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}`;
  }
  if (career.stage === 'tour') {
    const played = career.tour.eventIndex;
    return `${played} event${played === 1 ? '' : 's'} played`;
  }
  return null;
}
function ageOf(career) { return ageFromBirthday(career.birthday, todayYear()); }
function heightWeightLine(career) { return `${inToFeet(career.heightIn)} · ${career.weightLb} lb`; }
function positionLabel(career) {
  if (!career.position) return null;
  return posInfo(career.sport, career.position).label;
}
function miniAvatar(career, size) {
  return `<div class="miniAvatar" style="width:${size}px;height:${size}px">${buildAvatarSVG({
    skinTone: career.appearance.skinTone, hairStyle: career.appearance.hairStyle, hairColor: career.appearance.hairColor,
    jerseyColor: SPORT_META[career.sport].accent, number: career.number, heightIn: career.heightIn, weightLb: career.weightLb,
  })}</div>`;
}

/* ----------------------------------------------------------------------
   16. HOME PAGE
   ---------------------------------------------------------------------- */
function renderHome() {
  clearAccent();
  document.title = 'Career Mode';
  const totalCareers = SPORTS.reduce((s, sp) => s + getCareers(sp).length, 0);
  const header = `<header class="hero">
    <div class="hero__badge">CAREER MODE</div>
    <h1 class="hero__title">Build a career.<br>Any sport. Any path.</h1>
    <p class="hero__sub">Create a player, live the story — high school, college, the draft, and the pros — then simulate your way from a 65 overall to a 99.</p>
    ${totalCareers > 0 ? `<div class="hero__stat"><span>${totalCareers}</span> active career${totalCareers === 1 ? '' : 's'} across your roster</div>` : ''}
  </header>`;

  const tiles = SPORTS.map(sport => {
    const sm = SPORT_META[sport];
    const count = getCareers(sport).length;
    return `<button class="sportTile" data-action="goto-sport" data-sport="${sport}" style="--tile-accent:${sm.accent}">
      <span class="sportTile__icon">${sm.icon}</span>
      <span class="sportTile__label">${sm.label}</span>
      <span class="sportTile__count">${count ? `${count} career${count === 1 ? '' : 's'}` : 'Start your story'}</span>
      <span class="sportTile__chevron">${ICON_CHEVRON}</span>
    </button>`;
  }).join('');

  pageShell('', `${header}<div class="sportGrid">${tiles}</div>
    <p class="footnote">All progress is saved automatically in this browser. Install to your homescreen for the full app feel — look for "Add to Home Screen" in your browser's share menu.</p>`);
}

/* ----------------------------------------------------------------------
   17. SPORT CAREER LIST
   ---------------------------------------------------------------------- */
function renderSportList(sport) {
  if (!SPORTS.includes(sport)) return renderHome();
  setAccent(sport);
  const sm = SPORT_META[sport];
  document.title = `${sm.label} · Career Mode`;
  const careers = getCareers(sport);

  const header = topBar(sm.label, { back: true, sub: `${sm.icon} ${careers.length} career slot${careers.length === 1 ? '' : 's'}` });

  const cards = careers.map(c => `
    <div class="careerCard" data-action="goto-career" data-sport="${sport}" data-id="${c.id}">
      ${miniAvatar(c, 56)}
      <div class="careerCard__body">
        <div class="careerCard__topline">
          <span class="careerCard__name">${escapeHtml(c.name)}</span>
          <span class="ovrPill">${c.overall} OVR</span>
        </div>
        <div class="careerCard__meta">
          ${positionLabel(c) ? `<span>${positionLabel(c)}</span><span class="dot">·</span>` : ''}
          <span>#${escapeHtml(String(c.number))}</span>
          <span class="dot">·</span><span>${escapeHtml(c.hometown.split(',')[0])}</span>
        </div>
        <div class="careerCard__stage">
          <span class="badge ${stageBadgeClass(c)}">${stageShortTag(c)}</span>
          <span class="careerCard__stageText">${stageLabel(c)}</span>
        </div>
      </div>
      <button class="iconBtn iconBtn--ghost careerCard__del" data-action="delete-career-confirm" data-sport="${sport}" data-id="${c.id}" aria-label="Delete career">${ICON_TRASH}</button>
    </div>`).join('');

  const addTile = `<button class="newCareerTile" data-action="goto-new-career" data-sport="${sport}">
    <span class="newCareerTile__plus">${ICON_PLUS}</span>
    <span>Start a New ${sm.label} Career</span>
  </button>`;

  const empty = careers.length === 0 ? `<div class="emptyState">
      <span class="emptyState__icon">${sm.icon}</span>
      <p>No ${sm.label.toLowerCase()} careers yet.<br>Create your first player and start the story in high school.</p>
    </div>` : '';

  pageShell(header, `<div class="careerList">${empty}${cards}${addTile}</div>`);
}

/* ----------------------------------------------------------------------
   18. CHARACTER CREATOR
   ---------------------------------------------------------------------- */
let creatorState = null;

function defaultCreatorState(sport) {
  const pos = HAS_POSITIONS[sport] ? positionList(sport)[0] : null;
  const baseline = pos ? posInfo(sport, pos) : { h: 71, w: 175 };
  return {
    name: '', number: String(randInt(1, 99)), gender: 'male', hometown: randomHometown(),
    heightIn: baseline.h, weightLb: baseline.w,
    birthday: randomBirthday(16, 18, todayYear()),
    position: pos,
    appearance: { skinTone: SKIN_TONES[2], hairStyle: 'short', hairColor: HAIR_COLORS[0] },
  };
}
function randomizeCreatorState(sport) {
  const gender = pick(['male', 'female']);
  const pos = HAS_POSITIONS[sport] ? pick(positionList(sport)) : null;
  const baseline = pos ? posInfo(sport, pos) : { h: 71, w: 175 };
  creatorState = {
    name: randomFullName(gender), number: String(randInt(0, 99)), gender, hometown: randomHometown(),
    heightIn: clamp(baseline.h + randInt(-4, 4), 60, 90),
    weightLb: clamp(baseline.w + randInt(-25, 25), 110, 360),
    birthday: randomBirthday(16, 18, todayYear()),
    position: pos,
    appearance: { skinTone: pick(SKIN_TONES), hairStyle: pick(HAIR_STYLES), hairColor: pick(HAIR_COLORS) },
  };
}

function renderCreate(sport) {
  if (!SPORTS.includes(sport)) return renderHome();
  setAccent(sport);
  document.title = `New ${SPORT_META[sport].label} Career · Career Mode`;
  creatorState = defaultCreatorState(sport);
  const header = topBar(`New ${SPORT_META[sport].label} Career`, { back: true });
  pageShell(header, `<div id="creatorRoot"></div>`);
  refreshCreatorForm(sport);
}

function refreshCreatorForm(sport) {
  qs('creatorRoot').innerHTML = creatorFormHTML(sport);
  bindCreatorEvents(sport);
}

function creatorFormHTML(sport) {
  const sm = SPORT_META[sport];
  const cs = creatorState;
  const age = ageFromBirthday(cs.birthday, todayYear());

  const positionSection = HAS_POSITIONS[sport] ? `
    <section class="formSection">
      <h2 class="formSection__title">Position</h2>
      <p class="formSection__hint">Determines which 6 attributes you'll develop, and shapes your starting build.</p>
      <div class="posGrid">
        ${positionList(sport).map(p => `
          <button type="button" class="posChip ${cs.position === p ? 'posChip--active' : ''}" data-action="creator-pick-position" data-pos="${p}">
            <span class="posChip__abbr">${p}</span><span class="posChip__label">${posInfo(sport, p).label}</span>
          </button>`).join('')}
      </div>
    </section>` : '';

  return `
    <div class="creatorLayout">
      <div class="creatorPreview">
        <div class="avatarFrame" id="avatarPreview">${buildAvatarSVG({
          skinTone: cs.appearance.skinTone, hairStyle: cs.appearance.hairStyle, hairColor: cs.appearance.hairColor,
          jerseyColor: sm.accent, number: cs.number, heightIn: cs.heightIn, weightLb: cs.weightLb,
        })}</div>
        <button type="button" class="btn btn--ghost btn--block" data-action="creator-randomize" data-sport="${sport}">🎲 Randomize Everything</button>
      </div>

      <form class="creatorForm" id="creatorForm" novalidate>
        <section class="formSection">
          <h2 class="formSection__title">Identity</h2>
          <div class="fieldRow">
            <label class="field">
              <span class="field__label">Name</span>
              <input type="text" id="f-name" maxlength="28" placeholder="e.g. Jordan Hayes" value="${escapeHtml(cs.name)}" autocomplete="off">
            </label>
            <label class="field field--narrow">
              <span class="field__label">Number</span>
              <input type="number" id="f-number" min="0" max="99" value="${escapeHtml(cs.number)}">
            </label>
          </div>
          <div class="fieldRow">
            <label class="field">
              <span class="field__label">Gender</span>
              <select id="f-gender">
                <option value="male" ${cs.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${cs.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="nonbinary" ${cs.gender === 'nonbinary' ? 'selected' : ''}>Non-binary</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Birthday <span class="field__hint" id="ageDisplay">(age ${age})</span></span>
              <input type="date" id="f-birthday" value="${cs.birthday}">
            </label>
          </div>
          <label class="field">
            <span class="field__label">Hometown</span>
            <div class="fieldWithBtn">
              <input type="text" id="f-hometown" maxlength="40" value="${escapeHtml(cs.hometown)}">
              <button type="button" class="btn btn--tiny" data-action="creator-reroll-hometown">🎲</button>
            </div>
          </label>
        </section>

        ${positionSection}

        <section class="formSection">
          <h2 class="formSection__title">Physical</h2>
          <label class="field">
            <span class="field__label">Height <span class="field__hint" id="heightLabel">${inToFeet(cs.heightIn)}</span></span>
            <input type="range" id="f-height" min="60" max="90" value="${cs.heightIn}">
          </label>
          <label class="field">
            <span class="field__label">Weight <span class="field__hint" id="weightLabel">${cs.weightLb} lb</span></span>
            <input type="range" id="f-weight" min="110" max="360" step="1" value="${cs.weightLb}">
          </label>
          <p class="formSection__hint">Height and weight nudge your starting attributes — bigger builds trend toward power, leaner builds trend toward speed.</p>
        </section>

        <section class="formSection">
          <h2 class="formSection__title">Appearance</h2>
          <div class="field">
            <span class="field__label">Skin Tone</span>
            <div class="swatchRow">
              ${SKIN_TONES.map(t => `<button type="button" class="swatch ${cs.appearance.skinTone === t ? 'swatch--active' : ''}" style="background:${t}" data-action="creator-pick-skin" data-tone="${t}" aria-label="skin tone"></button>`).join('')}
            </div>
          </div>
          <div class="field">
            <span class="field__label">Hair Style</span>
            <div class="chipRow">
              ${HAIR_STYLES.map(s => `<button type="button" class="chip ${cs.appearance.hairStyle === s ? 'chip--active' : ''}" data-action="creator-pick-hairstyle" data-style="${s}">${s}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <span class="field__label">Hair Color</span>
            <div class="swatchRow">
              ${HAIR_COLORS.map(c => `<button type="button" class="swatch swatch--sm ${cs.appearance.hairColor === c ? 'swatch--active' : ''}" style="background:${c}" data-action="creator-pick-haircolor" data-color="${c}" aria-label="hair color"></button>`).join('')}
            </div>
          </div>
        </section>

        <button type="button" class="btn btn--primary btn--block btn--lg" id="submitCreate" data-action="creator-submit" data-sport="${sport}">
          Create Career &amp; Start in High School
        </button>
      </form>
    </div>`;
}

function refreshAvatarPreview(sport) {
  const cs = creatorState;
  qs('avatarPreview').innerHTML = buildAvatarSVG({
    skinTone: cs.appearance.skinTone, hairStyle: cs.appearance.hairStyle, hairColor: cs.appearance.hairColor,
    jerseyColor: SPORT_META[sport].accent, number: cs.number, heightIn: cs.heightIn, weightLb: cs.weightLb,
  });
}

function bindCreatorEvents(sport) {
  const cs = creatorState;
  qs('f-name').addEventListener('input', e => { cs.name = e.target.value; });
  qs('f-number').addEventListener('input', e => {
    cs.number = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    refreshAvatarPreview(sport);
  });
  qs('f-gender').addEventListener('change', e => { cs.gender = e.target.value; });
  qs('f-birthday').addEventListener('change', e => {
    cs.birthday = e.target.value;
    qs('ageDisplay').textContent = `(age ${ageFromBirthday(cs.birthday, todayYear())})`;
  });
  qs('f-hometown').addEventListener('input', e => { cs.hometown = e.target.value; });
  qs('f-height').addEventListener('input', e => {
    cs.heightIn = Number(e.target.value);
    qs('heightLabel').textContent = inToFeet(cs.heightIn);
    refreshAvatarPreview(sport);
  });
  qs('f-weight').addEventListener('input', e => {
    cs.weightLb = Number(e.target.value);
    qs('weightLabel').textContent = `${cs.weightLb} lb`;
    refreshAvatarPreview(sport);
  });
}

/* ----------------------------------------------------------------------
   19. CAREER HUB — SHELL + TIMELINE
   ---------------------------------------------------------------------- */
function timelineSteps(sport) {
  if (sport === 'baseball') return ['High School', 'College', 'Draft', 'Minors', 'Majors'];
  if (sport === 'bowling' || sport === 'golf') return ['High School', 'College', 'Turn Pro', 'Tour'];
  return ['High School', 'College', 'Draft', 'Pro'];
}
function currentStepIndex(career) {
  const s = career.stage;
  if (s === 'highschool') return 0;
  if (s === 'hs_complete') return 0.5;
  if (s === 'college') return 1;
  if (s === 'college_complete') return 1.5;
  if (s === 'minors') return 3;
  if (s === 'pro' && career.sport === 'baseball') return 4;
  if (s === 'pro') return 3;
  if (s === 'tour') return 3;
  return 0;
}
function timelineHTML(career) {
  const steps = timelineSteps(career.sport);
  const cur = currentStepIndex(career);
  return `<div class="timeline">${steps.map((label, i) => {
    let cls = 'timeline__step';
    if (i < Math.floor(cur) || (i === Math.floor(cur) && cur % 1 !== 0)) cls += ' timeline__step--done';
    else if (i === Math.round(cur) && cur % 1 === 0) cls += ' timeline__step--current';
    else if (Math.abs(i - cur) < 1 && cur % 1 !== 0) cls += ' timeline__step--current';
    return `<div class="${cls}"><span class="timeline__dot">${i < cur ? '✓' : i + 1}</span><span class="timeline__label">${label}</span></div>`;
  }).join('<span class="timeline__connector"></span>')}</div>`;
}

const TAB_DEFS = (sport) => [
  { key: 'overview', label: 'Overview' },
  { key: 'attributes', label: 'Attributes' },
  { key: 'team', label: (sport === 'bowling' || sport === 'golf') ? 'Tour' : 'Team' },
  { key: 'stats', label: 'Stats' },
  { key: 'edit', label: 'Edit' },
];

function renderCareerHub(sport, id, tab) {
  const career = getCareer(sport, id);
  if (!career) { toast('That career could not be found.', 'error'); return renderSportList(sport); }
  setAccent(sport);
  document.title = `${career.name} · Career Mode`;
  const sm = SPORT_META[sport];

  const headerRight = `<span class="ovrPill ovrPill--lg">${career.overall} <small>OVR</small></span>`;
  const header = topBar(career.name, {
    back: true, right: headerRight,
    sub: `${sm.icon} ${positionLabel(career) ? positionLabel(career) + ' · ' : ''}${stageLabel(career)}`,
  });

  const tabs = TAB_DEFS(sport).map(t => `
    <button class="tabBtn ${tab === t.key ? 'tabBtn--active' : ''}" data-action="goto-career-tab" data-sport="${sport}" data-id="${id}" data-tab="${t.key}">${t.label}</button>
  `).join('');
  const tabBar = `<nav class="tabBar">${tabs}</nav>`;

  let content = '';
  if (tab === 'overview') content = renderOverviewTab(career);
  else if (tab === 'attributes') content = renderAttributesTab(career);
  else if (tab === 'team') content = renderTeamTab(career);
  else if (tab === 'stats') content = renderStatsTab(career);
  else if (tab === 'edit') content = renderEditTab(career);
  else content = renderOverviewTab(career);

  pageShell(header, `${tabBar}<div class="tabContent">${content}</div>`);
  if (tab === 'edit') bindEditTabAfterRender(career);
}

/* ----------------------------------------------------------------------
   20. OVERVIEW TAB
   ---------------------------------------------------------------------- */
function renderOverviewTab(career) {
  const sport = career.sport;
  const sm = SPORT_META[sport];

  const bioCard = `<div class="bioCard">
    ${miniAvatar(career, 84)}
    <div class="bioCard__info">
      <div class="bioCard__name">${escapeHtml(career.name)} <span class="bioCard__num">#${escapeHtml(String(career.number))}</span></div>
      <div class="bioCard__line">${positionLabel(career) ? positionLabel(career) + ' · ' : ''}${ageOf(career)} yrs · ${heightWeightLine(career)}</div>
      <div class="bioCard__line">${escapeHtml(career.hometown)}</div>
    </div>
    <div class="bioCard__pts">
      <span class="bioCard__ptsNum">${career.skillPoints}</span>
      <span class="bioCard__ptsLabel">Skill Pts</span>
    </div>
  </div>`;

  const team = teamNameForCareer(career);
  const teamLine = `<div class="currentTeamLine"><span class="currentTeamLine__label">Currently with</span><span class="currentTeamLine__name">${escapeHtml(team)}</span></div>`;

  const actionBlock = renderPrimaryAction(career);

  const recentGames = career.gameLog.slice(0, 6).map(g => gameLogRowHTML(career, g)).join('') ||
    `<p class="emptyHint">No games simulated yet — your first action awaits above.</p>`;

  const historyFeed = career.history.slice(0, 8).map(h => `<div class="historyRow"><span class="historyRow__dot"></span><span>${escapeHtml(h.text)}</span></div>`).join('');

  return `
    ${bioCard}
    ${teamLine}
    ${timelineHTML(career)}
    ${actionBlock}
    <section class="block">
      <h2 class="block__title">Recent Games</h2>
      <div class="gameLogList">${recentGames}</div>
    </section>
    <section class="block">
      <h2 class="block__title">Career Story</h2>
      <div class="historyFeed">${historyFeed}</div>
    </section>
  `;
}

function gameLogRowHTML(career, g) {
  let resultTag = '';
  if (g.type === 'tour') {
    resultTag = `<span class="resultTag ${g.place === 1 ? 'resultTag--win' : 'resultTag--neutral'}">${g.place === 1 ? 'WON' : ordinal(g.place)}</span>`;
  } else {
    resultTag = `<span class="resultTag ${g.won ? 'resultTag--win' : (g.tied ? 'resultTag--tie' : 'resultTag--loss')}">${g.won ? 'W' : (g.tied ? 'T' : 'L')}${g.score ? ' ' + g.score : ''}</span>`;
  }
  return `<div class="gameLogRow">
    <div class="gameLogRow__main">
      <span class="gameLogRow__label">${escapeHtml(g.label)}</span>
      <span class="gameLogRow__summary">${escapeHtml(g.summary)}</span>
    </div>
    ${resultTag}
  </div>`;
}

function renderPrimaryAction(career) {
  const sport = career.sport;
  const sm = SPORT_META[sport];
  switch (career.stage) {
    case 'highschool':
      return actionCard(
        `Senior Season at ${career.highSchool.name}`,
        `Game ${career.highSchool.gamesPlayed + 1} of ${career.highSchool.targetGames}. Every game builds your tape for college recruiters.`,
        [{ label: 'Simulate Game', action: 'sim-hs-game' }]
      );
    case 'hs_complete':
      return actionCard(
        `High School Complete`,
        `You finished your high school career. Time to pick where you'll play next.`,
        [{ label: 'View College Offers', action: 'open-college-offers' }]
      );
    case 'college':
      return actionCard(
        `Playing at ${career.college.name}`,
        `Game ${career.college.gamesPlayed + 1} of ${career.college.targetGames} · ${career.college.conference}`,
        [{ label: 'Simulate Game', action: 'sim-college-game' }]
      );
    case 'college_complete':
      return (sport === 'bowling' || sport === 'golf')
        ? actionCard(`College Career Complete`, `You're ready to turn pro and chase a card on the ${sm.leagueName}.`, [{ label: 'Turn Pro', action: 'do-turnpro' }])
        : actionCard(`College Career Complete`, `Declare for the ${sm.draftLabel} and find out where you land.`, [{ label: `Enter the ${sm.draftLabel}`, action: sport === 'baseball' ? 'do-draft-baseball' : 'do-draft' }]);
    case 'minors':
      return actionCard(
        `Grinding in the Minors — ${career.minors.affiliateName}`,
        career.minors.gamesPlayed >= MINORS_SHAPE.gamesToCallUpEligible ? `Every strong game raises your call-up odds.` : `Call-ups become possible after game ${MINORS_SHAPE.gamesToCallUpEligible}.`,
        [{ label: 'Simulate Game', action: 'sim-minors-game' }, { label: 'Sim 5 Games', action: 'sim-minors-game', count: 5, ghost: true }]
      );
    case 'pro': {
      const league = career.proLeague;
      if (league.complete) {
        return actionCard(`Season ${career.season} Complete`, league.playoffResult ? league.playoffResult.summary : '', [{ label: `Start Season ${career.season + 1}`, action: 'start-new-pro-season' }]);
      }
      const weeksLeft = league.schedule.length - league.week;
      return actionCard(
        `${teamById(league, career.team).name} — Week ${league.week + 1} of ${league.schedule.length}`,
        `${weeksLeft} game${weeksLeft === 1 ? '' : 's'} remaining this regular season.`,
        [{ label: 'Simulate Next Game', action: 'sim-pro-game' }, { label: 'Sim 5 Games', action: 'sim-pro-game', count: 5, ghost: true }]
      );
    }
    case 'tour': {
      const tour = career.tour;
      if (tour.eventIndex >= tour.schedule.length) {
        return actionCard(`Season ${career.season} Complete`, `Final tour points: ${career.seasonStats.points || 0}`, [{ label: `Start Season ${career.season + 1}`, action: 'start-new-tour-season' }]);
      }
      const left = tour.schedule.length - tour.eventIndex;
      return actionCard(
        `${tour.schedule[tour.eventIndex].name} — Event ${tour.eventIndex + 1} of ${tour.schedule.length}`,
        `${left} tournament${left === 1 ? '' : 's'} remaining this season.`,
        [{ label: 'Simulate Tournament', action: 'sim-tour-event' }, { label: 'Sim 3 Events', action: 'sim-tour-event', count: 3, ghost: true }]
      );
    }
    default: return '';
  }
}
function actionCard(title, sub, buttons) {
  return `<section class="actionCard">
    <h2 class="actionCard__title">${escapeHtml(title)}</h2>
    ${sub ? `<p class="actionCard__sub">${escapeHtml(sub)}</p>` : ''}
    <div class="actionCard__btns">
      ${buttons.map(b => `<button class="btn ${b.ghost ? 'btn--ghost' : 'btn--primary'}" data-action="${b.action}" ${b.count ? `data-count="${b.count}"` : ''}>${escapeHtml(b.label)}</button>`).join('')}
    </div>
  </section>`;
}

/* ----------------------------------------------------------------------
   21. ATTRIBUTES TAB
   ---------------------------------------------------------------------- */
function renderAttributesTab(career) {
  const attrs = roleAttrs(career.sport, career.position || 'GEN');
  const rows = attrs.map(a => {
    const val = career.attributes[a];
    const cost = upgradeCost(val);
    const can = canUpgrade(career, a);
    const pct = Math.round(((val - ATTR_MIN) / (ATTR_MAX - ATTR_MIN)) * 100);
    return `<div class="attrRow">
      <div class="attrRow__top">
        <span class="attrRow__name">${a}</span>
        <span class="attrRow__val">${val}</span>
      </div>
      <div class="attrRow__bar"><div class="attrRow__fill" style="width:${pct}%"></div></div>
      <button class="attrRow__upBtn ${can ? '' : 'attrRow__upBtn--disabled'}" data-action="upgrade-attr" data-attr="${encodeURIComponent(a)}" ${can ? '' : 'disabled'}>
        +1 <span class="attrRow__cost">${cost} pt${cost === 1 ? '' : 's'}</span>
      </button>
    </div>`;
  }).join('');

  return `
    <div class="ovrBanner">
      <div class="ovrBanner__big">${career.overall}</div>
      <div class="ovrBanner__meta">
        <span class="ovrBanner__label">OVERALL</span>
        <span class="ovrBanner__pts">${career.skillPoints} skill point${career.skillPoints === 1 ? '' : 's'} available</span>
      </div>
    </div>
    <p class="formSection__hint">Spend skill points earned from simulating games to push individual attributes from 65 toward a max of 99. Costs rise as attributes get elite.</p>
    <div class="attrList">${rows}</div>
  `;
}

/* ----------------------------------------------------------------------
   22. TEAM / TOUR TAB
   ---------------------------------------------------------------------- */
function renderTeamTab(career) {
  if (career.sport === 'bowling' || career.sport === 'golf') return renderTourTab(career);
  return renderTeamSportTab(career);
}

function renderTeamSportTab(career) {
  if (!career.proLeague) {
    return `<div class="emptyState">
      <span class="emptyState__icon">${SPORT_META[career.sport].icon}</span>
      <p>No pro team yet. Your ${SPORT_META[career.sport].leagueAbbr} roster, schedule, and standings will appear here once you're drafted.</p>
    </div>`;
  }
  const league = career.proLeague;
  const myTeam = teamById(league, career.team);
  const isMinors = career.stage === 'minors';

  const recordCard = `<div class="teamRecordCard" style="--team-accent:${SPORT_META[career.sport].accent}">
    <div class="teamRecordCard__name">${escapeHtml(myTeam.name)}</div>
    <div class="teamRecordCard__sub">${myTeam.conference} · ${myTeam.division} Division</div>
    <div class="teamRecordCard__record">${myTeam.wins}-${myTeam.losses}${myTeam.ties ? '-' + myTeam.ties : ''}</div>
    <div class="teamRecordCard__streak">${myTeam.streak === 0 ? 'No active streak' : (myTeam.streak > 0 ? `W${myTeam.streak} streak` : `L${Math.abs(myTeam.streak)} streak`)}</div>
  </div>`;

  const minorsNote = isMinors ? `<p class="formSection__hint">You're currently grinding in the minors with ${career.minors.affiliateName}. The standings below belong to your parent organization — keep performing well to earn the call-up.</p>` : '';

  const tradeSection = (!isMinors && HAS_TRADES[career.sport]) ? `
    <section class="block">
      <h2 class="block__title">Front Office</h2>
      <div class="actionCard actionCard--compact">
        <p class="actionCard__sub">Not happy with your role? Request a trade — the front office may say no.</p>
        <button class="btn btn--secondary" data-action="request-trade">Request a Trade</button>
      </div>
    </section>` : '';

  const scheduleRows = league.schedule.map((wk, i) => {
    const m = wk.matchups.find(mm => mm.home === career.team || mm.away === career.team);
    if (!m) return '';
    const isHome = m.home === career.team;
    const oppId = isHome ? m.away : m.home;
    const opp = teamById(league, oppId);
    let resultHtml = `<span class="scheduleRow__status">Upcoming</span>`;
    if (m.played) {
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const won = myScore > oppScore, tied = myScore === oppScore;
      resultHtml = `<span class="resultTag ${won ? 'resultTag--win' : tied ? 'resultTag--tie' : 'resultTag--loss'}">${won ? 'W' : tied ? 'T' : 'L'} ${myScore}-${oppScore}</span>`;
    }
    return `<div class="scheduleRow ${i === league.week ? 'scheduleRow--next' : ''}">
      <span class="scheduleRow__wk">Wk ${i + 1}</span>
      <span class="scheduleRow__opp">${isHome ? 'vs' : '@'} ${escapeHtml(opp.name)}</span>
      ${resultHtml}
    </div>`;
  }).join('');

  const divStandings = divisionStandings(league).map(d => `
    <div class="standingsGroup">
      <h3 class="standingsGroup__title">${d.key}</h3>
      ${standingsTableHTML(d.teams, career.team)}
    </div>`).join('');

  const picture = playoffPicture(league);
  const playoffHtml = picture.map(p => `
    <div class="standingsGroup">
      <h3 class="standingsGroup__title">${p.conf} — Playoff Picture</h3>
      <ol class="playoffList">
        ${p.inPlayoffs.map((t, i) => `<li class="${t.id === career.team ? 'playoffList__item--me' : ''}">${i + 1}. ${escapeHtml(t.name)} <span class="playoffList__rec">${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}</span> ${i < 1 ? '<span class="seedTag">Bye</span>' : ''}</li>`).join('')}
        ${p.onBubble.length ? `<li class="playoffList__bubbleLabel">On the bubble:</li>` + p.onBubble.map(t => `<li class="playoffList__bubble ${t.id === career.team ? 'playoffList__item--me' : ''}">${escapeHtml(t.name)} <span class="playoffList__rec">${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}</span></li>`).join('') : ''}
      </ol>
    </div>`).join('');

  return `
    ${recordCard}
    ${minorsNote}
    ${tradeSection}
    <section class="block">
      <h2 class="block__title">Schedule</h2>
      <div class="scheduleList">${scheduleRows}</div>
    </section>
    <section class="block">
      <h2 class="block__title">Division Standings</h2>
      ${divStandings}
    </section>
    <section class="block">
      <h2 class="block__title">Playoff Standings</h2>
      ${playoffHtml}
    </section>
  `;
}
function standingsTableHTML(teams, myTeamId) {
  return `<table class="standingsTable"><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th></tr></thead><tbody>
    ${teams.map(t => `<tr class="${t.id === myTeamId ? 'standingsTable__me' : ''}">
      <td>${escapeHtml(t.name)}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.ties}</td><td>${winPct(t).toFixed(3).replace(/^0/, '')}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderTourTab(career) {
  const sm = SPORT_META[career.sport];
  if (!career.tour) {
    return `<div class="emptyState">
      <span class="emptyState__icon">${sm.icon}</span>
      <p>You haven't turned pro yet. Your ${sm.leagueName} schedule and tour standings will appear here once you do.</p>
    </div>`;
  }
  const tour = career.tour;
  const scheduleRows = tour.schedule.map((ev, i) => {
    let statusHtml = `<span class="scheduleRow__status">Upcoming</span>`;
    if (ev.played) {
      const r = ev.result;
      statusHtml = `<span class="resultTag ${r.place === 1 ? 'resultTag--win' : 'resultTag--neutral'}">${r.place === 1 ? 'WON' : (r.madeCut === false ? 'MC' : ordinal(r.place))}</span>`;
    }
    return `<div class="scheduleRow ${i === tour.eventIndex ? 'scheduleRow--next' : ''}">
      <span class="scheduleRow__wk">${i + 1}</span>
      <span class="scheduleRow__opp">${escapeHtml(ev.name)}</span>
      ${statusHtml}
    </div>`;
  }).join('');

  const totalPoints = career.seasonStats.points || 0;
  const rivalsRanked = tour.rivals.map(rv => ({ name: rv.name, points: rv.seasonPoints || 0 }))
    .concat([{ name: career.name + ' (You)', points: totalPoints, me: true }])
    .sort((a, b) => b.points - a.points);
  const myRank = rivalsRanked.findIndex(r => r.me) + 1;

  const rankTable = `<table class="standingsTable"><thead><tr><th>#</th><th>Name</th><th>Points</th></tr></thead><tbody>
    ${rivalsRanked.slice(0, 10).map((r, i) => `<tr class="${r.me ? 'standingsTable__me' : ''}"><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.points}</td></tr>`).join('')}
    ${myRank > 10 ? `<tr class="standingsTable__me"><td>${myRank}</td><td>${escapeHtml(career.name)} (You)</td><td>${totalPoints}</td></tr>` : ''}
  </tbody></table>`;

  return `
    <div class="teamRecordCard" style="--team-accent:${sm.accent}">
      <div class="teamRecordCard__name">${sm.leagueName}</div>
      <div class="teamRecordCard__sub">Season ${career.season} · Tour Card</div>
      <div class="teamRecordCard__record">Rank #${myRank}</div>
      <div class="teamRecordCard__streak">${totalPoints} points this season</div>
    </div>
    <section class="block">
      <h2 class="block__title">Tour Schedule &amp; Places</h2>
      <div class="scheduleList">${scheduleRows}</div>
    </section>
    <section class="block">
      <h2 class="block__title">Tour Points Standings</h2>
      ${rankTable}
    </section>
  `;
}

/* ----------------------------------------------------------------------
   23. STATS TAB
   ---------------------------------------------------------------------- */
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function derivedColumns(sport, pos, totals) {
    if (sport === 'basketball') {
        // Prevent division by zero
        const g = totals.gp || 1;
        return [
            ['PPG', (totals.pts / g).toFixed(1)],
            ['RPG', (totals.reb / g).toFixed(1)],
            ['APG', (totals.ast / g).toFixed(1)],
            ['SPG', (totals.stl / g).toFixed(1)],
            ['BPG', (totals.blk / g).toFixed(1)]
        ];
    }

    if (sport === 'baseball') {
        if (['SP', 'RP'].includes(pos)) {
            // Pitcher Stats
            const ip = totals.ip || 0;
            const er = totals.er || 0;
            const bb = totals.bb || 0;
            const h = totals.h || 0;

            const era = ip > 0 ? ((er / ip) * 9).toFixed(2) : '0.00';
            const whip = ip > 0 ? ((bb + h) / ip).toFixed(2) : '0.00';

            return [
                ['ERA', era],
                ['WHIP', whip]
            ];
        } else {
            // Hitter Stats
            const ab = totals.ab || 0;
            const h = totals.h || 0;
            const bb = totals.bb || 0;

            // Format to drop the leading zero (e.g., .300 instead of 0.300)
            const avg = ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000';
            const obp = (ab + bb) > 0 ? ((h + bb) / (ab + bb)).toFixed(3).replace(/^0/, '') : '.000';

            return [
                ['AVG', avg],
                ['OBP', obp]
            ];
        }
    }

    if (sport === 'golf') {
        const rds = totals.roundsPlayed || 0;
        return [['SCORING AVG', rds ? (totals.strokesTotal / rds).toFixed(2) : '0.00']];
    }

    return [];
}
function formatStatVal(key, val) {
  if (key === 'earnings') return fmtMoney(val);
  if (key === 'ip') return formatIP(val);
  if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(1);
  return val;
}
function renderStatsTab(career) {
  const sport = career.sport, pos = career.position || 'GEN';
  const fields = statFieldsFor(sport, pos);
  const historicalRows = career.careerStatsLog.map(s => ({
    label: `${s.label}${s.stage ? ` (${capitalize(s.stage)})` : ''}`, totals: s.totals,
  }));
  const currentLabel = career.stage === 'highschool' ? career.highSchool.name
    : career.stage === 'college' ? career.college.name
    : `Current — ${teamNameForCareer(career)}`;
  const rows = [...historicalRows, { label: currentLabel, totals: career.seasonStats, current: true }];

  const careerTotals = {};
  fields.forEach(([k]) => careerTotals[k] = 0);
  rows.forEach(rw => fields.forEach(([k]) => careerTotals[k] += (rw.totals[k] || 0)));

  const derivedHeaders = derivedColumns(sport, pos, careerTotals).map(([l]) => l);

  function tableRowHTML(rw) {
    const derived = derivedColumns(sport, pos, rw.totals);
    return `<tr class="${rw.current ? 'statsTable__current' : ''}">
      <td class="statsTable__label">${escapeHtml(rw.label)}</td>
      ${fields.map(([k]) => `<td>${formatStatVal(k, rw.totals[k] || 0)}</td>`).join('')}
      ${derived.map(([, v]) => `<td>${v}</td>`).join('')}
    </tr>`;
  }

    const table = `<div class="statsTableWrapper"><table class="statsTable">
    <thead>
        <tr class="statsTable__head">
            <th>Year/Team</th>
            ${derivedColumns(sport, pos, careerTotals).map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}
            ${fields.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}
        </tr>
    </thead>
    <tbody>
        ${rows.map(rw => `<tr class="${rw.current ? 'statsTable__current' : ''}">
            <td class="statsTable__label">${escapeHtml(rw.label)}</td>
            ${derivedColumns(sport, pos, rw.totals).map(([, v]) => `<td>${v}</td>`).join('')}
            ${fields.map(([k]) => `<td>${formatStatVal(k, rw.totals[k])}</td>`).join('')}
        </tr>`).join('')}
        <tr class="statsTable__totals">
            <td>Career Totals</td>
            ${derivedColumns(sport, pos, careerTotals).map(([, v]) => `<td>${v}</td>`).join('')}
            ${fields.map(([k]) => `<td>${formatStatVal(k, careerTotals[k])}</td>`).join('')}
        </tr>
    </tbody>
</table></div>`;

  return `
    <section class="block">
      <h2 class="block__title">Stat Log</h2>
      <p class="formSection__hint">${sport === 'bowling' ? 'Tracked PBC-style: tournament average, titles, and tour points.' : sport === 'golf' ? 'Tracked PGC-style: scoring average, cuts made, and tour points.' : 'Season-by-season totals across your whole career.'}</p>
      ${table}
    </section>
  `;
}

/* ----------------------------------------------------------------------
   24. EDIT TAB
   ---------------------------------------------------------------------- */
function renderEditTab(career) {
  return `<div id="editRoot"></div>`;
}
function bindEditTabAfterRender(career) {
  qs('editRoot').innerHTML = editFormHTML(career);
  bindEditEvents(career);
}
function editFormHTML(career) {
  const sm = SPORT_META[career.sport];
  return `
    <div class="creatorLayout">
      <div class="creatorPreview">
        <div class="avatarFrame" id="editAvatarPreview">${buildAvatarSVG({
          skinTone: career.appearance.skinTone, hairStyle: career.appearance.hairStyle, hairColor: career.appearance.hairColor,
          jerseyColor: sm.accent, number: career.number, heightIn: career.heightIn, weightLb: career.weightLb,
        })}</div>
        ${positionLabel(career) ? `<div class="lockedPosition">Position: <strong>${positionLabel(career)}</strong> <span class="lockedPosition__tag">locked</span></div>` : ''}
      </div>
      <form class="creatorForm" id="editForm">
        <section class="formSection">
          <h2 class="formSection__title">Identity</h2>
          <div class="fieldRow">
            <label class="field"><span class="field__label">Name</span><input type="text" id="e-name" maxlength="28" value="${escapeHtml(career.name)}"></label>
            <label class="field field--narrow"><span class="field__label">Number</span><input type="number" id="e-number" min="0" max="99" value="${escapeHtml(String(career.number))}"></label>
          </div>
          <div class="fieldRow">
            <label class="field"><span class="field__label">Gender</span>
              <select id="e-gender">
                <option value="male" ${career.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${career.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="nonbinary" ${career.gender === 'nonbinary' ? 'selected' : ''}>Non-binary</option>
              </select>
            </label>
            <label class="field"><span class="field__label">Birthday <span class="field__hint" id="editAgeDisplay">(age ${ageOf(career)})</span></span><input type="date" id="e-birthday" value="${career.birthday}"></label>
          </div>
          <label class="field"><span class="field__label">Hometown</span><input type="text" id="e-hometown" maxlength="40" value="${escapeHtml(career.hometown)}"></label>
        </section>
        <section class="formSection">
          <h2 class="formSection__title">Physical</h2>
          <label class="field"><span class="field__label">Height <span class="field__hint" id="editHeightLabel">${inToFeet(career.heightIn)}</span></span><input type="range" id="e-height" min="60" max="90" value="${career.heightIn}"></label>
          <label class="field"><span class="field__label">Weight <span class="field__hint" id="editWeightLabel">${career.weightLb} lb</span></span><input type="range" id="e-weight" min="110" max="360" value="${career.weightLb}"></label>
        </section>
        <section class="formSection">
          <h2 class="formSection__title">Appearance</h2>
          <div class="field"><span class="field__label">Skin Tone</span><div class="swatchRow">
            ${SKIN_TONES.map(t => `<button type="button" class="swatch ${career.appearance.skinTone === t ? 'swatch--active' : ''}" style="background:${t}" data-action="edit-pick-skin" data-tone="${t}"></button>`).join('')}
          </div></div>
          <div class="field"><span class="field__label">Hair Style</span><div class="chipRow">
            ${HAIR_STYLES.map(s => `<button type="button" class="chip ${career.appearance.hairStyle === s ? 'chip--active' : ''}" data-action="edit-pick-hairstyle" data-style="${s}">${s}</button>`).join('')}
          </div></div>
          <div class="field"><span class="field__label">Hair Color</span><div class="swatchRow">
            ${HAIR_COLORS.map(c => `<button type="button" class="swatch swatch--sm ${career.appearance.hairColor === c ? 'swatch--active' : ''}" style="background:${c}" data-action="edit-pick-haircolor" data-color="${c}"></button>`).join('')}
          </div></div>
        </section>
        <button type="button" class="btn btn--primary btn--block btn--lg" data-action="edit-save">Save Changes</button>
      </form>
    </div>
    <section class="block dangerZone">
      <h2 class="block__title">Danger Zone</h2>
      <p class="formSection__hint">Deleting a career permanently removes this player and all of their stats. This can't be undone.</p>
      <button class="btn btn--danger" data-action="delete-career-confirm" data-sport="${career.sport}" data-id="${career.id}">Delete This Career</button>
    </section>
  `;
}
function bindEditEvents(career) {
  const sm = SPORT_META[career.sport];
  const refresh = () => {
    qs('editAvatarPreview').innerHTML = buildAvatarSVG({
      skinTone: career.appearance.skinTone, hairStyle: career.appearance.hairStyle, hairColor: career.appearance.hairColor,
      jerseyColor: sm.accent, number: career.number, heightIn: career.heightIn, weightLb: career.weightLb,
    });
  };
  qs('e-name').addEventListener('input', e => { career.name = e.target.value; saveState(); });
  qs('e-number').addEventListener('input', e => { career.number = e.target.value.replace(/[^0-9]/g, '').slice(0, 2); refresh(); saveState(); });
  qs('e-gender').addEventListener('change', e => { career.gender = e.target.value; saveState(); });
  qs('e-hometown').addEventListener('input', e => { career.hometown = e.target.value; saveState(); });
  qs('e-birthday').addEventListener('change', e => { career.birthday = e.target.value; qs('editAgeDisplay').textContent = `(age ${ageOf(career)})`; saveState(); });
  qs('e-height').addEventListener('input', e => { career.heightIn = Number(e.target.value); qs('editHeightLabel').textContent = inToFeet(career.heightIn); refresh(); saveState(); });
  qs('e-weight').addEventListener('input', e => { career.weightLb = Number(e.target.value); qs('editWeightLabel').textContent = `${career.weightLb} lb`; refresh(); saveState(); });
}

/* ----------------------------------------------------------------------
   25. MODAL CONTENT GENERATORS
   ---------------------------------------------------------------------- */
let pendingCollegeOffers = null;

function modalShell(title, bodyHtml, footerHtml) {
  return `<div class="modal__head"><h2>${escapeHtml(title)}</h2><button class="iconBtn" data-action="modal-close" aria-label="Close">✕</button></div>
    <div class="modal__body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal__foot">${footerHtml}</div>` : ''}`;
}

function collegeOffersModalHTML(career, offers) {
  pendingCollegeOffers = offers;
  const cards = offers.map((o, i) => `
    <button class="offerCard" data-action="commit-college" data-index="${i}">
      <div class="offerCard__name">${escapeHtml(o.name)}</div>
      <div class="offerCard__conf">${escapeHtml(o.conference)}</div>
      <div class="offerCard__stars">${'★'.repeat(o.prestige)}${'☆'.repeat(5 - o.prestige)}</div>
    </button>`).join('');
  return modalShell('College Offers', `<p class="modal__hint">Pick where ${escapeHtml(career.name)} commits. Prestige affects nothing mechanically — it's all bragging rights.</p><div class="offerGrid">${cards}</div>`);
}

function draftRevealModalHTML(career, isBaseball) {
  const d = career.draft;
  const team = teamById(career.proLeague, career.team);
  const headline = isBaseball ? `Drafted by the ${team.name} organization` : (d.drafted ? `Drafted by the ${team.name}` : `Signed by the ${team.name} as a free agent`);
  return modalShell(SPORT_META[career.sport].draftLabel || 'Draft Results', `
    <div class="draftReveal">
      <div class="draftReveal__round">Round ${d.round} · Pick ${d.pick}</div>
      <div class="draftReveal__team">${escapeHtml(team.name)}</div>
      <p>${escapeHtml(headline)}.${isBaseball ? ` You'll report to ${escapeHtml(career.minors.affiliateName)} to begin your professional journey.` : ''}</p>
    </div>`, `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Continue</button>`);
}
function turnProModalHTML(career) {
  const sm = SPORT_META[career.sport];
  return modalShell('Welcome to the Tour', `
    <div class="draftReveal">
      <div class="draftReveal__team">${sm.leagueName}</div>
      <p>${escapeHtml(career.name)} has officially turned pro and earned a card on the ${sm.leagueName}. ${career.tour.schedule.length} tournaments await this season.</p>
    </div>`, `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Let's Go</button>`);
}
function tradeAcceptedModalHTML(team) {
  return modalShell('Trade Approved', `<div class="draftReveal"><div class="draftReveal__team">${escapeHtml(team.name)}</div><p>The front office approved your request. Pack your bags — you're headed to the ${escapeHtml(team.name)}.</p></div>`,
    `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Continue</button>`);
}
function callUpModalHTML(career) {
  const team = teamById(career.proLeague, career.team);
  return modalShell('Call-Up!', `<div class="draftReveal"><div class="draftReveal__team">${escapeHtml(team.name)}</div><p>${escapeHtml(career.name)} has been called up to the Majors. Time to prove it at the highest level.</p></div>`,
    `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Continue</button>`);
}
function seasonRecapModalHTML(career, playoffResult) {
  const team = teamById(career.proLeague, career.team);
  return modalShell(`Season ${career.season} Recap`, `
    <div class="draftReveal">
      <div class="draftReveal__team">${escapeHtml(team.name)}</div>
      <div class="draftReveal__round">${team.wins}-${team.losses}${team.ties ? '-' + team.ties : ''}</div>
      <p>${escapeHtml(playoffResult.summary)}</p>
    </div>`, `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Continue</button>`);
}
function tourSeasonRecapModalHTML(career) {
  return modalShell(`Season ${career.season} Recap`, `
    <div class="draftReveal">
      <div class="draftReveal__team">${SPORT_META[career.sport].leagueName}</div>
      <div class="draftReveal__round">${career.seasonStats.points || 0} tour points</div>
      <p>Earnings this season: ${fmtMoney(career.seasonStats.earnings || 0)}</p>
    </div>`, `<button class="btn btn--primary btn--block" data-action="close-and-refresh">Continue</button>`);
}
function deleteConfirmModalHTML(sport, id, name) {
  return modalShell('Delete Career', `<p>Are you sure you want to permanently delete <strong>${escapeHtml(name)}</strong>? All stats and progress will be lost — this can't be undone.</p>`,
    `<button class="btn btn--ghost" data-action="modal-close">Cancel</button>
     <button class="btn btn--danger" data-action="delete-career-execute" data-sport="${sport}" data-id="${id}">Delete Forever</button>`);
}

/* ----------------------------------------------------------------------
   26. ACTION DISPATCHER
   ---------------------------------------------------------------------- */
function handleAction(action, btn) {
  const sport = currentSportFromRoute();

  switch (action) {
    /* ---- navigation ---- */
    case 'nav-back': window.history.back(); return;
    case 'goto-sport': navigate(`#/sport/${btn.dataset.sport}`); return;
    case 'goto-new-career': navigate(`#/sport/${btn.dataset.sport}/new`); return;
    case 'goto-career': navigate(`#/career/${btn.dataset.sport}/${btn.dataset.id}`); return;
    case 'goto-career-tab': navigate(`#/career/${btn.dataset.sport}/${btn.dataset.id}/${btn.dataset.tab}`); return;
    case 'modal-close': closeModal(); return;
    case 'close-and-refresh': closeModal(); rerenderCurrentRoute(); return;

    /* ---- delete ---- */
    case 'delete-career-confirm': {
      const c = getCareer(btn.dataset.sport, btn.dataset.id);
      openModal(deleteConfirmModalHTML(btn.dataset.sport, btn.dataset.id, c ? c.name : 'this player'));
      return;
    }
    case 'delete-career-execute': {
      deleteCareer(btn.dataset.sport, btn.dataset.id);
      closeModal();
      toast('Career deleted.', 'info');
      navigate(`#/sport/${btn.dataset.sport}`);
      return;
    }

    /* ---- creator ---- */
    case 'creator-pick-position': creatorState.position = btn.dataset.pos; {
      const b = posInfo(sport, btn.dataset.pos); creatorState.heightIn = b.h; creatorState.weightLb = b.w;
      refreshCreatorForm(sport);
    } return;
    case 'creator-randomize': randomizeCreatorState(sport); refreshCreatorForm(sport); return;
    case 'creator-reroll-hometown': creatorState.hometown = randomHometown(); qs('f-hometown').value = creatorState.hometown; return;
    case 'creator-pick-skin': creatorState.appearance.skinTone = btn.dataset.tone; refreshCreatorForm(sport); return;
    case 'creator-pick-hairstyle': creatorState.appearance.hairStyle = btn.dataset.style; refreshCreatorForm(sport); return;
    case 'creator-pick-haircolor': creatorState.appearance.hairColor = btn.dataset.color; refreshCreatorForm(sport); return;
    case 'creator-submit': {
      const name = (creatorState.name || '').trim();
      if (!name) { toast('Please enter a name.', 'error'); qs('f-name').focus(); return; }
      if (HAS_POSITIONS[sport] && !creatorState.position) { toast('Please choose a position.', 'error'); return; }
      creatorState.name = name;
      const career = createCareer(sport, creatorState);
      STATE.careers[sport].push(career);
      saveState();
      toast(`${career.name} is ready for high school.`, 'success');
      navigate(`#/career/${sport}/${career.id}`);
      return;
    }

    /* ---- edit ---- */
    case 'edit-pick-skin': { const c = currentCareerFromRoute(); c.appearance.skinTone = btn.dataset.tone; saveState(); bindEditTabAfterRender(c); return; }
    case 'edit-pick-hairstyle': { const c = currentCareerFromRoute(); c.appearance.hairStyle = btn.dataset.style; saveState(); bindEditTabAfterRender(c); return; }
    case 'edit-pick-haircolor': { const c = currentCareerFromRoute(); c.appearance.hairColor = btn.dataset.color; saveState(); bindEditTabAfterRender(c); return; }
    case 'edit-save': {
      const c = currentCareerFromRoute(); saveState(); toast('Changes saved.', 'success');
      navigate(`#/career/${c.sport}/${c.id}/overview`);
      return;
    }

    /* ---- attributes ---- */
    case 'upgrade-attr': {
      const c = currentCareerFromRoute();
      const attr = decodeURIComponent(btn.dataset.attr);
      if (upgradeAttribute(c, attr)) rerenderCurrentRoute();
      else toast('Not enough skill points.', 'error');
      return;
    }

    /* ---- high school / college ---- */
    case 'sim-hs-game': { const c = currentCareerFromRoute(); simulateHighSchoolGame(c); rerenderCurrentRoute(); return; }
    case 'open-college-offers': { const c = currentCareerFromRoute(); openModal(collegeOffersModalHTML(c, generateCollegeOffers(4))); return; }
    case 'commit-college': {
      const c = currentCareerFromRoute();
      const offer = pendingCollegeOffers[Number(btn.dataset.index)];
      commitToCollege(c, offer);
      closeModal();
      toast(`Committed to ${offer.name}!`, 'success');
      rerenderCurrentRoute();
      return;
    }
    case 'sim-college-game': { const c = currentCareerFromRoute(); simulateCollegeGame(c); rerenderCurrentRoute(); return; }

    /* ---- draft / turn pro ---- */
    case 'do-draft': { const c = currentCareerFromRoute(); runDraft(c); openModal(draftRevealModalHTML(c, false)); return; }
    case 'do-draft-baseball': { const c = currentCareerFromRoute(); runDraftBaseball(c); openModal(draftRevealModalHTML(c, true)); return; }
    case 'do-turnpro': { const c = currentCareerFromRoute(); declareTurnPro(c); openModal(turnProModalHTML(c)); return; }

    /* ---- minors ---- */
    case 'sim-minors-game': {
      const c = currentCareerFromRoute();
      const count = Number(btn.dataset.count || 1);
      let calledUp = false;
      for (let i = 0; i < count; i++) {
        if (c.stage !== 'minors') break;
        const res = simulateMinorsGame(c);
        if (res.calledUp) { calledUp = true; break; }
      }
      if (calledUp) openModal(callUpModalHTML(c));
      rerenderCurrentRoute();
      return;
    }

    /* ---- pro team sports ---- */
    case 'sim-pro-game': {
      const c = currentCareerFromRoute();
      const count = Number(btn.dataset.count || 1);
      let lastRes = null;
      for (let i = 0; i < count; i++) {
        if (c.stage !== 'pro' || c.proLeague.complete) break;
        lastRes = simulateProGame(c);
        if (!lastRes) break;
        if (lastRes.seasonOver) break;
      }
      rerenderCurrentRoute();
      if (lastRes && lastRes.seasonOver) openModal(seasonRecapModalHTML(c, lastRes.playoffResult));
      return;
    }
    case 'start-new-pro-season': { const c = currentCareerFromRoute(); startNewProSeason(c); rerenderCurrentRoute(); toast(`Season ${c.season} underway!`, 'success'); return; }
    case 'request-trade': {
      const c = currentCareerFromRoute();
      const res = requestTrade(c);
      if (!res.ok) { toast(`Wait ${res.gamesLeft} more game${res.gamesLeft === 1 ? '' : 's'} before requesting again.`, 'error'); return; }
      if (res.accepted) { openModal(tradeAcceptedModalHTML(res.team)); rerenderCurrentRoute(); }
      else { toast('Trade request denied by the front office.', 'error'); rerenderCurrentRoute(); }
      return;
    }

    /* ---- tour (bowling / golf) ---- */
    case 'sim-tour-event': {
      const c = currentCareerFromRoute();
      const count = Number(btn.dataset.count || 1);
      let seasonOver = false;
      for (let i = 0; i < count; i++) {
        if (c.stage !== 'tour' || c.tour.eventIndex >= c.tour.schedule.length) break;
        const res = simulateTourEventForCareer(c);
        if (!res) break;
        if (res.seasonOver) { seasonOver = true; break; }
      }
      rerenderCurrentRoute();
      if (seasonOver) openModal(tourSeasonRecapModalHTML(c));
      return;
    }
    case 'start-new-tour-season': { const c = currentCareerFromRoute(); startNewTourSeason(c); rerenderCurrentRoute(); toast(`Season ${c.season} underway!`, 'success'); return; }

    default: return;
  }
}

/* ----------------------------------------------------------------------
   27. INIT
   ---------------------------------------------------------------------- */
function init() {
  router();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
