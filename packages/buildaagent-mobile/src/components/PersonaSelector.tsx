import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Persona } from '../types';

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersona: Persona | null;
  onSelectPersona: (persona: Persona) => void;
}

const getPersonaIcon = (personaName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'Personal Assistant': 'person-circle',
    'Content Creator': 'create',
    'Productivity Coach': 'checkmark-circle',
    'Research Assistant': 'library',
    'Creative Writer': 'brush',
  };
  
  return iconMap[personaName] || 'person';
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  selectedPersona,
  onSelectPersona,
}) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {personas.map((persona) => (
        <TouchableOpacity
          key={persona.id}
          style={[
            styles.personaCard,
            selectedPersona?.id === persona.id && styles.selectedCard
          ]}
          onPress={() => onSelectPersona(persona)}
        >
          <View style={[
            styles.iconContainer,
            selectedPersona?.id === persona.id && styles.selectedIcon
          ]}>
            <Ionicons
              name={getPersonaIcon(persona.name)}
              size={24}
              color={selectedPersona?.id === persona.id ? '#fff' : '#007AFF'}
            />
          </View>
          <Text style={[
            styles.personaName,
            selectedPersona?.id === persona.id && styles.selectedText
          ]}>
            {persona.name}
          </Text>
          <Text style={[
            styles.personaTone,
            selectedPersona?.id === persona.id && styles.selectedSubtext
          ]}>
            {persona.behavior.tone} • {persona.behavior.proactiveness}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  content: {
    padding: 16,
  },
  personaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  personaName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedText: {
    color: '#fff',
  },
  personaTone: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});