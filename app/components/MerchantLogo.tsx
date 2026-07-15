import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme/theme";
import { brandIconUrl, initial } from "../format";

interface MerchantLogoProps {
  brand?: string;
  merchant?: string;
  size?: number;
}

/**
 * Merchant avatar: a Simple Icons logo keyed on the brand (no logo files are
 * committed), falling back to a coloured initial when there is no slug or the
 * image fails to load.
 */
export function MerchantLogo({ brand, merchant, size = 36 }: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = brandIconUrl(brand);
  const label = brand ?? merchant;
  const box = { width: size, height: size, borderRadius: radius.sm };

  if (url && !failed) {
    return (
      <View style={[styles.logo, box]}>
        <Image
          source={{ uri: url }}
          style={{ width: size * 0.58, height: size * 0.58 }}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }
  return (
    <View style={[styles.logo, box]}>
      <Text style={styles.initial}>{initial(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: colors.card2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: { color: colors.accent, fontWeight: "700", fontSize: 15 },
});
