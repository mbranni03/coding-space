import { ref, computed } from 'vue'

export interface Lesson {
  id: string
  title: string
  description: string
  isCompleted: boolean
  isLocked: boolean
  content?: string // Markdown content
}

const lessons = ref<Lesson[]>([
  {
    id: '1',
    title: 'Variables & Mutability',
    description: 'Learn how to declare and modify variables in Rust.',
    isCompleted: true,
    isLocked: false,
    content: `
# Rust Basics: Variables

In Rust, variables are **immutable** by default. This is one of the many nudges Rust gives you to write code that takes advantage of the safety and easy concurrency that Rust offers.

### The Task
1. Declare a mutable variable named \`counter\`.
2. Set it to \`0\`.
3. Increment it by \`1\`.
4. Print the result.

\`\`\`rust
fn main() {
    // Your code here
}
\`\`\`

### Hints
- Use the \`mut\` keyword to make a variable mutable.
- Remember to use semi-colons \`;\` at the end of statements.
    `,
  },
  {
    id: '2',
    title: 'Data Types',
    description: 'Understand scalar and compound types.',
    isCompleted: false,
    isLocked: false, // current
    content: `
# Data Types

Rust is a strictly typed language. Let's explore integers, floats, and booleans.

### The Task
1. Create a variable \`x\` of type \`i32\`.
2. Create a variable \`y\` of type \`f64\`.
3. Print them.
    `,
  },
  {
    id: '3',
    title: 'Functions',
    description: 'How to define and call functions.',
    isCompleted: false,
    isLocked: true,
  },
  {
    id: '4',
    title: 'Control Flow',
    description: 'If statements and loops.',
    isCompleted: false,
    isLocked: true,
  },
  {
    id: '5',
    title: 'Ownership',
    description: 'Deep dive into Rust unique ownership model.',
    isCompleted: false,
    isLocked: true,
  },
])

const currentLessonId = ref('2')
const isSidebarOpen = ref(false)

export function useLessons() {
  const currentLessonIndex = computed(() =>
    lessons.value.findIndex((l) => l.id === currentLessonId.value),
  )

  const currentLesson = computed(() => lessons.value[currentLessonIndex.value] || lessons.value[0])

  const nextLesson = () => {
    if (currentLessonIndex.value < lessons.value.length - 1) {
      // Mark current as completed
      lessons.value[currentLessonIndex.value].isCompleted = true

      const nextIndex = currentLessonIndex.value + 1
      lessons.value[nextIndex].isLocked = false
      currentLessonId.value = lessons.value[nextIndex].id
    }
  }

  const prevLesson = () => {
    if (currentLessonIndex.value > 0) {
      currentLessonId.value = lessons.value[currentLessonIndex.value - 1].id
    }
  }

  const setCurrentLesson = (id: string) => {
    const lesson = lessons.value.find((l) => l.id === id)
    if (lesson && !lesson.isLocked) {
      currentLessonId.value = id
    }
  }

  return {
    lessons,
    currentLessonId,
    currentLesson,
    currentLessonIndex,
    nextLesson,
    prevLesson,
    setCurrentLesson,
    isSidebarOpen,
  }
}
