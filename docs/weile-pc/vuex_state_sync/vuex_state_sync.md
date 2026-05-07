---
title: Vuex状态管理 - 跨页面状态同步
outline: deep
---

# Vuex状态管理 - 跨页面状态同步

## 重难点6：Vuex状态管理 - 跨页面状态同步

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：模块化设计（Root + Frame + TagsView），全局常量驱动 Mutation，Action 异步获取并分发，配合 keep-alive 实现跨页面状态同步与缓存。</div>
  <ul>
    <li><strong>架构：</strong>Root Store (业务数据) + Frame Store (框架参数) + TagsView Store (页签/缓存)</li>
    <li><strong>通信：</strong>通过 WLConst 定义常量，利用 wllib.global.WLCommit 统一触发 Mutation</li>
    <li><strong>同步：</strong>在 activated 钩子中监听路由参数或重新拉取状态，解决跨页返回数据陈旧问题</li>
    <li><strong>一致性：</strong>采用“单一数据源”原则，字典类数据集中存储，业务对象以 ID 为准实时查询</li>
  </ul>
  <div class="one-liner">📌 一句话总结：基于 Vuex 构建分层状态树，通过标准化 Commit 机制实现全局配置、用户信息及页签状态的实时同步，结合路由守卫与生命周期确保跨页面数据一致性。</div>
</div>

### 问题1： Vuex 的模块化结构是怎么设计的？ {#q6-1}

<div class="original-text">
我们的 Vuex 采用了模块化的设计方案，主要分为根模块（Root）、框架模块（Frame）和页签模块（TagsView）。

1. 根模块 (src/vuex/index.ts)：负责管理全局性的业务数据。例如：登录状态 (isLogin)、系统配置 (systemConf)、各类字典枚举 (typeEnumList)、消息通知计数 (msgList) 等。这些数据在整个应用的生命周期内都需要频繁访问。
2. 框架模块 (src/wlframe/vuex/index.ts)：存放框架层面的基础状态，如路由参数 (routerParam) 和动态组件列表 (comps)。这部分通常由底层框架自动维护。
3. 页签模块 (src/views/layout/comps/tags_view_store.ts)：专门处理多页签功能。它维护了 visitedViews（已访问页签列表）和 cachedViews（keep-alive 缓存列表）。当用户切换路由时，通过 Mutation 更新这两个数组，从而实现页签的增删改查和组件缓存。

这种设计的好处是职责分明：业务逻辑不干扰框架运行，页签状态独立管理，避免了根 Store 过于臃肿。
</div>

```ts
// src/vuex/index.ts - 根模块注册
const modules: any = {
    frame,      // 框架层状态
    tagsView,   // 页签与缓存状态
}

export default new Vuex.Store({
    state,      // 业务全局状态
    mutations,
    modules,
    actions,
});
```

```ts
// src/views/layout/comps/tags_view_store.ts - 页签模块
const state: TagsViewState = { 
    cachedViews: [], // 缓存的组件名
    visitedViews: [], // 顶部显示的页签
    visible: false,
    left: 0,
    top: 0,
    selectedTag: {} as any,
} as any;

const mutations = {
    ['addVisitedViews'](state: TagsViewState, view: RouterData){
        // 判重后加入 visitedViews
        if(state.visitedViews.some((v: TagsViewData) => v.path === view.path)){
            return;
        }
        state.visitedViews.push({ name: view.name, path: view.path, title: view.meta.title });
    },
    ['DEL_VISITED_VIEWS'](state: TagsViewState, view: RouterData){
        // 同时从 visitedViews 和 cachedViews 中移除
        // ...
    }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>分层：</strong>Root（业务/字典）、Frame（路由/组件）、TagsView（页签/缓存）</li>
    <li><strong>目的：</strong>解耦业务与框架，提升状态管理的可维护性</li>
    <li><strong>关键：</strong>TagsView 模块直接决定了 keep-alive 的缓存行为</li>
  </ul>
</div>

### 问题2： 预约状态机是怎么设计的？ {#q6-2}

<div class="original-text">
在仪器预约等复杂业务中，状态流转非常频繁。我们并没有在 Vuex 中维护一个庞大的“预约状态机”对象，而是采用了“后端驱动 + 前端枚举映射”的模式。

1. 状态定义：在 static/wl/wl_const.js 中定义了 auditStauts（审核流程结果状态）和 nodeStatus（审核节点状态）。这些是全局通用的状态字典。
2. 状态获取：列表页或详情页通过 API 请求获取带有 zhuangtai（状态字段）的数据对象。
3. 状态展示：前端根据 zhuangtai 的值（如 'SHENHEZHONG', 'YUYUECHENGGONG'），结合枚举工具方法 getEnumValue 显示对应的中文标签。
4. 状态变更：用户在页面执行操作（如“取消预约”、“提交审核”）后，调用后端接口。接口成功后，前端通过 this.query() 重新拉取列表，从而获得最新的状态。

虽然状态本身存在数据库，但我们在 Vuex 中存储了 typeEnumList（类型字典），用于在表单中选择预约类型或物资类型时提供选项支持。
</div>

```js
// static/wl/wl_const.js - 全局状态字典
auditStauts: [
    { label: "草稿", value: 'init' },
    { label: "审核等待", value: 'wait' },
    { label: "审核中", value: 'checking' },
    { label: "审核通过", value: 'pass' },
    { label: "审核拒绝", value: 'refuse' },
    { label: "审核撤销", value: 'cancel' },
],

