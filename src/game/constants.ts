export const LANES = [-2.25, 0, 2.25] as const;
export const CHUNK_LENGTH = 22;
export const GRAVITY = 38;
export const JUMP_VELOCITY = 13.5;
export const SLIDE_DURATION = 0.65;
export const LANE_SWITCH_TIME = 0.14;
export const PLAYER_HALF_DEPTH = 0.35;
export const PLAYER_WIDTH = 0.55;
export const PLAYER_STAND_HALF_HEIGHT = 0.72;
export const PLAYER_SLIDE_HALF_HEIGHT = 0.38;
/** Slower start; ramps up via SPEED_RAMP_PER_SEC */
export const INITIAL_SPEED = 9;
export const MAX_SPEED = 34;
/** Gradually ramps difficulty pressure without kicking in too fast early */
export const SPEED_RAMP_PER_SEC = 0.038;
export const CHUNKS_AHEAD = 5;
export const CHUNKS_BEHIND = 2;
/** Slightly forgiving window when gaps unlock */
export const GRAPPLE_RANGE_Z = 6.25;
export const GRAPPLE_DURATION = 0.95;
export const GRAPPLE_ARC_HEIGHT = 5.2;
/** Higher = score contributes to difficulty more slowly */
export const DIFFICULTY_SCORE_STEP = 1150;

/** Best score storage */
export const STORAGE_BEST = "skyhook_best_score";
export const STORAGE_TUTORIAL = "skyhook_tutorial_seen";
export const STORAGE_PERF = "skyhook_performance_mode";
export const STORAGE_MUSIC = "skyhook_music_enabled";
