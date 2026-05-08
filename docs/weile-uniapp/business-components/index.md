---
title: 业务组件封装 - wl-list 通用列表与下拉刷新
outline: deep
---

# 业务组件封装 - wl-list 通用列表与下拉刷新

## 重难点3：业务组件封装 - wl-list 通用列表与下拉刷新

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：列表页面重复开发，配置驱动 UI，统一分页/刷新逻辑，扫码集成</div>
  <ul>
    <li><strong>解决：</strong>减少 80% 列表页代码量，统一交互体验（下拉刷新、上拉加载）。</li>
    <li><strong>做法：</strong>基于 mescroll-uni 封装，通过 listConf 定义字段映射，urlConf 定义接口。</li>
    <li><strong>效果：</strong>新列表页只需编写配置文件，支持扫码搜索、状态标签、动态按钮。</li>
  </ul>
  <div class="one-liner">📌 一句话总结：wl-list 是移动端项目的“万能列表”，通过 JSON 配置即可实现带分页、搜索、扫码的复杂列表页。</div>
</div>

### 问题1： 你们的 wl-list 组件主要解决了什么问题？ {#q3-1}

<div class="original-text">
在移动端项目中，列表页是最常见的页面类型。传统开发中，每个列表页都要写一遍分页逻辑、下拉刷新、空状态处理、数据渲染等，导致代码冗余且维护困难。

**wl-list 组件主要解决了以下痛点：**

1. **重复劳动：** 将分页请求、mescroll 初始化、数据合并逻辑封装在内部，业务层只需关注数据结构。
2. **交互统一：** 确保全站的列表页拥有统一的刷新动画、加载更多提示和错误处理。
3. **配置化渲染：** 通过 `listConf` 对象控制标题、副标题、图片、状态标签和底部按钮的显示，无需修改模板代码。
4. **功能集成：** 内置了搜索框和扫码入口，支持扫码后自动触发列表查询。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>核心价值：</strong>去重、统一交互、配置化。</li>
    <li><strong>技术栈：</strong>Vue + mescroll-uni + wllib (网络库)。</li>
  </ul>
</div>

### 问题2： wl-list 是如何实现“配置驱动”的？ {#q3-2}

<div class="original-text">
wl-list 的核心在于 `handleDataList` 方法。它接收后端返回的原始数据和前端传入的配置对象 `listConf`，进行深度合并。

**配置项说明：**

- **title:** 定义主标题对应的字段名。
- **itemConf:** 数组形式，定义每一行副标题的字段名、标签文本以及是否需要进行枚举转换 (`opKey`)。
- **statusConf/imgConf:** 定义右上角状态或左侧图片的显示逻辑。
- **btnConf:** 定义底部操作按钮的文案、样式类型（primary/danger/disable）及事件名。

**示例代码：**

```javascript
// pages/example/example_conf.js
export const listConf = {
  placeholderConf: '请输入名称或编号', // 搜索框占位符
  isSel: false, // 是否开启多选模式
  title: { field: 'name', style: '' }, // 标题字段
  statusConf: {
    field: 'status',
    opKey: 'enum_status', // 关联全局枚举，自动转换颜色和文本
  },
  itemConf: [
    { field: 'location', label: '位置:', style: '', opKey: '' },
    { field: 'createTime', label: '时间:', style: '', opKey: '' },
  ],
  btnConf: [
    { label: '编辑', type: 'primary', name: 'edit' },
    { label: '删除', type: 'danger', name: 'delete' },
  ],
}
```

在组件内部，通过遍历 `dataList`，为每一项动态挂载 `listConf` 的深拷贝，并根据 `field` 从原始数据中提取值填充到 `val` 属性中。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>关键方法：</strong>`handleDataList(dataList, listConf)`。</li>
    <li><strong>数据流向：</strong>API 响应 -> 字段映射/枚举转换 -> 挂载到 item.listConf -> 模板渲染。</li>
    <li><strong>优势：</strong>UI 变更只需改 JS 配置，无需触碰 HTML/CSS。</li>
  </ul>
</div>

### 问题3： 下拉刷新和上拉加载用的是哪个库？有什么优化？ {#q3-3}

<div class="original-text">
我们使用的是 **mescroll-uni** 插件。它是一个高性能的跨端滚动组件，专门解决 uni-app 在不同平台（H5、小程序、App）上的滚动兼容性问题。

**优化点：**

1. **自动分页管理：** 组件内部维护 `pageNum` 和 `pageSize`，通过 `upCallback` 自动触发下一页请求。
2. **智能重置：** 当用户点击搜索或下拉刷新时，调用 `mescroll.resetUpScroll()` 自动清空旧数据并重置页码为 1。
3. **性能优化：** 使用 `v-for` 渲染时，配合 `key` 确保 DOM 复用；对于大数据量，建议开启 mescroll 的懒加载或虚拟滚动（视具体版本而定）。
4. **错误重试：** 如果接口请求失败，调用 `mescroll.endErr()`，用户点击“加载更多”即可重新发起请求，提升用户体验。

**核心代码片段：**

```javascript
/*上拉加载的回调*/
upCallback(page) {
  // page.num 是当前页码，page.size 是每页条数
  this.getList(page.num, page.size);
},
/*下拉刷新的回调*/
downCallback(mescroll) {
  mescroll.resetUpScroll(); // 自动触发 upCallback(1, size)
}
```

</div>

<div class="memory-aid">
  <ul>
    <li><strong>库名：</strong>mescroll-uni。</li>
    <li><strong>核心 API：</strong>`resetUpScroll()` (刷新), `endSuccess()` (成功), `endErr()` (失败)。</li>
    <li><strong>体验：</strong>支持下拉回弹动画和底部“没有更多了”提示。</li>
  </ul>
</div>

### 问题4： 如何在列表中集成扫码功能？ {#q3-4}

<div class="original-text">
扫码功能是通过 `wl-query-head` 子组件集成的。在 `wl-list` 的模板顶部引入了该组件，并通过 `isscan` 属性控制显隐。

**实现流程：**

1. **入口：** 用户在搜索栏右侧点击扫码图标。
2. **调用：** `wl-query-head` 调用 `wllib.utils.scanCode` 唤起原生相机。
3. **回调：** 扫码成功后，通过 `$emit('scanHandler', result)` 将结果抛回给父页面。
4. **业务处理：** 父页面监听 `@scanHandler`，通常是将扫码结果赋值给搜索关键词，并主动调用 `wl-list` 的 `resetQuery()` 或 `getList(1, 10)` 触发查询。

**示例代码：**

```html
<!-- 页面模板 -->
<wl-list
  :listConf="listConf"
  :urlConf="urlConf"
  isscan
  @scanHandler="handleScanResult"
></wl-list>

<!-- 页面脚本 -->
<script>
  export default {
    methods: {
      handleScanResult(code) {
        // 1. 将扫码结果填入搜索框（如果需要）
        // 2. 触发列表按扫码结果查询
        this.$refs.tableRef.search(code)
      },
    },
  }
</script>
```

</div>

<div class="memory-aid">
  <ul>
    <li><strong>组件协作：</strong>wl-list (容器) + wl-query-head (搜索/扫码)。</li>
    <li><strong>通信方式：</strong>Props 传递配置，Events 传递扫码结果。</li>
    <li><strong>应用场景：</strong>资产盘点、仪器预约、危化品追溯等需要快速定位的场景。</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 移动端业务组件 · 面试笔记 ——</p>
