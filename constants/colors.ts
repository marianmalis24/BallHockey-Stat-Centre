// template
const tintColorLight = "#2f95dc";

export default {
  light: {
    text: "#000",
    background: "#fff",
    tint: tintColorLight,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
  },
};

export function getRatingColor(rating: number): string {
  if (rating < 4.5) {
    return '#8B0000';
  } else if (rating >= 4.5 && rating < 6.0) {
    return '#FF3B30';
  } else if (rating >= 6.0 && rating < 7.8) {
    return '#34C759';
  } else {
    return '#00CC00';
  }
}
