/** Skills tracked per lesson (rated 1–5 by the instructor). Shown to students as a progress checklist. */
export const SKILLS = [
  { key: "cockpit", label: "Cockpit drill & car controls" },
  { key: "moving_off", label: "Moving off & stopping smoothly" },
  { key: "steering", label: "Steering & lane position" },
  { key: "observation", label: "Mirrors, head checks & observation" },
  { key: "speed", label: "Speed management" },
  { key: "intersections", label: "Intersections & give way" },
  { key: "roundabouts", label: "Roundabouts" },
  { key: "lane_changes", label: "Lane changes & merging" },
  { key: "reverse_park", label: "Reverse parallel parking" },
  { key: "kerbside_stop", label: "Kerbside stop & 90° parking" },
  { key: "three_point_turn", label: "3-point turn" },
  { key: "hazards", label: "Hazard perception & scanning" },
  { key: "school_zones", label: "School zones & pedestrians" },
  { key: "highway", label: "Highway / higher speed driving" },
  { key: "test_route", label: "Test-style drive" },
] as const;

export const RATING_LABELS = ["", "Introduced", "Needs help", "Getting there", "Mostly confident", "Test ready"];
