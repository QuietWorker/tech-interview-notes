---
title: 大屏可视化适配与封装
outline: deep
---

# 大屏可视化适配 - 响应式设计与数据刷新

## 重难点4：大屏可视化适配 - 响应式设计与数据刷新

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：基于 1920*1080 设计稿，通过 pxByScreenW/H 动态计算缩放比例，ECharts 组件化封装支持 10+ 图表类型，利用 scrollTop 递增实现表格自动轮播，一套组件库在多个业务大屏中复用。</div>
  <ul>
    <li><strong>适配方案：</strong>JS 动态计算 (pxByScreenW) + CSS vw/vh 函数</li>
    <li><strong>图表封装：</strong>基于 Vue Property Decorator，统一 Prop 接口，监听 resize 重绘</li>
    <li><strong>滚动轮播：</strong>setInterval 驱动 scrollTop 递增，底部停留后循环</li>
    <li><strong>分辨率兼容：</strong>实时获取 window.innerWidth/Height 计算 scale 因子</li>
    <li><strong>复用情况：</strong>沉淀于 wlframe/large_screen，支撑 15+ 个大屏模块</li>
  </ul>
  <div class="one-liner">📌 一句话总结：构建以 1920*1080 为基准的响应式适配体系，封装高可用 ECharts 组件库与自动轮播表格，实现多分辨率下的大屏高质量交付与跨项目复用。</div>
</div>

### 问题1：大屏采用什么适配方案？为什么选择 vw 单位？ {#q4-1}

<div class="original-text">
在大屏开发中，我们采用了"JS 动态缩放 + CSS vw/vh"的组合方案。

1. JS 动态缩放 (pxByScreenW/H)：这是最核心的适配手段。我们在 utils 中定义了转换函数，它会根据当前屏幕宽度与设计稿宽度（1920）的比例，实时计算出像素值。例如，设计稿上 100px 的字体，在 3840 的屏幕上会自动放大到约 200px。
2. CSS vw/vh：在 SCSS 中预定义了 pxTovw 和 pxTovh 函数。对于简单的布局间距或背景图尺寸，直接使用 vw 可以让浏览器自动处理缩放，减少 JS 计算开销。

选择 vw 的原因：

- 视口相关性：vw 是相对于视口宽度的单位，天然适合全屏展示的大屏场景。
- 线性缩放：它能保证元素在不同分辨率下保持等比例缩放，不会出现错位。
- 性能优势：相比于 rem 需要动态修改 html 根节点字号，或者 scale 变换可能导致的模糊，vw 在现代浏览器中渲染性能极佳。
</div>

```js
// src/utils/switchDataByScreen.js

/**
 * 将 px 转成 vw（CSS 中使用）
 * @param {number} $px - 设计稿中的像素值
 * @returns {string} - vw 单位的字符串
 */
export const pxTovw = function ($px) {
  let designWidth = 1920 // 设计稿基准宽度
  return `${($px / designWidth) * 100}vw`
}

/**
 * 将 px 转成 vh（CSS 中使用）
 * @param {number} $px - 设计稿中的像素值
 * @returns {string} - vh 单位的字符串
 */
export const pxTovh = function ($px) {
  let designHeight = 1080 // 设计稿基准高度
  return `${($px / designHeight) * 100}vh`
}

/**
 * 根据屏幕宽度动态缩放数值（JS/Vue 中使用）
 * @param {number} width - 设计稿中的像素值
 * @returns {number} - 缩放后的实际像素值
 */
export const pxByScreenW = function (width) {
  // 获取当前屏幕宽度，兼容多种浏览器环境
  let currentWidth =
    window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth

  if (!currentWidth) return width

  let designWidth = 1920 // 默认设计稿宽度
  let scale = currentWidth / designWidth // 计算缩放比例

  // 保留三位小数，确保精度
  return Number((width * scale).toFixed(3))
}

/**
 * 根据屏幕高度动态缩放数值（JS/Vue 中使用）
 * @param {number} height - 设计稿中的像素值
 * @returns {number} - 缩放后的实际像素值
 */
export const pxByScreenH = function (height) {
  let currentHeight =
    window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight

  if (!currentHeight) return height

  let designHeight = 1080 // 默认设计稿高度
  let scale = currentHeight / designHeight

  return Number((height * scale).toFixed(3))
}
```

