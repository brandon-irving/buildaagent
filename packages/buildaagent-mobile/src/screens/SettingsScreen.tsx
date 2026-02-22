import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle, signOutFromGoogle } from '../services/auth';
import { apiService } from '../services/api';

const USER_ID = 'demo-user'; // same user ID used in ChatInterface

export const SettingsScreen: React.FC = () => {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    setLoading(true);
    const result = await apiService.getGmailStatus(USER_ID);
    if (result.success && result.data) {
      setGmailConnected(result.data.connected);
      setGmailEmail(result.data.email);
    }
    setLoading(false);
  };

  const connectGmail = async () => {
    setConnecting(true);
    const data = await signInWithGoogle(USER_ID);
    if (data) {
      setGmailConnected(true);
      setGmailEmail(data.email);
      Alert.alert('Connected', `Gmail connected as ${data.email}`);
    }
    setConnecting(false);
  };

  const disconnectGmail = () => {
    Alert.alert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setConnecting(true);
            const result = await apiService.disconnectGmail(USER_ID);
            if (result.success) {
              await signOutFromGoogle();
              setGmailConnected(false);
              setGmailEmail(null);
            } else {
              Alert.alert('Error', 'Failed to disconnect Gmail.');
            }
            setConnecting(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connected Services Section */}
        <Text style={styles.sectionTitle}>Connected Services</Text>
        <View style={styles.card}>
          {/* Gmail Row */}
          <View style={styles.serviceRow}>
            <View style={styles.serviceInfo}>
              <Ionicons name="mail" size={28} color="#EA4335" />
              <View style={styles.serviceText}>
                <Text style={styles.serviceName}>Gmail</Text>
                {loading ? (
                  <ActivityIndicator size="small" style={{ alignSelf: 'flex-start' }} />
                ) : gmailConnected ? (
                  <Text style={styles.serviceDetail}>{gmailEmail}</Text>
                ) : (
                  <Text style={styles.serviceDetailMuted}>Not connected</Text>
                )}
              </View>
            </View>

            {!loading && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  gmailConnected ? styles.disconnectButton : styles.connectButton,
                ]}
                onPress={gmailConnected ? disconnectGmail : connectGmail}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {gmailConnected ? 'Disconnect' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Calendar Row (future) */}
          <View style={[styles.serviceRow, styles.serviceRowLast]}>
            <View style={styles.serviceInfo}>
              <Ionicons name="calendar" size={28} color="#4285F4" />
              <View style={styles.serviceText}>
                <Text style={styles.serviceName}>Calendar</Text>
                <Text style={styles.serviceDetailMuted}>Coming soon</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info */}
        <Text style={styles.footerText}>
          Connect services to let your agent read emails, send messages, and manage your schedule.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  serviceRowLast: {
    borderBottomWidth: 0,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceText: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceDetail: {
    fontSize: 13,
    color: '#34C759',
    marginTop: 2,
  },
  serviceDetailMuted: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginTop: 16,
    marginHorizontal: 4,
  },
});
