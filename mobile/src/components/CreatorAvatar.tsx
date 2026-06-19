import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/lib/theme';

interface Props {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}

export default function CreatorAvatar({ name, color = theme.pink, size = 56, ring = false }: Props) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={{
        padding: ring ? 3 : 0,
        borderRadius: size,
        borderWidth: ring ? 2 : 0,
        borderColor: theme.cyan,
      }}>
      <LinearGradient
        colors={[color, '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ color: theme.white, fontWeight: '800', fontSize: size * 0.34 }}>
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
}