```scss
// src/assets/scss/common.scss

// 默认设计稿的宽度
$designWidth: 1920;
// 默认设计稿的高度
$designHeight: 1080;

/**
 * SCSS 函数：px 转 vw
 * 使用示例：font-size: pxTovw(24);
 */
@function pxTovw($px) {
  @return ($px / $designWidth) * 100vw;
}

/**
 * SCSS 函数：px 转 vh
 * 使用示例：margin-top: pxTovh(20);
 */
@function pxTovh($px) {
  @return ($px / $designHeight) * 100vh;
}
```

```js
// src/main.ts - 全局注入

// 自定义全局函数--内联样式、js字符px转vw用
Vue.prototype.$pxToRem = pxToRem
Vue.prototype.$pxTovw = pxTovw
Vue.prototype.$pxTovh = pxTovh
Vue.prototype.$pxByScreenW = pxByScreenW // JS 中调用
Vue.prototype.$pxByScreenH = pxByScreenH // JS 中调用
```

<div class="memory-aid">
  <ul>
    <li><strong>组合拳：</strong>JS 负责复杂数值（如字体、边距），CSS vw 负责简单布局</li>
    <li><strong>基准：</strong>以 1920*1080 为标准，向上向下等比缩放</li>
    <li><strong>优势：</strong>解决不同会议室、展厅大屏分辨率不一致的痛点</li>
  </ul>
</div>

### 问题2：10+种图表类型是怎么封装的？ {#q4-2}

<div class="original-text">
我们将 ECharts 封装成了高度可复用的 Vue 组件，存放在 wlframe/components/ts/large_screen 目录下。

封装策略：

1. 统一接口：所有图表组件都接收 initData（数据源）、nameKey/valueKey（映射键）等通用 Props。
2. 样式标准化：统一配置了深色背景的 tooltip、渐变色系（如 #00BFDC 到 #009EDC）以及响应式字体。
3. 自动化重绘：在组件内部监听 window.resize 事件，调用 chart.resize()。针对 keep-alive 缓存的页面，增加了 activated 钩子处理。
4. 类型覆盖：涵盖了柱状图 (barChart)、折线图 (lineChart)、饼图 (bingtu)、堆叠图 (stackedBarChart)、横向柱状图等 10 余种常用图表。
</div>

