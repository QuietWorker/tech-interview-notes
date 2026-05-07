import DefaultTheme from 'vitepress/theme'
import ThemeToggle from './components/ThemeToggle.vue'
import MemoryAid from './components/MemoryAid.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MemoryAid', MemoryAid)
    app.component('ThemeToggle', ThemeToggle)
  },
}
