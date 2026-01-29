<template>
  <div class="console-pane" :class="{ 'is-expanded': expanded }">
    <div class="console-header">
      <div class="console-status">
        <div class="terminal-badge">
          <span class="material-icons terminal-icon">terminal</span>
          <span class="console-title">Terminal</span>
        </div>
        <span
          v-if="statusResult"
          :class="['status-badge', statusResult.success ? 'success' : 'error']"
          :title="statusResult.success ? 'Compilation Successful' : 'Compilation Failed'"
        >
          {{ statusResult.success ? 'READY' : 'ERROR' }}
        </span>
      </div>
      <div class="console-actions">
        <button
          v-if="interactiveOutput.length > 0"
          class="btn-icon-only"
          @click="clearOutputLocal"
          title="Clear Terminal"
        >
          <span class="material-icons">block</span>
        </button>
        <button
          v-if="interactiveOutput.length > 0"
          class="btn-icon-only"
          @click="copyOutput"
          title="Copy Output"
        >
          <span class="material-icons">content_copy</span>
        </button>
        <button
          class="btn-icon-only toggle-btn"
          @click="toggleExpand"
          :title="expanded ? 'Minimize' : 'Expand'"
        >
          <span class="material-icons">{{ expanded ? 'expand_more' : 'expand_less' }}</span>
        </button>
      </div>
    </div>

    <!-- Content Area: Using internal grid for robust layout -->
    <div class="console-content">
      <!-- Submission Feedback Mode (Last Submission) -->
      <transition name="fade-slide">
        <div
          v-if="submission"
          class="feedback-panel"
          :class="submission.passed ? 'success' : 'error'"
        >
          <div class="feedback-header">
            <div class="feedback-status">
              <div class="status-icon-wrapper">
                <span class="material-icons">{{
                  submission.passed ? 'check_circle' : 'error_outline'
                }}</span>
              </div>
              <div class="status-text-wrapper">
                <h3>{{ submission.passed ? 'Challenge Completed' : 'Needs Correction' }}</h3>
                <p class="status-subtitle">
                  {{
                    submission.passed
                      ? "Great job! You've mastered this concept."
                      : 'Take a look at the feedback below to fix your code.'
                  }}
                </p>
              </div>
            </div>
            <div class="stats-row">
              <div class="score-badge" v-if="submission.attemptNumber">
                <span class="label">Attempt</span>
                <span class="val">#{{ submission.attemptNumber }}</span>
              </div>
              <div class="score-badge" v-if="submission.masteryUpdate">
                <span class="label">Mastery</span>
                <span class="val">{{ Math.round(submission.masteryUpdate.newScore * 100) }}%</span>
              </div>
            </div>
          </div>

          <div class="feedback-body">
            <div class="feedback-content" v-if="submissionAnalysis">
              <div class="feedback-section-title">Evaluation</div>
              <p class="feedback-message">{{ submissionAnalysis.feedback }}</p>
            </div>
            <div class="feedback-content" v-else-if="submission.analysis">
              <div class="feedback-section-title">Evaluation</div>
              <p class="feedback-message">{{ submission.analysis.feedback }}</p>
            </div>

            <!-- Hints -->
            <div
              v-if="
                !submission.passed &&
                submissionAnalysis &&
                submissionAnalysis.hintsForNextAttempt?.length
              "
              class="hints-section"
            >
              <h4><span class="material-icons">lightbulb</span> Strategic Hints</h4>
              <ul>
                <li v-for="(hint, i) in submissionAnalysis.hintsForNextAttempt" :key="i">
                  {{ hint }}
                </li>
              </ul>
            </div>

            <!-- Compiler Error -->
            <div
              v-if="
                submission.compileResult?.stderr &&
                (submission.compileResult?.exitCode !== 0 || !submission.passed)
              "
              class="compiler-error"
            >
              <h4><span class="material-icons">bug_report</span> Compiler Diagnostics</h4>
              <pre>{{ submission.compileResult.stderr }}</pre>
            </div>
          </div>

          <!-- Footer Area (Always visible if passed) -->
          <div v-if="submission.passed" class="actions-row">
            <button class="btn btn-next" @click="$emit('next-lesson')">
              <span>Continue to Next Lesson</span>
              <span class="material-icons">arrow_forward</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- Standard Terminal Output -->
      <template v-if="!submission && showOutput">
        <div class="console-scroll-area" ref="consoleScrollRef">
          <div
            class="terminal-output"
            :class="{
              'is-empty': interactiveOutput.length === 0 && interactiveStatus === 'idle',
            }"
          >
            <div
              v-if="interactiveOutput.length === 0 && interactiveStatus === 'idle'"
              class="terminal-placeholder"
            >
              <div class="placeholder-glow"></div>
              <span class="material-icons placeholder-icon">terminal</span>
              <p>Ready for Execution</p>
              <span class="placeholder-hint"
                >Write some code and press "Run" to see it in action</span
              >
            </div>

            <div v-for="(line, i) in interactiveOutput" :key="i" :class="['term-line', line.type]">
              <span v-if="line.type === 'stdin'" class="prompt-char">$ </span>
              <span class="line-content">{{ line.data }}</span>
            </div>

            <!-- Input Line -->
            <div v-if="delayedRunning" class="input-line">
              <span class="prompt-char pulse">&gt; </span>
              <input
                v-model="inputValue"
                @keydown.enter="handleInputEnter"
                type="text"
                class="terminal-input"
                placeholder="Provide input..."
                autoFocus
              />
            </div>

            <div v-if="interactiveStatus === 'exited'" class="process-status">
              <span class="status-marker" :class="{ 'has-error': exitCode !== 0 }"></span>
              Process terminated
              {{ exitCode !== 0 ? `with error (exit code: ${exitCode})` : 'successfully' }}
            </div>
          </div>
        </div>

        <!-- Sticky Footer Hint outside scroll area -->
        <div v-if="delayedRunning" class="terminal-footer-hint">
          <span class="material-icons">info</span>
          <span>Program is running... Provide input or wait for completion.</span>
        </div>
      </template>

      <!-- Processing state -->
      <div v-if="!submission && !showOutput" class="terminal-placeholder">
        <span class="material-icons placeholder-icon rotating">hourglass_empty</span>
        <p>Processing...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch, nextTick, computed, onBeforeUnmount } from 'vue'

