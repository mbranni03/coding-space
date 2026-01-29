<template>
  <div class="editor-container">
    <div ref="editorRef" class="editor-mount"></div>
  </div>
</template>

<script>
import { defineComponent, ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { rust } from '@codemirror/lang-rust'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'

export default defineComponent({
  name: 'CodeEditor',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'rust',
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'run', 'submit'],
  setup(props, { emit }) {
    const editorRef = ref(null)
    const editorView = shallowRef(null)

    // Get the appropriate CodeMirror language extension
    const getLanguageExtension = (lang) => {
      switch (lang) {
        case 'python':
          return python()
        case 'javascript':
          return javascript()
        case 'typescript':
          return javascript({ typescript: true })
        case 'rust':
        default:
          return rust()
      }
    }

    const initEditor = () => {
      if (!editorRef.value) return

      // Clean up existing view
      if (editorView.value) {
        editorView.value.destroy()
      }

      const startState = EditorState.create({
        doc: props.modelValue,
        extensions: [
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newCode = update.state.doc.toString()
              emit('update:modelValue', newCode)
            }
          }),
          props.readOnly ? EditorState.readOnly.of(true) : [],
          oneDark,
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          keymap.of([
            // Shortcuts
            {
              key: 'Mod-Enter',
              run: () => {
                emit('run')
                return true
              },
            },
            {
              key: 'Mod-Shift-Enter',
              run: () => {
                emit('submit')
                return true
              },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
          ]),
          getLanguageExtension(props.language),
          EditorView.theme(
            {
              '&': { height: '100%', fontSize: '15px', backgroundColor: '#0b0b0e' },
              '.cm-scroller': { overflow: 'auto', padding: '10px 0' },
              '.cm-gutters': {
                backgroundColor: '#0b0b0e',
                color: '#4a4a4a',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              },
              '.cm-content': {
                caretColor: '#42b883',
                fontFamily: "'Fira Code', monospace",
              },
              '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
              '.cm-activeLineGutter': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
              },
            },
            { dark: true },
          ),
        ],
      })

      editorView.value = new EditorView({
        state: startState,
        parent: editorRef.value,
      })
    }

    // Initialize when mount point is ready
    watch(editorRef, (newVal) => {
      if (newVal) {
        initEditor()
      }
    })

    // Re-init if language changes (to swap highlighter)
    watch(
      () => props.language,
      () => {
        nextTick(() => initEditor())
      },
    )

    // Sync external model updates
    watch(
      () => props.modelValue,
      (newValue) => {
        if (!editorView.value) return
        const currentValue = editorView.value.state.doc.toString()
        if (newValue !== currentValue) {
          editorView.value.dispatch({
            changes: { from: 0, to: currentValue.length, insert: newValue },
          })
        }
      },
    )

    onMounted(() => {
      if (editorRef.value) initEditor()
    })

    onBeforeUnmount(() => {
      if (editorView.value) editorView.value.destroy()
    })

    return {
      editorRef,
    }
  },
})
</script>

<style scoped>
.editor-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.editor-mount {
  height: 100%;
}
</style>
