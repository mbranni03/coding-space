<template>
  <div class="level-bars" :class="{ 'level-bars-mini': mini }">
    <div v-for="i in 4" :key="i" class="bar" :class="{ active: i <= level }"></div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LevelBars',
  props: {
    level: {
      type: Number,
      default: 1,
    },
    mini: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style scoped>
/*
 * Styles derived from IndexPage but scoped here.
 * Assumes the global variables (if any) or existing color scheme.
 */
.level-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 24px;
}

.level-bars .bar {
  width: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.level-bars .bar:nth-child(1) {
  height: 40%;
}
.level-bars .bar:nth-child(2) {
  height: 60%;
}
.level-bars .bar:nth-child(3) {
  height: 80%;
}
.level-bars .bar:nth-child(4) {
  height: 100%;
}

.level-bars .bar.active {
  background-color: #42b883; /* Vue Green or primary color */
  box-shadow: 0 0 8px rgba(66, 184, 131, 0.4);
}

/* Mini variant */
.level-bars-mini {
  height: 16px;
  gap: 2px;
}

.level-bars-mini .bar {
  width: 3px;
}
</style>
