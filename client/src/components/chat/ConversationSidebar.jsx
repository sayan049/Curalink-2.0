import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, Calendar, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/helpers';
import { cn } from '@/utils/cn';

const ConversationSidebar = ({
  conversations = [],
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}) => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.context?.disease?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e, conversationId) => {
    e.stopPropagation();
    e.preventDefault();

    if (deletingId) return;

    setDeletingId(conversationId);
    try {
      await onDeleteConversation(conversationId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (conversation) => {
    onSelectConversation(conversation);
  };

  return (
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <Button
          onClick={onNewChat}
          icon={Plus}
          className="w-full"
          size="sm"
        >
          New Conversation
        </Button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 bg-white"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {filteredConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-500"
          >
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs mt-1 text-slate-400">
              {searchQuery ? 'Try a different search' : 'Click "New Conversation" to begin'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredConversations.map((conversation, index) => {
              const isActive = currentConversationId === conversation._id;
              const isDeleting = deletingId === conversation._id;

              return (
                <motion.div
                  key={conversation._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => !isDeleting && handleSelect(conversation)}
                  className={cn(
                    'group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border',
                    isActive
                      ? 'bg-gradient-medical text-white border-transparent shadow-lg shadow-primary-500/25'
                      : 'bg-white hover:bg-primary-50 border-slate-200 hover:border-primary-200',
                    isDeleting && 'opacity-50 pointer-events-none'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3
                        className={cn(
                          'font-medium truncate text-sm',
                          isActive ? 'text-white' : 'text-slate-900'
                        )}
                      >
                        {conversation.title}
                      </h3>

                      {/* Disease tag */}
                      {conversation.context?.disease && (
                        <span
                          className={cn(
                            'inline-block text-xs mt-1 px-2 py-0.5 rounded-full',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-primary-100 text-primary-700'
                          )}
                        >
                          {conversation.context.disease}
                        </span>
                      )}

                      {/* Date and message count */}
                      <div
                        className={cn(
                          'flex items-center gap-2 mt-2 text-xs',
                          isActive ? 'text-white/70' : 'text-slate-500'
                        )}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(conversation.lastMessageAt)}</span>
                        {conversation.metadata?.messageCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{Math.floor(conversation.metadata.messageCount / 2)} msgs</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, conversation._id)}
                      disabled={isDeleting}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0',
                        isActive
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-red-50 text-red-500',
                        isDeleting && 'opacity-50'
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>AI Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar;