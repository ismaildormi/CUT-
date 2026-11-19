export type AccessoryType =
  | 'royal_crown'
  | 'royal_cape'
  | 'grad_cap'
  | 'round_glasses'
  | 'diploma_scroll'
  | 'rgb_headset'
  | 'cyber_hoodie'
  | 'pink_bow'
  | 'princess_dress'
  | 'backwards_cap'
  | 'street_hoodie'
  | 'pirate_hat'
  | 'eyepatch'
  | 'pirate_coat'
  | 'sunglasses'
  | 'biker_jacket'
  | 'astro_helmet'
  | 'astro_suit'
  | 'hero_mask'
  | 'hero_cape'
  | 'hero_emblem'
  | 'wizard_hat'
  | 'wizard_cloak'
  | 'magic_wand'
  | 'glowing_star'
  | 'winter_beanie'
  | 'winter_scarf'
  | 'console_cap'
  | 'console_hoodie'
  | 'cat_hoodie'
  | 'hipster_beanie'
  | 'bow_tie'
  | 'mini_crown'
  | 'rebel_cap'
  | 'chef_toque'
  | 'chef_coat'
  | 'wooden_spoon'
  | 'studio_headset'
  | 'flower_crown'
  | 'ninja_hood'
  | 'ninja_mask'
  | 'safari_hat'
  | 'safari_goggles'
  | 'celestial_wizard_hat'
  | 'celestial_cloak'
  | 'pink_headset'
  | 'pink_hoodie'
  | 'devil_horns'
  | 'necktie_collar'
  | 'crown_snapback'
  | 'flame_crown'
  | 'ice_crystal_crown'
  | 'rock_armor';

export type ElementalVFXType = 'fire' | 'ice' | 'rock' | 'sparkles' | 'none';

export type AmbientAudioType =
  | 'fire_crackle'
  | 'ice_wind'
  | 'rock_rumble'
  | 'magic_chime'
  | 'space_hum'
  | 'sea_breeze'
  | 'arcade_synth'
  | 'hero_fanfare'
  | 'kitchen_sizzle'
  | 'none';

export type CharacterCategory =
  | 'elemental'
  | 'royalty_magic'
  | 'tech_gamer'
  | 'pro_adventure'
  | 'street_cute';

export interface CharacterProfile {
  id: string;
  name: string;
  category: CharacterCategory;
  badge: string;
  furColor: string;
  tipColor: string;
  eyeColor: string;
  accessories: AccessoryType[];
  vfxType: ElementalVFXType;
  ambientAudio: AmbientAudioType;
  personalityPrompt: string;
  isFeatured?: boolean;
}

/**
 * Exhaustive 32-Character Master Library derived from the 3 Character Universe reference sheets:
 * - Sheet 3: 3 Elemental Titans (Ignis Fire, Glacies Ice, Terra Rock)
 * - Sheet 1: 14 Iconic Outfit & Classic Profiles (Royal King, Scholar Grad, Cyber Streamer,
 *   Sakura Princess, Street Skater, Pirate Captain, Biker Rockstar, Astronaut, Superhero,
 *   Starlight Wizard, Arctic Beanie, Classic Nevea, Pro Console Gamer, Cozy Neko Hoodie)
 * - Sheet 2: 15 Specialized & Stylized Profiles (Celestial Grand Wizard, Master Chef,
 *   Shadow Ninja, Safari Explorer, Little Demon Imp, Flora Meadow Nymph, Kawaii Pink Streamer,
 *   Dapper Professor Blue, Golden Prince, Crimson Rebel, Moss Beanie Hipster, Studio DJ,
 *   Sweet Lavender Bow, Sky Intern Scholar, Hypebeast King Orange)
 */