```vue
<!-- wlframe/components/ts/large_screen/zhuxingtu/barChart.vue -->
<template>
  <div class="full-view">
    <!-- 图表容器，ID 唯一标识 -->
    <div
      class="wl-chart-bg"
      :id="'barChart_' + echarts_con"
    ></div>
    <!-- 无数据时显示空状态 -->
    <empty
      v-if="!initData.length"
      isFixed
    ></empty>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import Echarts from 'echarts'
import { wllib } from 'src/wlframe'

// 全局挂载 ECharts
Vue.prototype.$echarts = Echarts

@Component({})
export default class ChartE extends Vue {
  // 图表容器唯一标识
  @Prop({ type: String, default: 'echarts_zhuxingtu' })
  readonly echarts_con: any

  // 数据源数组
  @Prop({
    type: Array,
    default: () => {
      return []
    },
  })
  initData: any

  // X 轴数据字段名
  @Prop({ type: String, default: 'name' })
  nameKey: any

  // Y 轴数据字段名
  @Prop({ type: String, default: 'value' })
  valueKey: any

  public $echarts: any

  // 标记是否需要重新绘制（用于 keep-alive 场景）
  needResize: boolean = false

  // ECharts 实例引用
  chartNode: any = null

  mounted() {
    this.echartInit()
  }

  // keep-alive 激活时，如果需要则重绘
  activated() {
    if (this.needResize) {
      this.$nextTick(() => {
        this.needResize = false
        this.chartNode && this.chartNode.resize()
      })
    }
  }

  // 深度监听数据变化，自动重绘
  @Watch('initData', { deep: true })
  handler1() {
    this.echartInit()
  }

  /**
   * 初始化图表
   */
  echartInit() {
    const ele: any = document.getElementById('barChart_' + this.echarts_con)
    const chart: any = this.$echarts.init(ele, 'light')

    // 深拷贝数据，避免污染原数据
    let list: any = wllib.utils.deepClone(this.initData)

    // 提取 X/Y 轴数据
    let xAxisData: any = list.map((i: any) => i[this.nameKey])
    let seriesData: any = list.map((i: any) => i[this.valueKey])

    // 生成配置项
    let options: any = this.getChartOption(xAxisData, seriesData)

    chart.clear()
    chart.setOption(options)

    this.chartNode = chart
    this.computeWindowResize(chart) // 绑定自适应逻辑
  }

  /**
   * 监听窗口变化，自动重绘图表
   * @param chart - ECharts 实例
   */
  computeWindowResize(chart: any) {
    window.addEventListener('resize', () => {
      // 如果图表高度为 0（如被隐藏），标记需要重绘
      if (!chart || !chart._dom || !chart._dom.offsetHeight) {
        this.needResize = true
        return
      }
      chart && chart.resize()
    })
  }

  /**
   * 生成图表配置项
   * @param xAxisData - X 轴数据
   * @param seriesData - 系列数据
   */
  getChartOption(xAxisData: any, seriesData: any) {
    let options: any = {
      // 提示框配置
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'none',
        },
        textStyle: {
          fontSize: this.$pxByScreenW(14), // 响应式字体
        },
        renderMode: 'html',
        formatter(params: any) {
          const item = params[0]
          let name = item.axisValue
          let value = item.value
          let marker: any = `<span class="wl-custom-tooltip-markerStyle" style="background:#3779FF;"></span>`
          return `<div class="wl-custom-tooltip-namestyle">${marker}${name}</div><div class="wl-custom-tooltip-valuestyle wl-pl16">${value}</div>`
        },
        padding: [this.$pxByScreenW(9), this.$pxByScreenW(16)],
        extraCssText: 'box-shadow: inset 0px 0px 4px 0px #66DFF4;border-radius:4px',
        backgroundColor: '#001C32',
        borderColor: '#66DFF4',
        borderWidth: this.$pxByScreenW(1),
      },

      // 网格配置
      grid: {
        x: '3%',
        y: '15%',
        bottom: '7%',
        right: '3%',
        containLabel: true,
      },

      // X 轴配置
      xAxis: [
        {
          type: 'category',
          data: xAxisData,
          axisLine: {
            show: true,
            lineStyle: {
              color: '#2F5A8D',
            },
          },
          axisTick: {
            show: false,
          },
          axisLabel: {
            margin: this.$pxByScreenW(10),
            interval: 0,
            // 文字过长时换行显示
            formatter(params: any) {
              if (params.length > 6) {
                let str1 = params.substr(0, 6)
                let len = params.length > 11 ? 11 : params.length
                let str2 = params.substr(5, len)
                return len >= 11 ? str1 + `\n` + str2 + '...' : str1 + `\n` + str2
              }
              return params
            },
            textStyle: {
              fontSize: this.$pxByScreenW(14),
              color: '#CDCDCD',
              lineHeight: this.$pxByScreenW(18),
            },
          },
          boundaryGap: true,
        },
      ],

      // Y 轴配置
      yAxis: [
        {
          type: 'value',
          axisTick: {
            show: false,
          },
          axisLine: {
            show: false,
          },
          axisLabel: {
            margin: this.$pxByScreenW(10),
            textStyle: {
              color: '#CDCDCD',
              fontSize: this.$pxByScreenW(14),
            },
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'rgba(255,255,255,0.15)',
            },
          },
        },
      ],

      // 系列配置
      series: [
        {
          type: 'bar',
          barWidth: this.$pxByScreenW(28), // 响应式柱宽
          animationDuration: 10000, // 柱状图缓缓上升效果
          emphasis: {
            focus: 'series',
          },
          itemStyle: {
            // 渐变色配置
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: '#00BFDC', // 亮色
                },
                {
                  offset: 1,
                  color: '#009EDC', // 暗色
                },
              ],
              global: false,
            },
          },
          data: seriesData,
        },
      ],
    }
    return options
  }
}
</script>

<style scoped lang="scss"></style>
```

<div class="memory-aid">
  <ul>
    <li><strong>解耦：</strong>业务层只传数据，表现层由组件统一控制</li>
    <li><strong>健壮性：</strong>处理了容器高度为 0 时的重绘异常</li>
    <li><strong>视觉统一：</strong>内置了符合大屏审美的渐变色和 Tooltip 样式</li>
  </ul>
</div>

### 问题3：滚动表格自动轮播怎么实现的？ {#q4-3}

