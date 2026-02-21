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
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {personas.map((persona) => {
          const isSelected = selectedPersona?.id === persona.id;
          return (
            <TouchableOpacity
              key={persona.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectPersona(persona)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getPersonaIcon(persona.name)}
                size={18}
                color={isSelected ? '#fff' : '#007AFF'}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {persona.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 10,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chipLabelSelected: {
    color: '#fff',
  },
});