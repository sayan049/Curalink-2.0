import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileDown, Loader2 } from 'lucide-react';
import { exportConversationToPDF, exportConversationAsText } from '@/utils/exportChat';
import useUIStore from '@/store/uiStore';

const MessageExportButton = ({ message, userQuery, conversation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const { showToast } = useUIStore();

  const miniMessages = [
    {
      _id: 'user-msg',
      role: 'user',
      content: userQuery || 'Medical Research Query',
      createdAt: new Date().toISOString(),
    },
    message,
  ];

  const handlePDF = async () => {
    setExporting('pdf');
    setIsOpen(false);
    try {
      exportConversationToPDF(
        { ...conversation, title: userQuery || conversation?.title },
        miniMessages
      );
      showToast('Exported as PDF!', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF failed, trying text...', 'warning');
      handleText();
    } finally {
      setExporting(null);
    }
  };

  const handleText = () => {
    setExporting('text');
    setIsOpen(false);
    try {
      exportConversationAsText(
        { ...conversation, title: userQuery || conversation?.title },
        miniMessages
      );
      showToast('Exported as text!', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          bg-white border border-slate-200 text-slate-600
          hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50
          transition-all shadow-sm disabled:opacity-50"
      >
        {exporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>{exporting ? 'Exporting...' : 'Export'}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* ✅ Opens ABOVE the button, aligned LEFT */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
            >
              <div className="px-4 py-2.5 bg-gradient-to-r from-primary-50 to-trust-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-700">Export this response</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {message.metadata?.publications?.length || 0} publications included
                </p>
              </div>

              <div className="p-2 space-y-1">
                <button
                  onClick={handlePDF}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors group text-left"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 flex-shrink-0">
                    <FileDown className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">PDF Report</p>
                    <p className="text-xs text-slate-500">Structured document</p>
                  </div>
                </button>

                <button
                  onClick={handleText}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group text-left"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Text File</p>
                    <p className="text-xs text-slate-500">Plain .txt format</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageExportButton;