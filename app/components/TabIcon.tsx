import Svg, { Path, Circle } from "react-native-svg";

export type TabName = "Dashboard" | "Trends" | "Ask" | "Import" | "Settings";

interface TabIconProps {
  name: TabName;
  color: string;
  focused: boolean;
}

// Minimal line icons drawn as SVG so no icon font is bundled.
const PATHS: Record<TabName, () => JSX.Element> = {
  Dashboard: () => (
    <>
      <Path d="M3 12l9-8 9 8" />
      <Path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  Trends: () => (
    <>
      <Path d="M4 19V5" />
      <Path d="M4 19h16" />
      <Path d="M7 15l4-5 3 3 5-7" />
    </>
  ),
  Ask: () => (
    <>
      <Path d="M4 5h16v10H9l-5 4z" />
    </>
  ),
  Import: () => (
    <>
      <Path d="M12 3v12" />
      <Path d="M7 10l5 5 5-5" />
      <Path d="M5 21h14" />
    </>
  ),
  Settings: () => (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
};

export function TabIcon({ name, color, focused }: TabIconProps) {
  const Draw = PATHS[name];
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={focused ? 2.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Draw />
    </Svg>
  );
}
