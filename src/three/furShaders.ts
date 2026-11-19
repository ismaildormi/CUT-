export {
  DEFAULT_FUR_LENGTH,
  DEFAULT_FUR_DENSITY,
  SHELL_VERTEX_SHADER,
  SHELL_FRAGMENT_SHADER,
  STRAND_VERTEX_SHADER,
  STRAND_FRAGMENT_SHADER,
} from '../furShaders.js';

/**
 * 3D Fur Shader Configuration with Fur Flattening & Accessory Occlusion Fix
 * - depthWrite: false on upper shells prevents occlusion of accessories
 * - depthTest: true ensures realistic physical depth layering
 * - uAccessoryBounds: reduces fur strand length to 10% beneath hats/helmets/crowns
 */
export const FUR_SHADER_CONFIG = {
  transparent: true,
  depthWrite: false,
  depthTest: true,
  flattenFactorUnderAccessories: 0.10,
};