<div class="original-text">
大屏通常需要展示大量实时数据，我们采用了 Element UI el-table 配合原生 DOM 操作来实现无缝轮播。

实现步骤：

1. 启动定时器：在 mounted 阶段开启 setInterval，每 30ms 执行一次 scroll 方法。
2. 递增滚动：每次将 bodyWrapper.scrollTop 增加 1px。
3. 边界处理：当滚动到底部时，清除定时器并停留 1.5 秒，然后将 scrollTop 重置为 0。
4. 交互优化：监听鼠标移入 (MouseEnter) 停止滚动，移出 (MouseLeave) 恢复滚动，方便用户查看细节。
</div>

```typescript
// views/daping/yiqiyuyue/table/table_normal.ts

import { MyVue } from 'src/wlframe/wl/my_vue'
import { Component, Watch, Prop } from 'vue-property-decorator'
import { wllib } from 'src/wlframe'
import biaoti from '../comp/biaoti.vue'

@Component({
  components: {
    biaoti,
  },
})
export default class Table_normal extends MyVue {
  // 数据列表
  @Prop({ type: Array, default: () => [] })
  readonly dataList: any[]

  // 表格配置
  @Prop({ type: Object, default: () => {} })
  readonly tableConf: any

  // 是否自动滚动
  @Prop({ type: Boolean, default: false })
  readonly isAutoScroll: boolean

  // 是否显示序号列
  @Prop({ type: Boolean, default: false })
  readonly isShowIdx: boolean

  // 是否显示边框
  @Prop({ type: Boolean, default: false })
  readonly isShowBorder: boolean

  daibanData: any = []
  showTable: boolean = true
  timeoutTimer: any // 滚动到底的延时计时器
  interval: any // 滚动定时器

  constructor() {
    super()
  }

  mounted(): void {
    // 启动自动滚动，每 30ms 执行一次
    this.interval = setInterval(this.scroll, 30)
  }

  beforeDestroy() {
    // 组件销毁前清除定时器，防止内存泄漏
    clearInterval(this.interval)
  }

  /**
   * 自动滚动核心逻辑
   */
  scroll() {
    if (!this.isAutoScroll) return

    // 获取表格内容总高度
    let maxHeight = this.$refs.table_normal.$el.querySelectorAll('.el-table__body')[0].offsetHeight

    // 获取表格滚动容器
    let bodyWrapper = this.$refs.table_normal.bodyWrapper

    // 可视区域高度
    let clientHeight = bodyWrapper.clientHeight

    // 当前滚动位置
    let scrollTop = bodyWrapper.scrollTop

    // 判断是否到达底部（预留 5px 误差）
    if (Math.abs(scrollTop - (maxHeight - clientHeight)) < 5) {
      // 滚动到底部，清除定时器
      clearInterval(this.interval)

      // 停留 1.5 秒后回到顶部
      this.timeoutTimer = setTimeout(() => {
        this.$refs.table_normal.bodyWrapper.scrollTop = 0
        this.MouseLeave() // 重新启动定时器
      }, 1500)
    }
    // 判断是否在顶部
    else if (scrollTop === 0) {
      // 回到顶部时，停留 1 秒后再继续滚动
      clearInterval(this.interval)
      this.timeoutTimer = setTimeout(() => {
        this.$refs.table_normal.bodyWrapper.scrollTop++
        this.MouseLeave()
      }, 1000)
    } else {
      // 持续向下滚动，每次 1px
      this.$refs.table_normal.bodyWrapper.scrollTop++
    }
  }

  /**
   * 鼠标移入，停止滚动
   */
  MouseEnter() {
    clearInterval(this.interval)
    try {
      clearTimeout(this.timeoutTimer)
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 鼠标离开，继续滚动
   */
  MouseLeave() {
    this.interval = setInterval(this.scroll, 30)
  }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>平滑度：</strong>30ms 间隔配合 1px 增量，视觉效果非常流畅</li>
    <li><strong>容错：</strong>使用 Math.abs 处理不同浏览器下的滚动高度误差</li>
    <li><strong>体验：</strong>支持鼠标悬停暂停，兼顾了展示与交互</li>
  </ul>
</div>

### 问题4：如何保证不同分辨率屏幕下的显示效果？ {#q4-4}

<div class="original-text">
为了保证从 1920*1080 到 4K 甚至超宽屏的显示效果，我们采取了以下措施：

1. 全局比例缩放：通过 $pxByScreenW 函数，所有的字体大小、图标尺寸、边距都会随屏幕宽度线性变化。
2. 弹性布局：大量使用 flex 布局和百分比宽度，避免固定像素导致的溢出或留白。
3. ECharts 自适应：每个图表组件都绑定了 resize 监听，确保窗口拉伸时图表不模糊、不变形。
4. 阈值限制：在 JS 适配函数中，如果获取不到屏幕宽度会返回原值，防止极端情况下的样式崩坏。
5. Keep-alive 处理：针对被缓存的页面，在 activated 钩子中检测并触发重绘。
</div>

```scss
// assets/scss/common.scss - CSS 层面适配

