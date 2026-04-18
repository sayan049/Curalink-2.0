import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, MapPin, Stethoscope, Lightbulb } from 'lucide-react';
import PageTransition from '@/components/animations/PageTransition';
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useChat from '@/hooks/useChat';
import useUIStore from '@/store/uiStore';
import useChatStore from '@/store/chatStore';
import { COMMON_DISEASES } from '@/utils/constants';

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversationSidebarOpen, setConversationSidebarOpen] = useState(true);
  const { sidebarOpen } = useUIStore();
  const { isLoading } = useChatStore();

  useEffect(() => {
    if (window.innerWidth < 768) {
      setConversationSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    setConversationSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  const {
    conversations,
    currentConversation,
    sendMessage,
    createConversation,
    deleteConversation,
  } = useChat(id);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatData, setNewChatData] = useState({
    title: '',
    disease: '',
    location: '',
  });
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState({});

  const handleNewChat = async () => {
    if (!newChatData.title.trim()) {
      setErrors({ title: 'Please enter a title' });
      return;
    }
    setCreating(true);
    try {
      await createConversation({
        title: newChatData.title,
        disease: newChatData.disease || undefined,
        location: newChatData.location || undefined,
      });
      setShowNewChatModal(false);
      setNewChatData({ title: '', disease: '', location: '' });
      setErrors({});
    } finally {
      setCreating(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    navigate(`/chat/${conversation._id}`);
    if (window.innerWidth < 768) {
      setConversationSidebarOpen(false);
    }
  };

  return (
    <>
      {/* ✅ Full height container - NO extra padding needed
          The App.jsx ChatLayout already handles pt-16 for navbar */}
      <div className="flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Mobile overlay */}
        <AnimatePresence>
          {conversationSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-20 md:hidden"
              onClick={() => setConversationSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Conversation Sidebar */}
        <motion.div
          initial={false}
          animate={{
            width: conversationSidebarOpen ? 280 : 0,
            opacity: conversationSidebarOpen ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 overflow-hidden border-r border-slate-200 bg-white/80 backdrop-blur-sm
                     md:relative fixed left-0 top-0 bottom-0 z-30 md:z-auto"
        >
          <div className="w-[280px] h-full">
            <ConversationSidebar
              conversations={conversations}
              currentConversationId={currentConversation?._id}
              onNewChat={() => {
                setNewChatData({ title: '', disease: '', location: '' });
                setErrors({});
                setShowNewChatModal(true);
              }}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={deleteConversation}
            />
          </div>
        </motion.div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {isLoading && !currentConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading conversation..." />
            </div>
          ) : currentConversation ? (
            <ChatInterface
              key={currentConversation._id}
              onSendMessage={sendMessage}
              onToggleSidebar={() => setConversationSidebarOpen(!conversationSidebarOpen)}
              sidebarOpen={conversationSidebarOpen}
            />
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-24 h-24 bg-gradient-medical rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-glow"
                >
                  <MessageSquare className="w-12 h-12 text-white" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2 className="text-3xl font-bold gradient-text mb-3">Start Your Research</h2>
                  <p className="text-slate-600 mb-8">Create a new conversation to explore medical research and clinical trials.</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { label: 'Lung Cancer', query: 'Lung Cancer' },
                      { label: "Alzheimer's", query: "Alzheimer's Disease" },
                      { label: 'Diabetes', query: 'Type 2 Diabetes' },
                      { label: 'Heart Disease', query: 'Heart Disease' },
                    ].map((topic, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setNewChatData({ title: `Research: ${topic.query}`, disease: topic.query, location: '' });
                          setShowNewChatModal(true);
                        }}
                        className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left shadow-sm"
                      >
                        <span className="text-sm font-medium text-slate-700">{topic.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  <Button onClick={() => { setNewChatData({ title: '', disease: '', location: '' }); setErrors({}); setShowNewChatModal(true); }} icon={Plus} size="lg" className="w-full sm:w-auto">
                    New Conversation
                  </Button>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => { setShowNewChatModal(false); setErrors({}); setNewChatData({ title: '', disease: '', location: '' }); }}
        title="New Research Conversation"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-slate-600 text-sm">Start a new conversation to research medical topics.</p>

          <Input label="Conversation Title" placeholder="e.g., Lung Cancer Treatment Research" value={newChatData.title}
            onChange={(e) => { setNewChatData({ ...newChatData, title: e.target.value }); if (errors.title) setErrors({}); }}
            error={errors.title} required autoFocus />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary-500" />
                <span>Primary Condition</span>
                <span className="text-xs text-slate-400">(Optional)</span>
              </div>
            </label>
            <select value={newChatData.disease}
              onChange={(e) => setNewChatData({ ...newChatData, disease: e.target.value })}
              className="input-medical">
              <option value="">Select a condition</option>
              {COMMON_DISEASES.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
            {newChatData.disease && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-primary-600">
                Focused on {newChatData.disease}
              </motion.p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-trust-500" />
                <span>Location</span>
                <span className="text-xs text-slate-400">(Optional)</span>
              </div>
            </label>
            <input type="text" placeholder="e.g., Kolkata, India" value={newChatData.location}
              onChange={(e) => setNewChatData({ ...newChatData, location: e.target.value })}
              className="input-medical" />
            <AnimatePresence>
              {newChatData.location ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center gap-2 p-2 bg-trust-50 rounded-lg border border-trust-200">
                  <MapPin className="w-3 h-3 text-trust-600" />
                  <p className="text-xs text-trust-700">Searching trials near <strong>{newChatData.location}</strong></p>
                </motion.div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Kolkata, India', 'New York, USA', 'London, UK', 'Toronto, Canada'].map(loc => (
                    <button key={loc} type="button" onClick={() => setNewChatData({ ...newChatData, location: loc })}
                      className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-trust-100 hover:text-trust-700 transition-colors">
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Titles</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Latest treatments', 'Clinical trials', 'Top researchers', 'Research overview'].map(s => (
                <button key={s} type="button"
                  onClick={() => setNewChatData({ ...newChatData, title: newChatData.disease ? `${s} for ${newChatData.disease}` : s })}
                  className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded-full border border-primary-200 hover:bg-primary-100 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(newChatData.title || newChatData.disease || newChatData.location) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 bg-gradient-to-r from-primary-50 to-trust-50 rounded-xl border border-primary-100 space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase">Preview</p>
              {newChatData.title && <p className="text-sm font-medium text-slate-900">{newChatData.title}</p>}
              {newChatData.disease && <p className="text-xs text-slate-600">{newChatData.disease}</p>}
              {newChatData.location && <p className="text-xs text-slate-600">{newChatData.location}</p>}
            </motion.div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={() => { setShowNewChatModal(false); setErrors({}); setNewChatData({ title: '', disease: '', location: '' }); }}
              variant="secondary" className="flex-1" disabled={creating}>Cancel</Button>
            <Button onClick={handleNewChat} className="flex-1" loading={creating}
              disabled={!newChatData.title.trim() || creating}>{creating ? 'Creating...' : 'Start Research'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Chat;