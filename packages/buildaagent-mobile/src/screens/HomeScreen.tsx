import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Persona } from '../types';
import { apiService } from '../services/api';
import { ChatInterface } from '../components/ChatInterface';
import { PersonaSelector } from '../components/PersonaSelector';

export const HomeScreen: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);

  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    const isHealthy = await apiService.checkHealth();
    setServerConnected(isHealthy);
    
    if (isHealthy) {
      loadPersonas();
    } else {
      setLoading(false);
      Alert.alert(
        'Server Connection',
        'Cannot connect to the API server. Make sure it\'s running on localhost:3000',
        [
          { text: 'Retry', onPress: checkServerConnection },
          { text: 'Continue Offline', onPress: () => loadMockPersonas() }
        ]
      );
    }
  };

  const loadPersonas = async () => {
    const result = await apiService.getPersonas();
    
    if (result.success && result.data) {
      setPersonas(result.data);
      setSelectedPersona(result.data[0]); // Select first persona by default
    } else {
      Alert.alert('Error', result.error || 'Failed to load personas');
      loadMockPersonas();
    }
    
    setLoading(false);
  };

  const loadMockPersonas = () => {
    const mockPersonas: Persona[] = [
      {
        id: 'personal-assistant',
        name: 'Personal Assistant',
        description: 'Your helpful everyday assistant',
        behavior: {
          tone: 'friendly',
          proactiveness: 'high',
        },
        skills: ['web-search', 'weather', 'calendar'],
        first_message: 'Hello! I\'m your personal assistant. How can I help you today?',
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Creative writing and content generation',
        behavior: {
          tone: 'creative',
          proactiveness: 'medium',
        },
        skills: ['web-search', 'writing'],
        first_message: 'Hey there! Ready to create something amazing together?',
      },
    ];
    
    setPersonas(mockPersonas);
    setSelectedPersona(mockPersonas[0]);
    setLoading(false);
  };

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading BuildAAgent...</Text>
      </View>
    );
  }

  if (!serverConnected && personas.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>
          Cannot connect to the API server.{'\n'}
          Make sure the server is running on localhost:3000
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={checkServerConnection}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Connection Status */}
      {!serverConnected && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>Offline Mode - Mock Data</Text>
        </View>
      )}
      
      {/* Persona Selector */}
      <PersonaSelector
        personas={personas}
        selectedPersona={selectedPersona}
        onSelectPersona={handlePersonaSelect}
      />
      
      {/* Chat Interface */}
      {selectedPersona && (
        <ChatInterface persona={selectedPersona} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineBar: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});