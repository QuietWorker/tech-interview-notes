<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    aria-label="切换深色模式"
  >
    <span class="icon-sun">☀️</span>
    <span class="icon-moon">🌙</span>
  </button>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useData } from 'vitepress'

const { isDark } = useData()

const toggleTheme = () => {
  isDark.value = !isDark.value
}

// Sync with localStorage on mount
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
  } else if (savedTheme === 'light') {
    isDark.value = false
  }
})

// Save to localStorage when theme changes
watch(isDark, newValue => {
  localStorage.setItem('theme', newValue ? 'dark' : 'light')
})
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 25px;
  right: 25px;
  z-index: 1001;
  width: 44px;
  height: 44px;
  background: var(--vp-c-bg);
  border: 1px solid var(--border-light);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.theme-toggle:hover {
  transform: scale(1.05);
}

.dark .theme-toggle {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.icon-sun,
.icon-moon {
  position: absolute;
  transition: all 0.3s ease;
}

:not(.dark) .icon-moon {
  opacity: 0;
  transform: rotate(-90deg) scale(0);
}

.dark .icon-sun {
  opacity: 0;
  transform: rotate(90deg) scale(0);
}

.dark .icon-moon {
  opacity: 1;
  transform: rotate(0) scale(1);
}
</style>
