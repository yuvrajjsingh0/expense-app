import { useEffect } from "react";
import { TextInput, type TextStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { inr } from "../format";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle | TextStyle[];
  /** Format the tweened value. Defaults to Indian rupees. */
  format?: (n: number) => string;
  duration?: number;
}

/**
 * A number that counts up to its value when it changes. Runs on the UI thread
 * via reanimated (an uneditable TextInput whose text is driven by a shared
 * value), so it stays smooth even while the list below re-renders.
 */
export function AnimatedNumber({
  value,
  style,
  format = inr,
  duration = 700,
}: AnimatedNumberProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, progress]);

  const animatedProps = useAnimatedProps(() => ({
    text: format(progress.value),
    defaultValue: format(progress.value),
  }));

  return (
    <AnimatedTextInput
      style={style}
      animatedProps={animatedProps}
      editable={false}
      underlineColorAndroid="transparent"
      value={format(value)}
    />
  );
}
