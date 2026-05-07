import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '技术面试笔记',
  description: '系统化整理核心技术重难点',

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap',
        rel: 'stylesheet',
      },
    ],
  ],

  themeConfig: {
    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: 'Elpis框架', link: '/elpis/domain-model/index' },
      { text: '为乐PC端', link: '/weile-pc/bpmn/workflow' },
    ],

    // 侧边栏配置 - 按项目组织
    sidebar: {
      '/elpis/': [
        {
          text: 'Elpis 框架',
          collapsed: false,
          items: [
            { text: '领域模型架构设计', link: '/elpis/domain-model/index' },
            { text: 'Webpack5工程化体系', link: '/elpis/webpack-engineering/index' },
            { text: 'JSON Schema动态组件', link: '/elpis/schema-components/index' },
            { text: 'Koa服务端引擎', link: '/elpis/koa-engine/index' },
            { text: 'NPM包封装与解耦', link: '/elpis/npm-package/index' },
            { text: 'Docker容器化与K8s部署', link: '/elpis/docker-k8s/index' },
          ],
        },
      ],
      '/weile-pc/': [
        {
          text: '为乐 PC 端',
          collapsed: false,
          items: [
            { text: 'BPMN 工作流引擎', link: '/weile-pc/bpmn/workflow' },
            { text: '配置驱动开发', link: '/weile-pc/config-driven-dev/index' },
            { text: '表格性能优化', link: '/weile-pc/table-performance/table_performance' },
            { text: '大屏可视化', link: '/weile-pc/largeScreen/large_screen' },
            { text: '权限管理', link: '/weile-pc/permisson/permission' },
            { text: 'Vuex 状态同步', link: '/weile-pc/vuex_state_sync/vuex_state_sync' },
            { text: '复杂表单联动', link: '/weile-pc/complex_form_linkage/complex_form_linkage' },
            {
              text: '上传组件分析',
              link: '/weile-pc/upload_component_analysis/upload_component_analysis',
            },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com' }],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026',
    },

    // 优化大纲显示
    outline: {
      level: 'deep',
      label: '本页目录',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