export default defineComponent({
  name: 'LessonTerminal',
  props: {
    // Control
    expanded: {
      type: Boolean,
      default: false,
    },
    // Data
    statusResult: {
      type: Object,
      default: null, // { success: boolean }
    },
    showOutput: {
      type: Boolean,
      default: false,
    },
    // Interactive
    interactiveOutput: {
      type: Array,
      default: () => [],
    },
    interactiveStatus: {
      type: String, // 'idle' | 'running' | 'exited'
      default: 'idle',
    },
    // Submission Feedback
    submission: {
      type: Object,
      default: null,
    },
    exitCode: {
      type: Number,
      default: 0,
    },
  },
  emits: ['update:expanded', 'input', 'next-lesson'],
  setup(props, { emit }) {
    const consoleScrollRef = ref(null)
    const inputValue = ref('')
    const delayedRunning = ref(false)
    let runningTimeout = null

    watch(
      () => props.interactiveStatus,
      (status) => {
        if (status === 'running') {
          runningTimeout = setTimeout(() => {
            delayedRunning.value = true
          }, 400)
        } else {
          if (runningTimeout) {
            clearTimeout(runningTimeout)
            runningTimeout = null
          }
          delayedRunning.value = false
        }
      },
      { immediate: true },
    )

    onBeforeUnmount(() => {
      if (runningTimeout) clearTimeout(runningTimeout)
    })

    const scrollToBottom = () => {
      nextTick(() => {
        if (consoleScrollRef.value) {
          consoleScrollRef.value.scrollTop = consoleScrollRef.value.scrollHeight
        }
      })
    }

    const toggleExpand = () => {
      emit('update:expanded', !props.expanded)
    }

    const handleInputEnter = () => {
      if (!inputValue.value) return
      emit('input', inputValue.value)
      inputValue.value = ''
    }

    const clearOutputLocal = () => {
      // Note: This only clears local visual state if the parent doesn't reset props.
      // Ideally parent should handle clearing the actual data.
      console.log('Clear output requested')
    }

    const copyOutput = () => {
      let text = ''
      if (props.submission) {
        text = props.submission.analysis?.feedback || ''
        if (props.submission.compileResult?.stderr) {
          text += '\n\nCompiler Output:\n' + props.submission.compileResult.stderr
        }
      } else {
        text = props.interactiveOutput.map((line) => line.data).join('\n')
      }

      navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard')
      })
    }

    // Also scroll on interactive output change
    watch(
      () => props.interactiveOutput,
      () => scrollToBottom(),
      { deep: true },
    )

    const submissionAnalysis = computed(() => {
      if (!props.submission || !props.submission.analysis) return null
      const raw = props.submission.analysis

      // If it's fully parsed object, great
      if (typeof raw === 'object' && raw.feedback) return raw

      let feedback = raw.feedback
      let hints = raw.hintsForNextAttempt || []

      if (
        typeof feedback === 'string' &&
        (feedback.includes('```json') || feedback.trim().startsWith('{'))
      ) {
        try {
          const jsonMatch = feedback.match(/```json\n([\s\S]*?)\n```/) || [null, feedback]
          const jsonStr = jsonMatch[1] || feedback
          const parsed = JSON.parse(jsonStr)
          return {
            feedback: parsed.feedback || parsed.message || 'Analysis complete',
            hintsForNextAttempt: parsed.hints || parsed.hintsForNextAttempt || hints,
          }
        } catch (e) {
          console.warn('Failed to parse JSON feedback', e)
        }
      }

      return {
        feedback: typeof raw === 'string' ? raw : raw.feedback,
        hintsForNextAttempt: hints,
      }
    })

    return {
      consoleScrollRef,
      inputValue,
      toggleExpand,
      handleInputEnter,
      submissionAnalysis,
      clearOutputLocal,
      copyOutput,
      delayedRunning,
    }
  },
})
</script>

