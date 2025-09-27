import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function VersionHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text>Version History Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VersionHistoryScreen;