.header-title {
  font-size: pxTovw(24); // 在 1920 屏上是 24px，在 3840 屏上自动变为 48px
  margin-top: pxTovh(20);
  padding: pxTovw(10) pxTovw(20);
}

.daping-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;

  .content-wrapper {
    flex: 1;
    display: flex;
    gap: pxTovw(20); // 响应式间距

    .left-panel {
      width: 25%; // 百分比布局
      min-width: pxTovw(400); // 最小宽度限制
    }

    .center-panel {
      flex: 1;
    }

    .right-panel {
      width: 25%;
      min-width: pxTovw(400);
    }
  }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>全覆盖：</strong>适配 1080P、2K、4K 及各类拼接屏</li>
    <li><strong>一致性：</strong>确保 UI 还原度在不同设备上偏差极小</li>
    <li><strong>性能优化：</strong>防抖处理避免频繁重绘，提升流畅度</li>
  </ul>
</div>

### 问题5：大屏组件在多个项目中的复用情况？ {#q4-5}

<div class="original-text">
这套大屏适配方案和组件库已经成功应用在了多个项目中：

1. 仪器预约大屏 (yiqiyuyue)：展示实时预约状态、利用率排行、预约趋势图。
2. 危化品管理大屏 (weihuapin)：监控库存预警、领用记录轮播、分类统计饼图。
3. 智能硬件大屏 (zhinengyingjian)：集成 IoT 设备数据、视频监控流、用电负荷曲线。
4. 环境监测大屏 (huanjingjiance)：实时温湿度、空气质量 (PM2.5/PM10)、噪音分贝曲线。
5. 人员监测大屏 (renyuanjiance)：在岗人数统计、轨迹热力图、考勤数据分析。
6. 实验室预约大屏 (shiyanshiyuyue)：实验室使用率、空闲时段分布、预约排行榜。
7. 试剂耗材大屏 (shijihaocai)：库存消耗趋势、采购预警、分类占比分析。
8. 智慧用电大屏 (zhihuiyongdian)：实时功率、能耗对比、峰谷平分析。
9. 行为规范大屏 (xingweiguifan)：违规行为统计、整改完成率、安全评分趋势。
10. 火灾监测大屏 (huoyanjiance)：烟雾报警、温度异常、消防设备状态监控。
11. 分类分级大屏 (fenleifenji)：危险源分布、风险等级统计、管控措施落实率。
12. 系统总览大屏 (xitongDaping)：全系统运行状态、关键指标 KPI、告警汇总。

通过将适配工具 (switchDataByScreen) 和基础图表组件放入 wlframe 框架层，新项目的开发效率提升了 60% 以上，只需关注业务数据的接入即可。

</div>

```typescript
// 组件目录结构
// wlframe/components/ts/large_screen/
// ├── bingtu/           // 饼图组件
// ├── zhuxingtu/        // 柱状图组件
// ├── zhexiantu/        // 折线图组件
// ├── rankBar/          // 排行榜组件
// ├── table/            // 滚动表格组件
// ├── cardList/         // 卡片列表组件
// ├── relitu/           // 热力图组件
// ├── tab/              // 标签页组件
// ├── blockTitle.vue    // 区块标题组件
// └── dpHeader.vue      // 大屏头部组件
```

<div class="memory-aid">
  <ul>
    <li><strong>框架化：</strong>wlframe 目录作为核心资产，实现了"一次封装，多处受益"</li>
    <li><strong>模块化：</strong>支持按需引入特定的图表或表格组件</li>
    <li><strong>业务覆盖：</strong>覆盖了科研、安全、资产等多个维度的可视化需求</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 大屏可视化 · 面试笔记 ——</p>