<style scoped>
.console-pane {
  background: #0d0d10;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  grid-template-rows: 44px 1fr;
  height: 320px; /* Increased slightly for better baseline visibility */
  flex: 0 0 320px;
  transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  position: relative;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.6);
  z-index: 50;
  box-sizing: border-box;
}

.console-pane.is-expanded {
  height: 70%; /* More generous expanded view */
  flex-basis: 70%;
}

/* Header */
.console-header {
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  background: #141418;
  border-bottom: 2px solid rgba(255, 255, 255, 0.03);
  z-index: 10;
}

.console-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.terminal-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.terminal-icon {
  font-size: 1.1rem;
  color: #42b883;
}

.console-title {
  font-weight: 700;
  color: #e0e0e0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 800;
  letter-spacing: 0.05em;
  border: 1px solid transparent;
}

.status-badge.success {
  background: rgba(66, 184, 131, 0.1);
  color: #42b883;
  border-color: rgba(66, 184, 131, 0.2);
}
.status-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon-only {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon-only:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.btn-icon-only .material-icons {
  font-size: 1.25rem;
}

.toggle-btn {
  color: #9ca3af;
}

/* Content */
.console-content {
  grid-row: 2;
  overflow: hidden;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.console-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Terminal Placeholder */
.terminal-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  position: relative;
}

.placeholder-glow {
  position: absolute;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(66, 184, 131, 0.05) 0%, transparent 70%);
  z-index: 0;
}

.placeholder-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  opacity: 0.3;
  z-index: 1;
}

.terminal-placeholder p {
  font-weight: 600;
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
  z-index: 1;
}

.placeholder-hint {
  font-size: 0.8rem;
  margin-top: 0.75rem;
  opacity: 0.5;
  max-width: 240px;
  text-align: center;
  z-index: 1;
}

/* Terminal Output Lines */
.terminal-output {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 100%;
}

