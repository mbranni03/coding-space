<template>
  <div class="ai-assistant-wrapper">
    <!-- Navbar Toggle Button -->
    <button
      class="nav-assistant-btn"
      :class="{ 'is-active': isOpen }"
      @click="toggleChat"
      title="Ask AI Mentor"
    >
      <div class="icon-wrapper">
        <span class="material-icons">auto_awesome</span>
      </div>
      <span class="btn-label">AI Mentor</span>
    </button>

    <!-- Chat Panel (Teleported to body for global overlay) -->
    <Teleport to="body">
      <div class="ai-assistant-overlay">
        <Transition name="slide-up">
          <div v-if="isOpen" class="assistant-panel" :class="{ 'is-wide': isWide }">
            <div class="panel-header">
              <div class="header-content">
                <span class="assistant-name">AI Mentor</span>
                <span class="assistant-status">Online</span>
              </div>
              <div class="panel-header-actions">
                <button
                  class="btn-header-action"
                  @click="isWide = !isWide"
                  :title="isWide ? 'Shrink' : 'Expand'"
                >
                  <span class="material-icons">
                    {{ isWide ? 'close_fullscreen' : 'open_in_full' }}
                  </span>
                </button>
                <button class="btn-minimize" @click="toggleChat">
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>

            <div class="messages-container" ref="messagesRef">
              <div
                v-for="(msg, index) in messages"
                :key="index"
                class="message-wrapper"
                :class="msg.role"
              >
                <div
                  class="message-content"
                  :class="{ 'markdown-body': msg.role === 'assistant' }"
                  v-html="renderMarkdown(msg.text)"
                ></div>
              </div>
              <div v-if="isTyping" class="message-wrapper assistant">
                <div class="message-content typing">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
              </div>
            </div>

            <div class="input-container">
              <input
                v-model="userInput"
                type="text"
                placeholder="Ask a question..."
                @keyup.enter="sendMessage"
              />
              <button class="btn-send" @click="sendMessage" :disabled="!userInput.trim()">
                <span class="material-icons">send</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { defineComponent, ref, nextTick, computed, watch } from 'vue'
import { useLessonStore } from '../stores/store'
import { askQuestion } from '../services/LearningAPI'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

export default defineComponent({
  name: 'AIAssistant',
  setup() {
    const store = useLessonStore()
    const isOpen = ref(false)
    const isWide = ref(true)
    const hasNotification = ref(true)
    const userInput = ref('')
    const isTyping = ref(false)
    const messagesRef = ref(null)
    const currentLanguageName = computed(() => {
      const lang = store.currentLanguage || 'rust'
      if (lang.toLowerCase() === 'javascript') return 'JavaScript'
      if (lang.toLowerCase() === 'typescript') return 'TypeScript'
      return lang.charAt(0).toUpperCase() + lang.slice(1)
    })

    const messages = ref([
      {
        role: 'assistant',
        text: `Hi! I'm your AI Mentor. Stuck on the lesson? Ask me anything about ${currentLanguageName.value}.`,
      },
    ])

    // Update initial message if it's the only one and language changes
    watch(currentLanguageName, (newName) => {
      if (messages.value.length === 1 && messages.value[0].role === 'assistant') {
        messages.value[0].text = `Hi! I'm your AI Mentor. Stuck on the lesson? Ask me anything about ${newName}.`
      }
    })

    // Markdown Configuration
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return (
              '<pre class="hljs"><code>' +
              hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              '</code></pre>'
            )
          } catch (err) {
            console.error('Highlight.js error:', err)
          }
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
      },
    })

    const renderMarkdown = (text) => {
      if (!text) return ''
      return md.render(text)
    }

    const toggleChat = () => {
      isOpen.value = !isOpen.value
      if (isOpen.value) {
        hasNotification.value = false
        scrollToBottom()
      }
    }

    const scrollToBottom = async () => {
      await nextTick()
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    }

    const sendMessage = async () => {
      if (!userInput.value.trim()) return

      const text = userInput.value
      messages.value.push({ role: 'user', text })
      userInput.value = ''
      scrollToBottom()

      isTyping.value = true

      try {
        const payload = {
          userId: store.userId,
          lessonId: store.currentLessonId || 'general',
          language: store.currentLanguage,
          question: text,
          code: store.editorCode || '',
          lastOutput: store.compileResult?.stdout || store.compileResult?.stderr || '',
        }

        const response = await askQuestion(payload)

        messages.value.push({
          role: 'assistant',
          text: response.answer,
        })
      } catch (error) {
        messages.value.push({
          role: 'assistant',
          text: "I'm having trouble connecting to my brain right now. Please make sure the backend is running.",
        })
        console.error('AI Assistant Error:', error)
      } finally {
        isTyping.value = false
        scrollToBottom()
      }
    }

    return {
      isOpen,
      isWide,
      hasNotification,
      userInput,
      isTyping,
      messages,
      messagesRef,
      toggleChat,
      sendMessage,
      renderMarkdown,
    }
  },
})
</script>

