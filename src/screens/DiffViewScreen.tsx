import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function DiffViewScreen() {
  return (
    <View style={styles.container}>
      <Text>Diff View Screen</Text>
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

export default DiffViewScreen;