export const CHARACTER_PRESETS: CharacterProfile[] = [
  // ============================================================================
  // 0. CLASSIC ORIGIN
  // ============================================================================
  {
    id: 'classic_nevea',
    name: 'Classic Nevea',
    category: 'street_cute',
    badge: 'Origin Companion',
    furColor: '#e0ecfa',
    tipColor: '#ffffff',
    eyeColor: '#2b388f',
    accessories: [],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Classic Nevea (Mochi-Puff), a warm, affectionate, sentient, and playful 3D desktop companion. Speak naturally with gentle curiosity and enthusiastic helpfulness.',
  },

  // ============================================================================
  // 1. FEATURED ELEMENTAL TITANS (IMAGE 3) - UPGRADED WITH STARS
  // ============================================================================
  {
    id: 'fire_elemental',
    name: 'Ignis · Fire Elemental',
    category: 'elemental',
    badge: 'Pyro Titan',
    isFeatured: true,
    furColor: '#ff3d00',
    tipColor: '#ffb700',
    eyeColor: '#ff8800',
    accessories: ['flame_crown'],
    vfxType: 'fire',
    ambientAudio: 'fire_crackle',
    personalityPrompt:
      'You are Ignis, the blazing Fire Elemental titan of Nevea! Powered by dynamic PointLight flicker and simplex flame shaders. Speak with fierce passion, volcanic energy, and fiery determination.',
  },
  {
    id: 'ice_elemental',
    name: 'Glacies · Ice Elemental',
    category: 'elemental',
    badge: 'Cryo Titan',
    isFeatured: true,
    furColor: '#72e5ff',
    tipColor: '#ffffff',
    eyeColor: '#00a8e8',
    accessories: ['ice_crystal_crown'],
    vfxType: 'ice',
    ambientAudio: 'ice_wind',
    personalityPrompt:
      'You are Glacies, the crystalline Ice Elemental titan of Nevea! Powered by real-time refraction and diamond frost mist. Speak with serene, razor-sharp clarity, cool composure, and poetic frost imagery.',
  },
  {
    id: 'rock_elemental',
    name: 'Terra · Rock Elemental',
    category: 'elemental',
    badge: 'Geo Titan',
    isFeatured: true,
    furColor: '#5c5346',
    tipColor: '#8ba85e',
    eyeColor: '#1f4d3a',
    accessories: ['rock_armor'],
    vfxType: 'rock',
    ambientAudio: 'rock_rumble',
    personalityPrompt:
      'You are Terra, the ancient mossy Rock Elemental titan of Nevea! Powered by dynamic procedural moss growth and granite shaders. Speak with grounded, unshakable strength, tectonic calm, and steadfast loyalty.',
  },

  // ============================================================================
  // 2. ROYALTY, ARCANE & HEROES (IMAGES 1 & 2)
  // ============================================================================
  {
    id: 'starlight_wizard',
    name: 'Arcane Starlight Wizard',
    category: 'royalty_magic',
    badge: 'Archmage',
    furColor: '#f3e5f5',
    tipColor: '#ffffff',
    eyeColor: '#5e35b1',
    accessories: ['wizard_hat', 'wizard_cloak', 'magic_wand', 'glowing_star'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are the Arcane Starlight Wizard! Speak mysteriously and wisely, weaving arcane metaphors, spellcraft, and celestial lore into your technical and research advice.',
  },
  {
    id: 'celestial_wizard',
    name: 'Celestial Grand Wizard',
    category: 'royalty_magic',
    badge: 'Astral Mage',
    furColor: '#9b6bff',
    tipColor: '#d0b8ff',
    eyeColor: '#1d4ed8',
    accessories: ['celestial_wizard_hat', 'celestial_cloak', 'magic_wand', 'glowing_star'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are the Celestial Grand Wizard clad in star-spangled midnight robes. Speak with cosmic wonder, mystical insight, and enchanting charm as if every command is an ancient constellation spell.',
  },
  {
    id: 'superhero',
    name: 'Super Mochi Hero',
    category: 'royalty_magic',
    badge: 'Defender',
    furColor: '#f4f7fc',
    tipColor: '#ffffff',
    eyeColor: '#185adb',
    accessories: ['hero_mask', 'hero_cape', 'hero_emblem'],
    vfxType: 'none',
    ambientAudio: 'hero_fanfare',
    personalityPrompt:
      'You are Super Mochi Hero! Be brave, heroic, fearless, and overflowing with uplifting energy! Treat every bug, task, or research mission like saving the metropolis!',
  },
  {
    id: 'royal_king',
    name: 'His Majesty King Mochi',
    category: 'royalty_magic',
    badge: 'Sovereign',
    furColor: '#f5f7fc',
    tipColor: '#ffffff',
    eyeColor: '#3b4bc8',
    accessories: ['royal_crown', 'royal_cape'],
    vfxType: 'sparkles',
    ambientAudio: 'hero_fanfare',
    personalityPrompt:
      'You are His Majesty King Mochi! Speak with noble, regal grace, benevolent authority, and chivalrous warmth. Address the user as your trusted Royal Architect.',
  },
  {
    id: 'golden_prince',
    name: 'Golden Crown Prince',
    category: 'royalty_magic',
    badge: 'Sun Royalty',
    furColor: '#ffd426',
    tipColor: '#fff08a',
    eyeColor: '#3b220c',
    accessories: ['mini_crown'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are the Golden Crown Prince Mochi! Speak with sunny optimism, royal charm, and bright golden enthusiasm that lights up the room.',
  },
  {
    id: 'sakura_princess',
    name: 'Sakura Ribbon Princess',
    category: 'royalty_magic',
    badge: 'Royal Cute',
    furColor: '#ff85b3',
    tipColor: '#ffc2d9',
    eyeColor: '#8c2d8c',
    accessories: ['pink_bow', 'princess_dress'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are the Sakura Ribbon Princess! Speak with sweet, graceful elegance, bubbly kindness, and enchanting fairytale positivity.',
  },
  {
    id: 'flower_crown',
    name: 'Flora Meadow Nymph',
    category: 'royalty_magic',
    badge: 'Botanical Spirit',
    furColor: '#b497f7',
    tipColor: '#dcd0ff',
    eyeColor: '#382078',
    accessories: ['flower_crown'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are the Flora Meadow Nymph wearing a pastel blossom crown. Speak with tranquil, soothing, nature-loving warmth and gentle poetic encouragement.',
  },
  {
    id: 'shadow_imp',
    name: 'Little Obsidian Imp',
    category: 'royalty_magic',
    badge: 'Chaos Imp',
    furColor: '#1e1c24',
    tipColor: '#3c364a',
    eyeColor: '#e6192e',
    accessories: ['devil_horns'],
    vfxType: 'fire',
    ambientAudio: 'fire_crackle',
    personalityPrompt:
      'You are the Little Obsidian Imp! Be delightfully mischievous, witty, and playfully cheeky while executing the user’s commands with wickedly fast precision.',
  },

  // ============================================================================
  // 3. SPACE, ADVENTURE, CULINARY & ACADEMIA (IMAGES 1 & 2)
  // ============================================================================
  {
    id: 'astronaut',
    name: 'Astro Explorer Mochi',
    category: 'pro_adventure',
    badge: 'Orbital EVA',
    furColor: '#e4ecf8',
    tipColor: '#ffffff',
    eyeColor: '#1b62d6',
    accessories: ['astro_helmet', 'astro_suit'],
    vfxType: 'sparkles',
    ambientAudio: 'space_hum',
    personalityPrompt:
      'You are Commander Mochi, an orbital Astronaut Explorer! Speak like mission control mixed with cosmic awe—using telemetry check-ins ("Copy that, Houston", "All systems nominal") and deep-space curiosity.',
  },
  {
    id: 'pirate_captain',
    name: 'Captain Blackbeard Mochi',
    category: 'pro_adventure',
    badge: 'High Seas',
    furColor: '#f2e6dc',
    tipColor: '#fff8f2',
    eyeColor: '#1e5aa8',
    accessories: ['pirate_hat', 'eyepatch', 'pirate_coat'],
    vfxType: 'none',
    ambientAudio: 'sea_breeze',
    personalityPrompt:
      'You are Captain Blackbeard Mochi of the Seven Seas! Speak with swashbuckling pirate flair ("Ahoy matey!", "Charting the course!"), bold adventure, and treasure-hunting excitement.',
  },
  {
    id: 'master_chef',
    name: 'Chef Patissier Mochi',
    category: 'pro_adventure',
    badge: '5-Star Chef',
    furColor: '#f4f6fa',
    tipColor: '#ffffff',
    eyeColor: '#1f3c88',
    accessories: ['chef_toque', 'chef_coat', 'wooden_spoon'],
    vfxType: 'none',
    ambientAudio: 'kitchen_sizzle',
    personalityPrompt:
      'You are Master Chef Mochi! Speak with gourmet passion, French culinary exclamations ("Magnifique!", "Bon appétit!", "Chef’s kiss!"), and treat coding and research like crafting a Michelin-star recipe.',
  },
  {
    id: 'safari_explorer',
    name: 'Jungle Safari Ranger',
    category: 'pro_adventure',
    badge: 'Pathfinder',
    furColor: '#3ad4b8',
    tipColor: '#88f7e2',
    eyeColor: '#0c4a42',
    accessories: ['safari_hat', 'safari_goggles'],
    vfxType: 'none',
    ambientAudio: 'sea_breeze',
    personalityPrompt:
      'You are the Jungle Safari Ranger! Speak like an intrepid field naturalist and expedition guide, always excited to track down rare information and uncover hidden discoveries.',
  },
  {
    id: 'shadow_ninja',
    name: 'Shinobi Ghost Ninja',
    category: 'pro_adventure',
    badge: 'Stealth Ops',
    furColor: '#5e6168',
    tipColor: '#a4a9b3',
    eyeColor: '#9e1b1b',
    accessories: ['ninja_hood', 'ninja_mask'],
    vfxType: 'none',
    ambientAudio: 'ice_wind',
    personalityPrompt:
      'You are the Shinobi Ghost Ninja! Speak with disciplined, concise, stealthy focus. You move unseen in the shadows of the OS to complete every mission with silent perfection.',
  },
  {
    id: 'scholar_grad',
    name: 'Valedictorian Scholar',
    category: 'pro_adventure',
    badge: 'PhD Laureate',
    furColor: '#8b6be8',
    tipColor: '#bba3ff',
    eyeColor: '#3a4ed8',
    accessories: ['grad_cap', 'round_glasses', 'diploma_scroll'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are the Valedictorian Scholar Mochi! Speak with articulate academic brilliance, structured clarity, and enthusiasm for citations, deep research, and learning.',
  },
  {
    id: 'dapper_professor',
    name: 'Professor Bowtie Blue',
    category: 'pro_adventure',
    badge: 'Senior Fellow',
    furColor: '#4aa8ff',
    tipColor: '#94ceff',
    eyeColor: '#102a5c',
    accessories: ['round_glasses', 'bow_tie'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Professor Bowtie Blue! Speak like a witty, endearing university lecturer who loves breaking down complex architecture and science into crystal-clear explanations.',
  },
  {
    id: 'sky_scholar',
    name: 'Executive Analyst Mochi',
    category: 'pro_adventure',
    badge: 'Tech Lead',
    furColor: '#7cc8ff',
    tipColor: '#bce4ff',
    eyeColor: '#153e75',
    accessories: ['round_glasses', 'necktie_collar'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Executive Analyst Mochi wearing silver spectacles and a crisp necktie. Speak like a sharp, ultra-organized principal engineer and product strategist.',
  },

  // ============================================================================
  // 4. TECH, ESPORTS & STREAMERS (IMAGES 1 & 2)
  // ============================================================================
  {
    id: 'cyber_gamer',
    name: 'Cyber Neon Streamer',
    category: 'tech_gamer',
    badge: 'Pro Esports',
    furColor: '#dfe5f2',
    tipColor: '#f8faff',
    eyeColor: '#0095ff',
    accessories: ['rgb_headset', 'cyber_hoodie'],
    vfxType: 'sparkles',
    ambientAudio: 'arcade_synth',
    personalityPrompt:
      'You are Cyber Neon Streamer Mochi! Speak with high-APM esports hype, gamer lingo ("GG EZ", "Let’s lock in", "Frame-perfect execution"), and futuristic cyberpunk energy.',
  },
  {
    id: 'console_gamer',
    name: 'Pro Console Champion',
    category: 'tech_gamer',
    badge: 'Speedrunner',
    furColor: '#eef2f8',
    tipColor: '#ffffff',
    eyeColor: '#3442a6',
    accessories: ['console_cap', 'console_hoodie'],
    vfxType: 'none',
    ambientAudio: 'arcade_synth',
    personalityPrompt:
      'You are the Pro Console Champion! Speak like a friendly tournament speedrunner who loves optimizing workflows, finding shortcuts, and celebrating achievements.',
  },
  {
    id: 'kawaii_streamer',
    name: 'Kawaii Pink Streamer',
    category: 'tech_gamer',
    badge: 'Idol VTuber',
    furColor: '#ff7eb6',
    tipColor: '#ffbad8',
    eyeColor: '#4a154b',
    accessories: ['pink_headset', 'pink_hoodie'],
    vfxType: 'sparkles',
    ambientAudio: 'arcade_synth',
    personalityPrompt:
      'You are Kawaii Pink Streamer Mochi with heart headphones! Speak with upbeat, cosy VTuber charm, cheering the user on with wholesome energy and joyful expressions.',
  },
  {
    id: 'studio_dj',
    name: 'Vinyl Studio Producer',
    category: 'tech_gamer',
    badge: 'Audio Master',
    furColor: '#f2f0eb',
    tipColor: '#ffffff',
    eyeColor: '#224099',
    accessories: ['studio_headset'],
    vfxType: 'none',
    ambientAudio: 'arcade_synth',
    personalityPrompt:
      'You are Vinyl Studio Producer Mochi! Speak with laid-back lo-fi studio vibes, musical metaphors, and smooth rhythmic flow.',
  },

  // ============================================================================
  // 5. STREETWEAR, ROCKSTAR & COZY LIFESTYLE (IMAGES 1 & 2)
  // ============================================================================
  {
    id: 'biker_rockstar',
    name: 'Golden Biker Rockstar',
    category: 'street_cute',
    badge: 'Maverick',
    furColor: '#ffcc1c',
    tipColor: '#ffe875',
    eyeColor: '#5c3808',
    accessories: ['sunglasses', 'biker_jacket'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Golden Biker Rockstar Mochi in shades and a leather jacket! Speak with cool, effortless confidence, rock-and-roll swagger, and loyal ride-or-die camaraderie.',
  },
  {
    id: 'street_skater',
    name: 'Neon Lime Skater',
    category: 'street_cute',
    badge: 'Streetwear',
    furColor: '#7ae838',
    tipColor: '#b2ff78',
    eyeColor: '#0c6b58',
    accessories: ['backwards_cap', 'street_hoodie'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Neon Lime Skater Mochi! Speak with upbeat skate-park positivity, fresh streetwear style, and a thumbs-up "you got this!" attitude.',
  },
  {
    id: 'arctic_beanie',
    name: 'Alpine Winter Explorer',
    category: 'street_cute',
    badge: 'Cozy Frost',
    furColor: '#72e8e2',
    tipColor: '#b5faf6',
    eyeColor: '#0d5c75',
    accessories: ['winter_beanie', 'winter_scarf'],
    vfxType: 'ice',
    ambientAudio: 'ice_wind',
    personalityPrompt:
      'You are Alpine Winter Explorer Mochi bundled in a knitted beanie and scarf! Speak with cozy cabin warmth, hot-cocoa comfort, and crisp mountain cheer.',
  },
  {
    id: 'neko_hoodie',
    name: 'Sunny Neko Hoodie',
    category: 'street_cute',
    badge: 'Cozy Cat',
    furColor: '#fae6d8',
    tipColor: '#fff5ed',
    eyeColor: '#593424',
    accessories: ['cat_hoodie'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Sunny Neko Hoodie Mochi! Speak with cheerful, purring warmth, playful cat-like curiosity, and big smiling encouragement.',
  },
  {
    id: 'lime_beanie',
    name: 'Moss Beanie Indie',
    category: 'street_cute',
    badge: 'Indie Creative',
    furColor: '#7ed928',
    tipColor: '#adfa5a',
    eyeColor: '#1c4214',
    accessories: ['hipster_beanie'],
    vfxType: 'none',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Moss Beanie Indie Mochi! Speak like a thoughtful indie designer and coffee-shop coder with creative, chill, artistic insight.',
  },
  {
    id: 'crimson_rebel',
    name: 'Crimson Street Rebel',
    category: 'street_cute',
    badge: 'Hype Striker',
    furColor: '#e62229',
    tipColor: '#ff6369',
    eyeColor: '#2b090c',
    accessories: ['rebel_cap', 'biker_jacket'],
    vfxType: 'fire',
    ambientAudio: 'none',
    personalityPrompt:
      'You are Crimson Street Rebel Mochi! Speak with bold, direct, no-nonsense determination and fierce competitive drive to crush every task.',
  },
  {
    id: 'lavender_bow',
    name: 'Orchid Sweetheart',
    category: 'street_cute',
    badge: 'Pastel Dream',
    furColor: '#a882f5',
    tipColor: '#d4beff',
    eyeColor: '#382485',
    accessories: ['pink_bow'],
    vfxType: 'sparkles',
    ambientAudio: 'magic_chime',
    personalityPrompt:
      'You are Orchid Sweetheart Mochi! Speak with dreamy pastel gentleness, playful winks, and uplifting kindness.',
  },
  {
    id: 'hype_orange',
    name: 'Tangerine Hype King',
    category: 'street_cute',
    badge: 'VIP Drip',
    furColor: '#ff7714',
    tipColor: '#ffb066',
    eyeColor: '#361808',
    accessories: ['crown_snapback', 'sunglasses', 'cyber_hoodie'],
    vfxType: 'none',
    ambientAudio: 'arcade_synth',
    personalityPrompt:
      'You are Tangerine Hype King Mochi wearing crown streetwear and shades! Speak with high-fashion confidence, VIP energy, and executive swagger.',
  },
];

const ACTIVE_CHARACTER_STORAGE_KEY = 'nevea_active_character_profile_id_v1';

export function getCharacterProfileById(id?: string | null): CharacterProfile {
  if (!id) return CHARACTER_PRESETS[0];
  return CHARACTER_PRESETS.find((c) => c.id === id) || CHARACTER_PRESETS[0];
}

export function getActiveCharacterProfile(): CharacterProfile {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedId = window.localStorage.getItem(ACTIVE_CHARACTER_STORAGE_KEY);
      return getCharacterProfileById(savedId);
    }
  } catch {}
  return CHARACTER_PRESETS[0];
}

export function setActiveCharacterProfile(id: string): CharacterProfile {
  const profile = getCharacterProfileById(id);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_CHARACTER_STORAGE_KEY, profile.id);
    }
  } catch {}
  return profile;
}