<style scoped>
.ai-assistant-wrapper {
  display: flex;
  align-items: center;
}

.nav-assistant-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 0.85rem;
  font-weight: 600;
  position: relative;
}

.nav-assistant-btn:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.nav-assistant-btn.is-active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.nav-assistant-btn .material-icons {
  font-size: 18px;
}

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-assistant-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 0;
  z-index: 9999;
  pointer-events: none;
}

.assistant-panel {
  pointer-events: auto;
  width: 380px;
  height: 550px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 100px);
  background: rgba(18, 18, 18, 0.9); /* More opaque */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  position: absolute;
  bottom: 24px;
  left: 24px;
  transition:
    width 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}

.assistant-panel.is-wide {
  width: 700px;
  height: 700px;
  max-height: calc(100vh - 80px);
}

.assistant-panel.is-wide .message-wrapper.assistant {
  max-width: 90%;
}

.panel-header {
  padding: 16px 20px;
  background: rgba(24, 24, 27, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assistant-name {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #fff;
}

.assistant-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: #10b981;
  font-weight: 500;
}

.assistant-status::before {
  content: '';
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
}

.panel-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-header-action,
.btn-minimize {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-header-action:hover,
.btn-minimize:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.messages-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  max-width: 80%;
  display: flex;
}

.message-wrapper.assistant {
  align-self: flex-start;
}

.message-wrapper.user {
  align-self: flex-end;
}

.message-content {
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.875rem;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.assistant .message-content {
  background: rgba(39, 39, 42, 0.8);
  color: #e4e4e7;
  border-bottom-left-radius: 4px;
}

.user .message-content {
  background: #3b82f6;
  color: #fff;
  border-bottom-right-radius: 4px;
}

/* Markdown adjustments for chat bubbles */
.message-content.markdown-body {
  padding: 12px 16px;
  background: rgba(39, 39, 42, 0.9);
}

.message-content.markdown-body :first-child {
  margin-top: 0;
}

.message-content.markdown-body :last-child {
  margin-bottom: 0;
}

.message-content.markdown-body pre {
  margin: 12px 0;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-content.markdown-body code {
  font-size: 0.8rem;
}

.message-content.markdown-body p {
  margin-bottom: 0.75rem;
}

.input-container {
  padding: 16px;
  background: rgba(24, 24, 27, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  gap: 10px;
}

.input-container input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.input-container input:focus {
  border-color: #3b82f6;
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.btn-send {
  background: #3b82f6;
  border: none;
  color: #fff;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #2563eb;
  transform: scale(1.05);
}

.btn-send:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-send:disabled {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

/* Typing Indicator */
.typing {
  display: flex;
  gap: 4px;
  padding: 10px 12px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #a1a1aa;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}
.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Transitions */
.slide-up-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.7, 0, 0.84, 0);
}

.slide-up-enter-from {
  opacity: 0;
  transform: scale(0.8) blur(10px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-enter-active {
  transition: opacity 0.4s ease-out 0.2s; /* Delay button appearance when closing chat */
}

.fade-leave-active {
  transition: opacity 0.2s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.assistant-panel {
  transform-origin: bottom left;
}

.material-icons {
  font-size: 20px;
}
</style>
