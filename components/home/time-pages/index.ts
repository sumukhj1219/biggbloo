import ClockFace from "./ClockFace";
import JustDoIt from "./JustDoIt";
import Life from "./Life";

/**
 * Ordered list of pages the Time widget cycles through on click.
 * To add a page: drop a new component here and append it to this array.
 */
export const timePages = [ClockFace, JustDoIt, Life] as const;
