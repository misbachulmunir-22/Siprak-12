import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type TabBarIconProps = {
  color: ColorValue;
  size: number;
  name: ComponentProps<typeof SymbolView>["name"];
};

export function TabBarIcon({ color, size, name }: TabBarIconProps) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