.term-line {
  white-space: pre-wrap;
  word-break: break-all;
  padding: 2px 0;
  display: flex;
  align-items: flex-start;
}

.line-content {
  flex: 1;
}

.term-line.stdout {
  color: #e5e7eb;
}
.term-line.stderr {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.05);
  margin: 2px -1.25rem; /* Negative margin to span full width of scroll area */
  padding: 4px 1.25rem;
}
.term-line.stdin {
  color: #60a5fa;
  font-weight: 600;
}

.prompt-char {
  color: #4b5563;
  margin-right: 0.75rem;
  user-select: none;
  font-weight: 800;
  flex-shrink: 0;
}

.prompt-char.pulse {
  color: #42b883;
  animation: blink-pulse 1s step-end infinite;
}

@keyframes blink-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Input Line */
.input-line {
  display: flex;
  align-items: center;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #60a5fa;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  min-width: 0;
}

.process-status {
  margin-top: 1.5rem;
  color: #6b7280;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  padding-bottom: 1rem;
}

.status-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #42b883;
  box-shadow: 0 0 8px rgba(66, 184, 131, 0.3);
}

.status-marker.has-error {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
}

.terminal-footer-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: rgba(66, 184, 131, 0.05);
  border-top: 1px solid rgba(66, 184, 131, 0.1);
  color: #42b883;
  font-size: 0.7rem;
  font-weight: 600;
}

.terminal-footer-hint .material-icons {
  font-size: 0.9rem;
}

/* Feedback Panel Reworked for Stability */
.feedback-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.feedback-panel.success {
  background: linear-gradient(135deg, rgba(66, 184, 131, 0.03) 0%, transparent 60%);
}
.feedback-panel.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, transparent 60%);
}

.feedback-header {
  flex: 0 0 auto;
  padding: 1rem 1.5rem 0.5rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.feedback-status {
  display: flex;
  gap: 1.25rem;
  flex: 1;
}

.status-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success .status-icon-wrapper {
  background: rgba(66, 184, 131, 0.1);
  color: #42b883;
}

.error .status-icon-wrapper {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.status-icon-wrapper .material-icons {
  font-size: 2rem;
}

.status-text-wrapper h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.status-subtitle {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: #9ca3af;
}

.stats-row {
  display: flex;
  gap: 0.75rem;
}

.score-badge {
  background: rgba(255, 255, 255, 0.04);
  padding: 6px 14px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.score-badge .label {
  font-size: 0.6rem;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.score-badge .val {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}

.feedback-body {
  flex: 1 1 0%;
  overflow-y: auto;
  padding: 0 1.5rem 1rem 1.5rem;
  min-height: 0;
}

.feedback-section-title {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 800;
  color: #6b7280;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.feedback-message {
  font-size: 1rem;
  line-height: 1.7;
  color: #d1d5db;
  margin: 0 0 1.5rem 0;
  background: rgba(255, 255, 255, 0.03);
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.hints-section {
  background: rgba(96, 165, 250, 0.05);
  padding: 1.25rem;
  border-radius: 12px;
  border-left: 4px solid #60a5fa;
  margin-bottom: 1.5rem;
}

.hints-section h4 {
  margin: 0 0 0.75rem 0;
  color: #60a5fa;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hints-section h4 .material-icons {
  font-size: 1.1rem;
}

.hints-section ul {
  margin: 0;
  padding-left: 1.25rem;
  color: #cbd5e1;
}
.hints-section li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.compiler-error {
  margin-top: 1.5rem;
}

.compiler-error h4 {
  color: #f87171;
  margin: 0 0 0.75rem 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.compiler-error pre {
  background: #000;
  padding: 1.25rem;
  border-radius: 12px;
  color: #fca5a5;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin: 0;
}

.actions-row {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.5rem;
  background: #141418;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

.btn-next {
  background: #42b883;
  color: #000;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  height: auto; /* Override fixed height from globals */
  min-height: 40px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.btn-next:hover {
  background: #3bb27e;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(66, 184, 131, 0.4);
}

.btn-next .material-icons {
  font-size: 1.25rem;
}

.rotating {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
