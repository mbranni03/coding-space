<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="graph-modal-overlay" @click.self="close">
        <div class="graph-modal">
          <div class="modal-close">
            <button class="btn-close" @click="close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <KnowledgeGraph
            :userId="userId"
            :language="language"
            :autoLoad="true"
            @node-click="handleNodeClick"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { defineComponent } from 'vue'
import KnowledgeGraph from './KnowledgeGraph.vue'

export default defineComponent({
  name: 'KnowledgeGraphModal',
  components: {
    KnowledgeGraph,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: null,
    },
  },
  emits: ['close', 'node-click'],
  setup(props, { emit }) {
    const close = () => {
      emit('close')
    }

    const handleNodeClick = (conceptId) => {
      emit('node-click', conceptId)
    }

    return {
      close,
      handleNodeClick,
    }
  },
})
</script>

<style scoped>
.graph-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  padding: 40px;
}

.graph-modal {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 80vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  animation: modal-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: -48px;
  right: 0;
  z-index: 10;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.btn-close .material-icons {
  font-size: 20px;
}

/* Transition */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .graph-modal,
.modal-fade-leave-to .graph-modal {
  transform: scale(0.95);
}
</style>
