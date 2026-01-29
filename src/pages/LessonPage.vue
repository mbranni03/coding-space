<template>
  <div class="split-layout">
    <!-- Loading Overlay for lesson generation -->
    <LoadingOverlay
      :model-value="isGeneratingLesson"
      :status-message="isBackendOnline ? 'GENERATING' : 'OFFLINE'"
    />

    <!-- Intro Page Mode -->
    <IntroPage
      v-if="currentLesson && currentLesson.isIntro"
      :title="currentLesson.title"
      :content="currentLesson.content"
      @continue="handleNextLesson"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- Left Pane: Instructions (Standard Lesson) -->
    <div class="pane left-pane" ref="leftPane" v-else>
      <div class="pane-header">
        <div class="header-top-row">
          <div class="module-info">
            <span class="module-overline">Module: {{ moduleName }}</span>
            <span class="step-indicator">Lesson {{ currentStep }}</span>
          </div>
          <button
            class="btn-map-toggle"
            @click="isSidebarOpen = !isSidebarOpen"
            :class="{ 'is-active': isSidebarOpen }"
            title="Toggle Learning Path"
          >
            <span class="material-icons">map</span>
            <span class="btn-label">Path</span>
          </button>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="lessonError" class="error-state">
        <span class="material-icons error-icon">error_outline</span>
        <h3>{{ isBackendOnline ? 'Error Loading Lesson' : 'Backend Offline' }}</h3>
        <p>{{ lessonError }}</p>
        <button class="btn btn-retry" @click="retryLoad">
          <span class="material-icons">refresh</span>
          Retry
        </button>
      </div>

      <!-- Lesson content -->
      <div v-else-if="currentLesson" v-html="renderedMarkdown" class="markdown-body col-grow"></div>

      <!-- Loading placeholder -->
      <div v-else class="loading-placeholder">
        <span class="material-icons rotating">hourglass_empty</span>
        <p>Loading lesson content...</p>
      </div>
    </div>

    <!-- Right Pane: Code Editor & Console -->
    <div class="pane right-pane" v-if="!(currentLesson && currentLesson.isIntro)">
      <!-- Editor Toolbar -->
      <div class="editor-header">
        <div class="file-tabs" v-if="currentLesson && currentLesson.files">
          <button
            v-for="(file, index) in currentLesson.files"
            :key="index"
            class="file-tab"
            :class="{ 'is-active': activeFileIndex === index }"
            @click="activeFileIndex = index"
          >
            <span class="material-icons file-icon">description</span>
            <span class="file-name">{{ file.name }}</span>
          </button>
        </div>
        <div class="editor-actions">
          <button
            class="btn btn-run"
            :class="{ 'is-loading': isRunning }"
            @click="runCode"
            :disabled="isRunning || !isBackendOnline"
          >
            <span v-if="isRunning" class="spinner"></span>
            <span v-else class="material-icons btn-icon">play_arrow</span>
            {{ isRunning ? 'Running...' : 'Run Code' }}
          </button>
          <button
            class="btn btn-submit"
            :class="{ 'is-loading': isSubmitting }"
            @click="submitWork"
            :disabled="isRunning || isSubmitting || !isBackendOnline || !hasCompiledSuccessfully"
            :title="
              !hasCompiledSuccessfully
                ? 'Run your code successfully first'
                : 'Submit for evaluation'
            "
          >
            <span v-if="isSubmitting" class="spinner"></span>
            <span v-else class="material-icons btn-icon">{{
              hasCompiledSuccessfully ? 'check' : 'lock'
            }}</span>
            {{ isSubmitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>

      <!-- Editor Area -->
      <div class="editor-wrapper" v-if="activeFile">
        <CodeEditor
          v-model="activeFile.code"
          :language="currentLanguage"
          @run="runCode"
          @submit="submitWork"
        />
      </div>
      <!-- Fallback if no files -->
      <div v-else class="editor-wrapper"></div>

      <!-- Output Console -->
      <LessonTerminal
        v-model:expanded="consoleExpanded"
        :status-result="compileResult"
        :show-output="showOutput"
        :interactive-output="interactiveOutput"
        :interactive-status="interactiveStatus"
        :exit-code="exitCode"
        :submission="lastSubmission"
        @input="handleInput"
        @next-lesson="handleNextLesson"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

import LoadingOverlay from 'components/LoadingOverlay.vue'
import IntroPage from 'pages/IntroPage.vue'
import CodeEditor from 'components/CodeEditor.vue'
import LessonTerminal from 'components/LessonTerminal.vue'

import { useInteractiveCompiler } from 'src/composables/useInteractiveCompiler'
import { useLessonStore } from '../stores/store'
import { API_BASE_URL } from 'src/config'
import { getMainFileName } from 'src/constants/languages'

export default defineComponent({
  name: 'LessonPage',
  components: {
    LoadingOverlay,
    IntroPage,
    CodeEditor,
    LessonTerminal,
  },
  setup() {
    const leftPane = ref(null)
    const activeFileIndex = ref(0)
    const lessonStartTime = ref(Date.now())

    const lessonStore = useLessonStore()
    const {
      currentLesson,
      isSidebarOpen,
      currentStep,
      isGeneratingLesson,
      lessonError,
      isBackendOnline,
      compileResult,
      editorCode,
      isSubmitting,
      lastSubmission,
      currentLanguage,
    } = storeToRefs(lessonStore)

    const { toggleSidebar, initialize, submitCode, setEditorCode, loadNextLesson } = lessonStore

    // Interactive Compiler
    const {
      runCode: runInteractive,
      sendInput,
      kill,
      output: interactiveOutput,
      status: interactiveStatus,
      exitCode,
    } = useInteractiveCompiler(API_BASE_URL)
    const route = useRoute()
    const router = useRouter()

    // --- State ---
    const showOutput = ref(true)
    const consoleExpanded = ref(false)
    const hasCompiledSuccessfully = ref(false)
    const codeRunning = ref('')

    // --- Computed ---
    const activeFile = computed(() => {
      if (currentLesson.value && currentLesson.value.files) {
        return currentLesson.value.files[activeFileIndex.value] || currentLesson.value.files[0]
      }
      return null
    })

    const moduleName = computed(() => {
      const conceptId = currentLesson.value?.conceptId
      if (!conceptId) return 'Rust Fundamentals'
      const parts = conceptId.split('.')
      if (parts.length >= 2) {
        return parts
          .slice(0, 2)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      }
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    })

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

    const renderedMarkdown = computed(() => {
      if (!currentLesson.value?.content) return ''
      return md.render(currentLesson.value.content)
    })

    // --- Actions ---

    // Watch for route changes to load the correct lesson
    watch(
      () => route.params.lessonId,
      async (newId) => {
        if (newId && newId !== currentLesson.value?.lessonId) {
          await lessonStore.loadLesson(newId)
        }
      },
    )

    const handleNextLesson = async () => {
      const currentLessonData = currentLesson.value
      if (currentLessonData) {
        if (currentLessonData.isIntro) {
          lessonStore.markLessonCompleted(currentLessonData.id)
        }
        await loadNextLesson(currentLessonData.conceptId)

        if (currentLesson.value?.lessonId) {
          router.push({
            name: 'learn',
            params: { language: currentLanguage.value, lessonId: currentLesson.value.lessonId },
          })
        }
      }
    }

    const runCode = async () => {
      showOutput.value = true
      lessonStore.$patch({ lastSubmission: null })
      consoleExpanded.value = true

      // Get code from active file (CodeEditor updates it directly in store/object)
      const code = activeFile.value?.code || editorCode.value

      codeRunning.value = code
      runInteractive(currentLanguage.value, code)
    }

    const handleInput = (input) => {
      sendInput(input + '\n')
    }

    const submitWork = async () => {
      showOutput.value = true
      lessonStore.$patch({ lastSubmission: null })

      if (interactiveStatus.value === 'running') {
        kill()
      }

      try {
        const code = activeFile.value?.code || editorCode.value
        interactiveOutput.value.push({
          type: 'stdout',
          data: '\n> Submitting for evaluation...\n',
        })

        const now = Date.now()
        const timeSpent = now - lessonStartTime.value

        const compiledResult = {
          terminal: [...interactiveOutput.value],
          exitCode: exitCode.value ?? 0,
        }

        await submitCode(code, timeSpent, compiledResult)

        lessonStartTime.value = now
        showOutput.value = true
        consoleExpanded.value = true
      } catch (error) {
        interactiveOutput.value.push({ type: 'stderr', data: `\n> Error: ${error.message}\n` })
      }
    }

    const retryLoad = () => {
      initialize()
    }

    // --- Watchers ---

    watch(currentLesson, (newLesson) => {
      lessonStartTime.value = Date.now()
      showOutput.value = true
      consoleExpanded.value = false
      hasCompiledSuccessfully.value = false
      if (interactiveStatus.value === 'running') kill()

      if (newLesson?.files) {
        const mainName = getMainFileName(currentLanguage.value)
        const mainIndex = newLesson.files.findIndex((f) => f.name.endsWith(mainName))
        // Simple fallback to any file with matching extension if main not found, or just 0
        activeFileIndex.value = mainIndex >= 0 ? mainIndex : 0
      } else {
        activeFileIndex.value = 0
      }

      nextTick(() => {
        if (leftPane.value) {
          leftPane.value.scrollTop = 0
        }
      })
    })
    watch(interactiveStatus, (newStatus) => {
      if (newStatus === 'exited') {
        const currentCode = activeFile.value?.code || editorCode.value
        // Logic: if exited with 0 AND the code hasn't changed since run started -> Compiled Success
        if (exitCode.value === 0 && codeRunning.value === currentCode) {
          hasCompiledSuccessfully.value = true
        } else {
          hasCompiledSuccessfully.value = false
        }
      }
    })

    // Keep store editorCode in sync (optional, store usually updates from action, but here we bind directly)
    watch(
      () => activeFile.value?.code,
      (newCode) => {
        if (newCode !== undefined) {
          setEditorCode(newCode)
          hasCompiledSuccessfully.value = false
        }
      },
    )

    // Watch for submission to expand console
    watch(lastSubmission, (submission) => {
      if (submission) {
        showOutput.value = true
        consoleExpanded.value = true
      }
    })

    onMounted(async () => {
      if (route.params.language && route.params.language !== currentLanguage.value) {
        await lessonStore.loadLessonsForLanguage(route.params.language)
      }
      await initialize()

      if (route.params.lessonId) {
        await lessonStore.loadLesson(route.params.lessonId)
      } else if (currentLesson.value?.lessonId) {
        router.replace({
          name: 'learn',
          params: { language: currentLanguage.value, lessonId: currentLesson.value.lessonId },
        })
      }
    })

    return {
      leftPane,
      activeFileIndex,
      renderedMarkdown,
      isRunning: computed(() => interactiveStatus.value === 'running'),
      isSubmitting,
      showOutput,
      interactiveOutput,
      interactiveStatus,
      exitCode,
      consoleExpanded,

      runCode,
      submitWork,
      handleInput, // for terminal
      handleNextLesson,
      retryLoad,

      currentLesson,
      currentStep,
      moduleName,
      isSidebarOpen,
      toggleSidebar,
      isGeneratingLesson,
      lessonError,
      isBackendOnline,
      compileResult,
      lastSubmission,
      hasCompiledSuccessfully,

      activeFile,
      currentLanguage,
    }
  },
})
</script>

<style src="../css/lesson-page.css" scoped></style>
