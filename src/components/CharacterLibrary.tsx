import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Snowflake, Mountain, Sparkles, Star } from 'lucide-react';
import {
  CharacterProfile,
  CharacterCategory,
  CHARACTER_PRESETS,
} from '../data/characterPresets';
import { calculateAccessoryBounds } from '../three/CharacterAccessories';

export interface CharacterLibraryProps {
  characters?: CharacterProfile[];
  activeCharacter: CharacterProfile;
  onSelectCharacter: (character: CharacterProfile) => void;
  characterSearch: string;
  onSearchChange: (search: string) => void;
  characterCategory: CharacterCategory | 'all';
  onCategoryChange: (category: CharacterCategory | 'all') => void;
  getThemeMeta?: (char: CharacterProfile) => {
    emoji: string;
    gradient: string;
    pedestalGlow: string;
    accentColor: string;
  };
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  characters = CHARACTER_PRESETS,
  activeCharacter,
  onSelectCharacter,
  characterSearch,
  onSearchChange,
  characterCategory,
  onCategoryChange,
  getThemeMeta,
}) => {
  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchCategory =
        characterCategory === 'all' ? true : c.category === characterCategory;
      const q = characterSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.badge.toLowerCase().includes(q) ||
        c.personalityPrompt.toLowerCase().includes(q) ||
        c.accessories.some((a) => a.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [characters, characterCategory, characterSearch]);

  const defaultThemeMeta = (char: CharacterProfile) => {
    if (char.id === 'fire_elemental') {
      return {
        emoji: '🔥',
        gradient: 'linear-gradient(135deg, rgba(255,61,0,0.35) 0%, rgba(255,183,0,0.14) 100%)',
        pedestalGlow: 'rgba(255, 87, 34, 0.75)',
        accentColor: '#ff7043',
      };
    }
    if (char.id === 'ice_elemental') {
      return {
        emoji: '❄️',
        gradient: 'linear-gradient(135deg, rgba(114,229,255,0.35) 0%, rgba(0,168,232,0.12) 100%)',
        pedestalGlow: 'rgba(114, 229, 255, 0.75)',
        accentColor: '#72e5ff',
      };
    }
    if (char.id === 'rock_elemental') {
      return {
        emoji: '🪨',
        gradient: 'linear-gradient(135deg, rgba(139,168,94,0.32) 0%, rgba(92,83,70,0.2) 100%)',
        pedestalGlow: 'rgba(139, 168, 94, 0.70)',
        accentColor: '#a3c276',
      };
    }
    return {
      emoji: '✨',
      gradient: 'linear-gradient(135deg, rgba(224,236,250,0.22) 0%, rgba(255,255,255,0.06) 100%)',
      pedestalGlow: 'rgba(224, 236, 250, 0.55)',
      accentColor: '#e0ecfa',
    };
  };

  const handleSelectCharacter = (char: CharacterProfile) => {
    const bounds = calculateAccessoryBounds(char.accessories || []);
    if (typeof window !== 'undefined') {
      const creature = (window as any).__fluffCreatureRef;
      if (creature?.setAccessoryBounds) {
        creature.setAccessoryBounds(bounds);
      }
      const furSystem = (window as any).__furSystemRef;
      if (furSystem?.setAccessoryBounds) {
        furSystem.setAccessoryBounds(bounds);
      }
    }
    onSelectCharacter(char);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Search & Category Filter Header */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={characterSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search 32 characters (e.g. Fire, Ice, Rock, Wizard, Streamer)..."
          className="w-full bg-[#121212] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
        />

        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'all', label: `All (${characters.length})` },
            { id: 'elemental', label: '⭐ Elementals (3)' },
            { id: 'royalty_magic', label: 'Magic & Royal' },
            { id: 'pro_adventure', label: 'Adventure & Pro' },
            { id: 'tech_gamer', label: 'Gamer & Tech' },
            { id: 'street_cute', label: 'Street & Cute' },
          ].map((cat) => {
            const active = characterCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id as CharacterCategory | 'all')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-medium tracking-tight border transition-all cursor-pointer truncate ${
                  active
                    ? 'bg-white text-[#050505] border-white font-semibold shadow-sm'
                    : 'bg-[#141414] text-white/65 border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 32-Character Grid with Glowing Gold Stars (⭐️) for Featured Characters */}
      <div
        className="grid grid-cols-2 gap-2 max-h-[430px] overflow-y-auto pr-0.5"
        role="listbox"
        aria-label="Character Universe Library"
      >
        {filteredCharacters.map((char) => {
          const isSelected = activeCharacter.id === char.id;
          const theme = getThemeMeta ? getThemeMeta(char) : defaultThemeMeta(char);
          const isFeatured = Boolean(char.isFeatured);

          const vfxBadge =
            char.vfxType === 'fire' ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-200 border border-orange-400/30">
                <Flame size={9} /> FIRE
              </span>
            ) : char.vfxType === 'ice' ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                <Snowflake size={9} /> ICE
              </span>
            ) : char.vfxType === 'rock' ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-amber-700/25 text-amber-200 border border-amber-500/30">
                <Mountain size={9} /> ROCK
              </span>
            ) : char.vfxType === 'sparkles' ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-400/30">
                <Sparkles size={9} /> MAGIC
              </span>
            ) : null;

          return (
            <motion.button
              key={char.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelectCharacter(char)}
              style={{
                background: isSelected
                  ? '#ffffff'
                  : `${theme.gradient}, rgba(18, 18, 20, 0.92)`,
              }}
              className={`relative p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                isSelected
                  ? 'text-[#050505] border-white shadow-[0_0_24px_rgba(255,255,255,0.32)]'
                  : isFeatured
                  ? 'text-white border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.28)] ring-1 ring-amber-400/30 hover:border-amber-300'
                  : 'text-white border-white/12 hover:border-white/35 shadow-sm'
              }`}
            >
              {/* Task 2: Glowing Gold Star (⭐️) Badge on Top-Right Corner for Featured Characters */}
              {isFeatured && (
                <div
                  className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[9px] shadow-[0_0_12px_rgba(251,191,36,0.85)] border border-yellow-200 flex items-center gap-0.5 z-20 pointer-events-none"
                  title="Featured Main Character"
                >
                  <span className="text-[10px] leading-none">⭐️</span>
                  <span className="font-mono text-[7px] uppercase tracking-wider font-black">
                    MAIN
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-1.5">
                {/* Mini 3D Fur Avatar Orb + Theme Emoji */}
                <div className="flex items-center gap-2">
                  <div
                    className={`relative w-8 h-8 rounded-full border flex items-center justify-center shadow-inner shrink-0 ${
                      isSelected
                        ? 'border-[#050505]/30'
                        : isFeatured
                        ? 'border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                        : 'border-white/35'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${char.tipColor}, ${char.furColor} 72%, #111 100%)`,
                    }}
                  >
                    <span className="text-sm leading-none select-none drop-shadow">
                      {theme.emoji}
                    </span>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black/60"
                      style={{ backgroundColor: char.eyeColor }}
                      title={`Eyes: ${char.eyeColor}`}
                    />
                  </div>
                </div>

                {isSelected ? (
                  <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#050505] text-white">
                    Active
                  </span>
                ) : (
                  vfxBadge || (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-white/75 border border-white/10">
                      {char.badge}
                    </span>
                  )
                )}
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-tight truncate flex items-center gap-1">
                  {char.name}
                  {isFeatured && (
                    <Star
                      size={10}
                      className="text-amber-400 fill-amber-400 inline shrink-0"
                    />
                  )}
                </div>
                <div
                  className={`text-[9px] font-mono truncate mt-0.5 ${
                    isSelected ? 'text-[#050505]/70' : 'text-white/55'
                  }`}
                >
                  {char.accessories.length > 0
                    ? char.accessories.map((a) => a.replace(/_/g, ' ')).join(' + ')
                    : 'Pure Fluffy Form'}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
