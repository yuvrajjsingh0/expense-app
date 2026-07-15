import { NavigationContainer, DarkTheme, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
import { colors } from "../theme/theme";
import { TabIcon, type TabName } from "../components/TabIcon";
import { DashboardScreen } from "../screens/DashboardScreen";
import { TrendsScreen } from "../screens/TrendsScreen";
import { AskScreen } from "../screens/AskScreen";
import { ImportScreen } from "../screens/ImportScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  Trends: undefined;
  Ask: undefined;
  Import: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
  },
};

/** Bottom-tab navigator wiring the five screens. */
export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            height: Platform.OS === "ios" ? 84 : 64,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={route.name as TabName} color={color} focused={focused} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Trends" component={TrendsScreen} />
        <Tab.Screen name="Ask" component={AskScreen} />
        <Tab.Screen name="Import" component={ImportScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
