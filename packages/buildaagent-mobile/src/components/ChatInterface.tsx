import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage, Persona } from '../types';
import { apiService } from '../services/api';

interface ChatInterfaceProps {
  persona: Persona;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ persona }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Add initial message when persona changes
    if (persona.first_message) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${persona.id}`,
        message: persona.first_message,
        sender: 'agent',
        timestamp: new Date(),
        persona: persona.name,
      };
      setMessages([welcomeMessage]);
    }
  }, [persona]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage({
        message: inputText,
        persona: persona.id,
        user_id: 'demo-user', // TODO: Replace with actual user ID
      });

      if (response.success && response.data) {
        const agentMessage: ChatMessage = {
          id: Date.now().toString() + '-agent',
          message: response.data.response,
          sender: 'agent',
          timestamp: new Date(),
          persona: response.data.persona,
          skill_used: response.data.skill_used,
        };
        setMessages(prev => [...prev, agentMessage]);
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Make sure the API server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.agentMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.agentMessageText
      ]}>
        {item.message}
      </Text>
      {item.skill_used && (
        <Text style={styles.skillText}>
          Used: {item.skill_used}
        </Text>
      )}
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.personaName}>{persona.name}</Text>
        <Text style={styles.personaDescription}>{persona.description}</Text>
      </View>

      {/* Messages – takes remaining space */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingVertical: 12,
  },
  personaName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  personaDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#333',
  },
  skillText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C0C0C0',
  },
});