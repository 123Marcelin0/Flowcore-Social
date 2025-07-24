import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Lightbulb, TrendingUp, MessageSquare, Calendar, BarChart3, Hash, Target, Clock, Users, Home, Building, MapPin, DollarSign, Star, Zap, Heart, Eye, Share2, Edit3, Plus } from 'lucide-react';

interface DynamicTextProps {
  conversationHistory: Array<{type: 'user' | 'ai', message: string, timestamp: Date}>;
  userPosts?: Array<any>;
  isTyping?: boolean;
  className?: string;
  onSuggestionClick?: (suggestion: string) => void;
}

interface ContextualSuggestion {
  text: string;
  icon: React.ReactNode;
  category: 'suggestion' | 'insight' | 'prompt' | 'trend' | 'action';
  priority: number;
  context: string[];
  actionType: 'send' | 'expand' | 'analyze' | 'create';
}

export function DynamicText({ 
  conversationHistory, 
  userPosts, 
  isTyping, 
  className = '',
  onSuggestionClick 
}: DynamicTextProps) {
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [contextualSuggestions, setContextualSuggestions] = useState<ContextualSuggestion[]>([]);
  const [lastContextHash, setLastContextHash] = useState<string>('');

  // Analyze conversation for deep context understanding
  const analyzeConversationContext = useCallback(() => {
    const allMessages = conversationHistory.map(msg => msg.message.toLowerCase());
    const userMessages = conversationHistory.filter(msg => msg.type === 'user').map(msg => msg.message.toLowerCase());
    const aiMessages = conversationHistory.filter(msg => msg.type === 'ai').map(msg => msg.message.toLowerCase());
    
    const context = {
      topics: [] as string[],
      actions: [] as string[],
      platforms: [] as string[],
      sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
      urgency: 'normal' as 'high' | 'normal' | 'low',
      conversationStage: 'initial' as 'initial' | 'exploring' | 'creating' | 'analyzing' | 'finalizing',
      userIntent: 'general' as 'general' | 'content_creation' | 'analysis' | 'optimization' | 'planning'
    };

    // Extract topics with more sophisticated detection
    const topicKeywords = {
      'immobilien': ['immobilie', 'haus', 'wohnung', 'makler', 'verkauf', 'kauf', 'objekt', 'grundstück'],
      'content': ['post', 'content', 'idee', 'text', 'bild', 'video', 'story', 'reel'],
      'marketing': ['marketing', 'werbung', 'kampagne', 'zielgruppe', 'reichweite'],
      'hashtags': ['hashtag', 'tag', 'trend', 'viral', '#'],
      'timing': ['zeit', 'planung', 'schedule', 'kalender', 'wann'],
      'performance': ['performance', 'engagement', 'likes', 'kommentare', 'reichweite', 'analytics'],
      'financing': ['finanzierung', 'hypothek', 'kredit', 'investment', 'preis'],
      'location': ['lage', 'stadt', 'viertel', 'umgebung', 'adresse'],
      'clients': ['kunde', 'interessent', 'käufer', 'verkäufer', 'zielgruppe'],
      'market': ['markt', 'preise', 'entwicklung', 'trend', 'nachfrage']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allMessages.some(msg => msg.includes(keyword)))) {
        context.topics.push(topic);
      }
    });

    // Extract actions with intent detection
    const actionKeywords = {
      'create': ['erstellen', 'machen', 'posten', 'schreiben', 'entwickeln'],
      'analyze': ['analysieren', 'prüfen', 'bewerten', 'testen', 'checken'],
      'optimize': ['optimieren', 'verbessern', 'steigern', 'maximieren'],
      'plan': ['planen', 'scheduled', 'zeitplan', 'strategie'],
      'research': ['recherchieren', 'suchen', 'finden', 'explorieren']
    };

    Object.entries(actionKeywords).forEach(([action, keywords]) => {
      if (keywords.some(keyword => allMessages.some(msg => msg.includes(keyword)))) {
        context.actions.push(action);
      }
    });

    // Extract platforms
    const platformKeywords = {
      'instagram': ['instagram', 'insta', 'story', 'reel'],
      'facebook': ['facebook', 'fb'],
      'linkedin': ['linkedin', 'business'],
      'tiktok': ['tiktok', 'video'],
      'twitter': ['twitter', 'tweet']
    };

    Object.entries(platformKeywords).forEach(([platform, keywords]) => {
      if (keywords.some(keyword => allMessages.some(msg => msg.includes(keyword)))) {
        context.platforms.push(platform);
      }
    });

    // Analyze sentiment
    const positiveWords = ['gut', 'toll', 'super', 'perfekt', 'großartig', 'erfolgreich', 'hilfreich'];
    const negativeWords = ['schlecht', 'probleme', 'schwierig', 'nicht', 'keine', 'frustriert'];
    
    const positiveCount = positiveWords.filter(word => allMessages.some(msg => msg.includes(word))).length;
    const negativeCount = negativeWords.filter(word => allMessages.some(msg => msg.includes(word))).length;
    
    if (positiveCount > negativeCount) context.sentiment = 'positive';
    else if (negativeCount > positiveCount) context.sentiment = 'negative';

    // Analyze urgency
    const urgentWords = ['schnell', 'sofort', 'dringend', 'heute', 'jetzt', 'asap'];
    if (urgentWords.some(word => allMessages.some(msg => msg.includes(word)))) {
      context.urgency = 'high';
    }

    // Determine conversation stage
    const messageCount = conversationHistory.length;
    if (messageCount <= 2) context.conversationStage = 'initial';
    else if (messageCount <= 5) context.conversationStage = 'exploring';
    else if (messageCount <= 8) context.conversationStage = 'creating';
    else if (messageCount <= 12) context.conversationStage = 'analyzing';
    else context.conversationStage = 'finalizing';

    // Determine user intent
    if (context.actions.includes('create') || context.topics.includes('content')) {
      context.userIntent = 'content_creation';
    } else if (context.actions.includes('analyze') || context.topics.includes('performance')) {
      context.userIntent = 'analysis';
    } else if (context.actions.includes('optimize')) {
      context.userIntent = 'optimization';
    } else if (context.actions.includes('plan') || context.topics.includes('timing')) {
      context.userIntent = 'planning';
    }

    return context;
  }, [conversationHistory]);

  // Generate truly contextual suggestions based on conversation and user data
  const generateContextualSuggestions = useCallback(() => {
    const context = analyzeConversationContext();
    const hasRecentActivity = conversationHistory.length > 0;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const hasPosts = userPosts && userPosts.length > 0;
    
    // Create context hash to detect changes
    const contextHash = JSON.stringify(context) + hasRecentActivity + (lastMessage?.message || '') + (hasPosts ? userPosts.length : 0);
    
    // Only regenerate if context changed
    if (contextHash === lastContextHash && contextualSuggestions.length > 0) {
      return contextualSuggestions;
    }
    
    setLastContextHash(contextHash);

    const suggestions: ContextualSuggestion[] = [];

    // Base suggestions for empty conversation
    if (!hasRecentActivity) {
      const baseSuggestions = [
        {
          text: "Sag mir, was du heute posten möchtest",
          icon: <Sparkles className="w-4 h-4" />,
          category: 'suggestion' as const,
          priority: 1,
          context: ['general'],
          actionType: 'send' as const
        },
        {
          text: "Lass uns deine Content-Strategie optimieren",
          icon: <TrendingUp className="w-4 h-4" />,
          category: 'suggestion' as const,
          priority: 2,
          context: ['general'],
          actionType: 'expand' as const
        },
        {
          text: "Ich helfe dir bei deinen Social Media Posts",
          icon: <MessageSquare className="w-4 h-4" />,
          category: 'prompt' as const,
          priority: 3,
          context: ['general'],
          actionType: 'send' as const
        }
      ];
      suggestions.push(...baseSuggestions);
    } else {
      // Generate contextual suggestions based on deep analysis
      const lastUserMessage = lastMessage?.message.toLowerCase() || '';
      
      // Topic-based contextual suggestions
      if (context.topics.includes('immobilien')) {
        if (context.userIntent === 'content_creation') {
          suggestions.push({
            text: "Soll ich dir Immobilien-Hashtags für deinen Post zeigen?",
            icon: <Hash className="w-4 h-4" />,
            category: 'suggestion',
            priority: 1,
            context: ['immobilien', 'hashtags'],
            actionType: 'expand'
          });
        }
        
        if (hasPosts) {
          const recentPosts = userPosts.slice(0, 3);
          const hasSuccessfulPosts = recentPosts.some(p => (p.likes || 0) > 10);
          
          if (hasSuccessfulPosts) {
            suggestions.push({
              text: "Deine Immobilien-Posts performen gut - lass uns das analysieren",
              icon: <BarChart3 className="w-4 h-4" />,
              category: 'insight',
              priority: 1,
              context: ['immobilien', 'performance'],
              actionType: 'analyze'
            });
          }
        }
      }

      if (context.topics.includes('content')) {
        if (context.conversationStage === 'exploring') {
          suggestions.push({
            text: "Hier sind 3 neue Content-Ideen basierend auf unserer Diskussion",
            icon: <Lightbulb className="w-4 h-4" />,
            category: 'suggestion',
            priority: 1,
            context: ['content', 'ideas'],
            actionType: 'expand'
          });
        } else if (context.conversationStage === 'creating') {
          suggestions.push({
            text: "Soll ich deinen Text optimieren und verbessern?",
            icon: <Edit3 className="w-4 h-4" />,
            category: 'action',
            priority: 1,
            context: ['content', 'optimize'],
            actionType: 'expand'
          });
        }
      }

      if (context.topics.includes('hashtags')) {
        suggestions.push({
          text: "Aktuelle virale Hashtags für deine Branche",
          icon: <TrendingUp className="w-4 h-4" />,
          category: 'trend',
          priority: 1,
          context: ['hashtags', 'trends'],
          actionType: 'expand'
        });
      }

      if (context.topics.includes('timing')) {
        suggestions.push({
          text: "Die beste Zeit zum Posten ist 9-11 Uhr - soll ich dir einen Kalender erstellen?",
          icon: <Clock className="w-4 h-4" />,
          category: 'insight',
          priority: 1,
          context: ['timing', 'optimization'],
          actionType: 'create'
        });
      }

      if (context.topics.includes('performance')) {
        if (hasPosts) {
          const recentPosts = userPosts.slice(0, 5);
          const avgLikes = recentPosts.reduce((sum, p) => sum + (p.likes || 0), 0) / recentPosts.length;
          
          if (avgLikes > 15) {
            suggestions.push({
              text: `Deine Posts haben durchschnittlich ${Math.round(avgLikes)} Likes - lass uns das steigern`,
              icon: <TrendingUp className="w-4 h-4" />,
              category: 'insight',
              priority: 1,
              context: ['performance', 'analysis'],
              actionType: 'analyze'
            });
          }
        }
      }

      if (context.topics.includes('financing')) {
        suggestions.push({
          text: "Finanzierungstipps sind sehr gefragt - soll ich dir Content-Ideen zeigen?",
          icon: <DollarSign className="w-4 h-4" />,
          category: 'trend',
          priority: 1,
          context: ['financing', 'tips'],
          actionType: 'expand'
        });
      }

      if (context.topics.includes('location')) {
        suggestions.push({
          text: "Lokale Hashtags steigern deine Reichweite um 40%",
          icon: <MapPin className="w-4 h-4" />,
          category: 'insight',
          priority: 1,
          context: ['location', 'hashtags'],
          actionType: 'expand'
        });
      }

      // Action-based contextual suggestions
      if (context.actions.includes('create')) {
        if (context.conversationStage === 'creating') {
          suggestions.push({
            text: "Hier ist ein Post-Entwurf basierend auf unserer Diskussion",
            icon: <MessageSquare className="w-4 h-4" />,
            category: 'action',
            priority: 1,
            context: ['create', 'draft'],
            actionType: 'create'
          });
        }
      }

      if (context.actions.includes('analyze')) {
        if (hasPosts) {
          suggestions.push({
            text: "Deine Engagement-Rate ist gestiegen - lass uns das analysieren",
            icon: <TrendingUp className="w-4 h-4" />,
            category: 'insight',
            priority: 1,
            context: ['analyze', 'engagement'],
            actionType: 'analyze'
          });
        }
      }

      if (context.actions.includes('optimize')) {
        suggestions.push({
          text: "Soll ich deinen Text optimieren für maximale Reichweite?",
          icon: <Zap className="w-4 h-4" />,
          category: 'action',
          priority: 1,
          context: ['optimize', 'text'],
          actionType: 'expand'
        });
      }

      // Platform-specific contextual suggestions
      if (context.platforms.includes('instagram')) {
        suggestions.push({
          text: "Instagram Stories haben 70% mehr Reichweite - soll ich dir Ideen zeigen?",
          icon: <Eye className="w-4 h-4" />,
          category: 'insight',
          priority: 1,
          context: ['instagram', 'stories'],
          actionType: 'expand'
        });
      }

      if (context.platforms.includes('linkedin')) {
        suggestions.push({
          text: "LinkedIn Posts brauchen längere Texte - lass uns das optimieren",
          icon: <MessageSquare className="w-4 h-4" />,
          category: 'insight',
          priority: 1,
          context: ['linkedin', 'content'],
          actionType: 'expand'
        });
      }

      // Sentiment-based contextual suggestions
      if (context.sentiment === 'positive') {
        suggestions.push({
          text: "Deine positive Einstellung kommt gut an - lass uns das nutzen",
          icon: <Heart className="w-4 h-4" />,
          category: 'insight',
          priority: 3,
          context: ['sentiment', 'positive'],
          actionType: 'expand'
        });
      }

      if (context.sentiment === 'negative') {
        suggestions.push({
          text: "Lass uns das Problem gemeinsam lösen - was brauchst du?",
          icon: <Target className="w-4 h-4" />,
          category: 'suggestion',
          priority: 1,
          context: ['sentiment', 'negative'],
          actionType: 'send'
        });
      }

      // Urgency-based contextual suggestions
      if (context.urgency === 'high') {
        suggestions.push({
          text: "Schnelle Lösung für dein Problem - lass mich dir helfen",
          icon: <Zap className="w-4 h-4" />,
          category: 'action',
          priority: 1,
          context: ['urgency', 'high'],
          actionType: 'send'
        });
      }

      // Conversation stage-based suggestions
      if (context.conversationStage === 'finalizing') {
        suggestions.push({
          text: "Soll ich deinen Content finalisieren und posten?",
          icon: <Plus className="w-4 h-4" />,
          category: 'action',
          priority: 1,
          context: ['finalize', 'post'],
          actionType: 'create'
        });
      }

      // Generic follow-up if no specific context
      if (suggestions.length === 0) {
        suggestions.push({
          text: "Möchtest du mehr über Content-Strategien erfahren?",
          icon: <Lightbulb className="w-4 h-4" />,
          category: 'suggestion',
          priority: 1,
          context: ['general', 'strategy'],
          actionType: 'expand'
        });
      }
    }

    // Add contextual insights based on user data
    if (hasPosts) {
      const recentPosts = userPosts.slice(0, 3);
      const hasDrafts = recentPosts.some(p => p.status === 'draft');
      const hasScheduled = recentPosts.some(p => p.status === 'scheduled');
      const hasPublished = recentPosts.some(p => p.status === 'published');
      
      if (hasDrafts && !context.topics.includes('drafts')) {
        suggestions.push({
          text: "Du hast noch unveröffentlichte Entwürfe - soll ich dir dabei helfen?",
          icon: <MessageSquare className="w-4 h-4" />,
          category: 'insight',
          priority: 3,
          context: ['drafts', 'pending'],
          actionType: 'expand'
        });
      }
      
      if (hasScheduled && !context.topics.includes('scheduled')) {
        suggestions.push({
          text: "Deine geplanten Posts sind bereit - soll ich sie überprüfen?",
          icon: <Calendar className="w-4 h-4" />,
          category: 'insight',
          priority: 3,
          context: ['scheduled', 'ready'],
          actionType: 'analyze'
        });
      }

      if (hasPublished && !context.topics.includes('published')) {
        const publishedPosts = recentPosts.filter(p => p.status === 'published');
        const avgEngagement = publishedPosts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0), 0) / publishedPosts.length;
        
        if (avgEngagement > 10) {
          suggestions.push({
            text: `Deine letzten Posts haben durchschnittlich ${Math.round(avgEngagement)} Interaktionen - großartig!`,
            icon: <Star className="w-4 h-4" />,
            category: 'insight',
            priority: 3,
            context: ['published', 'performance'],
            actionType: 'analyze'
          });
        }
      }
    }

    // Shuffle suggestions to avoid always showing the same order
    const shuffledSuggestions = suggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6)
      .sort(() => Math.random() - 0.5); // Random shuffle

    return shuffledSuggestions;
  }, [conversationHistory, userPosts, analyzeConversationContext, lastContextHash, contextualSuggestions]);

  // Update contextual suggestions when context changes
  useEffect(() => {
    const newSuggestions = generateContextualSuggestions();
    setContextualSuggestions(newSuggestions);
  }, [generateContextualSuggestions]);

  // Rotate through suggestions with variable timing
  useEffect(() => {
    if (contextualSuggestions.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSuggestionIndex(prev => (prev + 1) % contextualSuggestions.length);
    }, 4000 + Math.random() * 3000); // Variable timing between 4-7 seconds

    return () => clearInterval(interval);
  }, [contextualSuggestions.length]);

  // Pause rotation when typing
  useEffect(() => {
    if (isTyping) {
      setIsVisible(false);
    } else {
      // Show suggestion after typing stops
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  if (contextualSuggestions.length === 0) {
    return null;
  }

  const currentSuggestion = contextualSuggestions[currentSuggestionIndex];

  const handleSuggestionClick = () => {
    if (onSuggestionClick) {
      onSuggestionClick(currentSuggestion.text);
    }
  };

  return (
    <div className={`transition-all duration-500 ease-in-out ${className}`}>
      <button
        onClick={handleSuggestionClick}
        className={`
          w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 
          border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
          hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200
          cursor-pointer group
        `}
      >
        <div className="flex-shrink-0 text-blue-600 group-hover:text-blue-700 transition-colors">
          {currentSuggestion.icon}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-gray-900 leading-relaxed group-hover:text-gray-800 transition-colors">
            {currentSuggestion.text}
          </p>
        </div>
        <div className="flex-shrink-0 text-blue-400 group-hover:text-blue-500 transition-colors">
          <MessageSquare className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}

export function useDynamicText(conversationHistory: Array<{type: 'user' | 'ai', message: string, timestamp: Date}>) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Generate suggestions based on conversation context
    const newSuggestions = generateSuggestionsFromContext(conversationHistory);
    setSuggestions(newSuggestions);
  }, [conversationHistory]);

  return suggestions;
}

function generateSuggestionsFromContext(conversationHistory: Array<{type: 'user' | 'ai', message: string, timestamp: Date}>) {
  const allMessages = conversationHistory.map(msg => msg.message.toLowerCase());
  const suggestions: string[] = [];

  // Generate contextual suggestions based on conversation content
  if (allMessages.some(msg => msg.includes('immobilie'))) {
    suggestions.push("Zeig mir die besten Immobilien-Hashtags");
    suggestions.push("Erstelle einen Post über Immobilienfotografie");
  }

  if (allMessages.some(msg => msg.includes('hashtag'))) {
    suggestions.push("Welche Hashtags sind gerade viral?");
    suggestions.push("Erstelle eine Hashtag-Strategie");
  }

  if (allMessages.some(msg => msg.includes('performance'))) {
    suggestions.push("Analysiere meine Post-Performance");
    suggestions.push("Wie kann ich meine Reichweite steigern?");
  }

  // Default suggestions if no specific context
  if (suggestions.length === 0) {
    suggestions.push("Gib mir Content-Ideen für heute");
    suggestions.push("Wie kann ich meine Posts optimieren?");
  }

  return suggestions.slice(0, 4);
} 