// src/views/yiqiyuyueguanli/yuyuejiluguanli/yuyuejilu.ts - 状态校验逻辑
quxiao() {
    // 只有特定状态下才允许取消
    let verifyArr = ['SHENHEZHONG', 'YUYUECHENGGONG']
    let verify = this.state.selectedList.list.every(item => verifyArr.includes(item.zhuangtai))
    if (verify) {
        // 调用取消接口
        wllib.net.wlPostJson(Config.ajaxUrl + '/yiqiyuyuejilu/quxiao', ...)
    }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>模式：</strong>后端持久化状态，前端通过 API 实时同步</li>
    <li><strong>字典：</strong>Vuex 存储 typeEnumList，wl_const 存储 auditStauts</li>
    <li><strong>流转：</strong>操作 -> 接口 -> 刷新列表 -> 视图更新</li>
  </ul>
</div>

### 问题3： 跨页面状态同步遇到的坑有哪些？ {#q6-3}

<div class="original-text">
在多页签（Tabs）环境下，跨页面同步最大的痛点是“数据陈旧”。比如你在 A 页面修改了某个仪器的名称，切换到 B 页面查看该仪器详情时，发现名字还是旧的。

主要坑点与解决方案：

1. Keep-alive 缓存导致不刷新：为了性能，我们开启了 keep-alive。但这意味着组件的 created/mounted 只会执行一次。
   - 解决：利用 Vue 的 activated 钩子。每次页签被激活时，检查是否需要刷新数据。
2. 路由参数传递失效：有时通过 query 传参，但在缓存页面中 query 变化不会触发 watch。
   - 解决：在 activated 中手动读取 this.$route.params 或 this.$route.query。
3. 弹窗关闭后的联动：在详情页弹出审核框，审核完成后需要刷新主列表。
   - 解决：在 wlPopupUI 的回调函数中执行 this.query()，或者通过 Vuex 触发一个全局的刷新事件。
</div>

```ts
// src/views/yiqiyuyueguanli/yuyuejiluguanli/yuyuejilu.ts
activated() {
    // 每次页签激活时，重置默认时间范围并刷新数据
    this.setDefDate();
    this.updateXuanze(true);
    
    // 处理路由携带的参数
    if (this.$route.params.yemiancanshu) {
        let yemiancanshu: any = this.$route.params.yemiancanshu;
        this.query([yemiancanshu]);
    }
}

// 弹窗回调联动
linkPopup(listConf: any, pageDisabled: boolean) {
    let attach: any = { id: listConf.row.id, pageDisabled: true };
    // 第三个参数是关闭弹窗后的回调
    wllib.framework.wlPopupUI("yiqiyuyueguanli_yuyuejiluguanli_xiangqing", attach, () => {
        this.query(); // 关键：在这里刷新列表，确保数据同步
    });
}
```

<div class="memory-aid">
  <ul>
    <li><strong>核心钩子：</strong>activated（替代 created 处理缓存页面的二次进入）</li>
    <li><strong>联动技巧：</strong>利用弹窗组件的 onClose 回调触发父级刷新</li>
    <li><strong>避坑：</strong>不要依赖 mounted 处理缓存页面的数据更新</li>
  </ul>
</div>

### 问题4： 如何避免状态冗余和不一致？ {#q6-4}

<div class="original-text">
为了避免 Vuex 变成“大杂烩”，我们遵循以下原则：

1. 最小化存储：只存“全局共享”且“改变频率不高”的数据。例如：用户信息、权限列表、系统配置、字典项。具体的业务数据（如某条预约记录）只存在组件本地 state 中。
2. 唯一数据源：对于字典类数据（如试剂类型、危化品类型），全系统只有一份，存放在 Vuex 的 typeEnumList 中。所有组件通过 mapState 或 wllib.utils.getEnumValue 访问，确保显示一致。
3. 自动化同步：在登录成功或系统初始化时，通过 Actions 自动拉取最新的配置和字典（如 UPDATE_SYSTMEINFO, UPDATE_TYPENUM_LIST）。
4. 权限驱动：在 Action 中增加权限校验（如 rightList.includes('message:chaxun')），只有拥有权限时才去拉取对应的状态，减少无效的网络请求和状态冗余。
</div>

```ts
// src/vuex/index.ts - Action 中的权限控制与自动同步
[WLConst.MSG_CNT](state: any, data: any): void {
    if (wllib.global.WLXMVuex().state.isLogin) {
        let rightList = getPermissions();
        // 只有拥有消息查询权限才去拉取计数
        let flag = rightList.includes('message:chaxun');
        if(!flag) return;
        
        wllib.net.wlGet(Config.ajaxUrl + '/message/weidu', {}).then((res: any) => {
            wllib.global.WLCommit(WLConst.MSG_CNT, res.data);
        })
    }
},

// 字典数据的统一更新
[WLConst.UPDATE_TYPENUM_LIST](state: any, data: any): void {
    state.typeEnumList.length = 0;
    if (wllib.detect.wlIsNotNullArray(data)) {
        data.forEach((item: any) => {
            state.typeEnumList.push(item);
        });
    }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>原则：</strong>全局存字典/配置，局部存业务数据</li>
    <li><strong>手段：</strong>Actions 增加权限过滤，登录后自动初始化全局字典</li>
    <li><strong>效果：</strong>减少了 80% 的重复字典请求，保证了全系统枚举值的一致性</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— Vuex 状态管理 · 面试笔记 ——</p>
