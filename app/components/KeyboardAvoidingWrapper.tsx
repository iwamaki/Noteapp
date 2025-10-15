import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Adjusts the vertical offset when the keyboard is shown.
   * Defaults to the top safe area inset on iOS, and 0 on Android.
   */
  keyboardVerticalOffset?: number;
}

export const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  keyboardVerticalOffset,
}) => {
  const insets = useSafeAreaInsets();

  const defaultOffset = Platform.select({
    ios: insets.top,
    android: 0, // Android often handles this differently or doesn't need an offset
    default: 0,
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 'padding' or 'position' for iOS, 'height' for Android
      keyboardVerticalOffset={keyboardVerticalOffset ?? defaultOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
