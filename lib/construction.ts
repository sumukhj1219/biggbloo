// The construction site around the monolith (crane, scaffold, barricades, cones, bricks) is
// temporary. NEXT_PUBLIC_ values are inlined at build time, so this must be read literally.
export const UNDER_CONSTRUCTION = process.env.NEXT_PUBLIC_CONSTRUCTION === "true";
