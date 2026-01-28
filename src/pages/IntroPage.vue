<template>
  <div class="intro-page">
    <div class="intro-content">
      <div class="intro-header">
        <div class="header-actions">
          <button
            class="btn-map-toggle"
            @click="$emit('toggle-sidebar')"
            title="Toggle Learning Path"
          >
            <span class="material-icons">map</span>
            <span class="btn-label">Path</span>
          </button>
        </div>
        <div class="intro-meta">
          <span class="module-overline">Introduction</span>
        </div>
      </div>

      <div class="markdown-body" v-html="renderedMarkdown"></div>

      <div class="intro-actions">
        <button class="btn btn-primary btn-lg" @click="$emit('continue')">
          <span>Start Learning</span>
          <span class="material-icons">arrow_forward</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

export default defineComponent({
  name: 'IntroPage',
  props: {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  emits: ['continue', 'toggle-sidebar'],
  setup(props) {
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
      return md.render(props.content || '')
    })

    return {
      renderedMarkdown,
    }
  },
})
</script>

<style scoped>
.intro-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #0f0f11;
}

.intro-content {
  max-width: 800px;
  width: 100%;
  padding: 48px 24px;
  margin: auto;
}

.intro-header {
  margin-bottom: 48px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 16px 0;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.btn-map-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #a1a1aa;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  font-weight: 500;
}

.btn-map-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-map-toggle .material-icons {
  font-size: 16px;
}

.module-overline {
  font-size: 0.875rem;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.intro-actions {
  margin-top: 64px;
  display: flex;
  justify-content: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 32px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.btn-lg {
  padding: 16px 48px;
  font-size: 1.125rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Markdown Styles Override if needed to match LessonPage */
.markdown-body {
  color: #d4d4d8;
  font-size: 1.125rem;
  line-height: 1.7;
}

:deep(.markdown-body h2) {
  margin-top: 2em;
  margin-bottom: 1em;
  border-bottom: 1px solid #27272a;
  padding-bottom: 0.5em;
  color: #fff;
}

:deep(.markdown-body p) {
  margin-bottom: 1.5em;
}

:deep(.markdown-body code) {
  background: #18181b;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
}

:deep(.markdown-body pre) {
  background: #18181b;
  padding: 1.5em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  border: 1px solid #27272a;
}
</style>
