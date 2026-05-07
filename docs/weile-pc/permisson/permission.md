---
title: 动态路由与权限控制 - 按钮级权限管理
outline: deep
---

# 动态路由与权限控制 - 按钮级权限管理

## 重难点5：动态路由与权限控制 - 按钮级权限管理

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：后端菜单树驱动前端路由，wlConf.router 映射组件路径，WlButton 组件内联权限校验，Vuex 存储全局权限列表，resetRouter 实现权限变更后的动态刷新。</div>
  <ul>
    <li><strong>路由生成：</strong>登录后获取菜单树，通过 wl_global.js 解析为路由配置数组</li>
    <li><strong>按钮控制：</strong>封装 WlButton 组件，通过 rightKey 匹配 getPermissions() 列表</li>
    <li><strong>懒加载：</strong>开发环境 require，生产环境 import() 实现代码分割</li>
    <li><strong>首屏优化：</strong>从全量加载优化至按模块（SystemType）动态导入，体积减少约 60%</li>
    <li><strong>变更处理：</strong>监听 LISTEN_UPDATEURL_PERMISSION，调用 resetRouter 重置路由匹配器</li>
  </ul>
  <div class="one-liner">📌 一句话总结：基于后端返回的菜单树动态构建 Vue Router 实例，结合全局权限列表在组件级别实现细粒度的按钮显隐控制，并通过模块化懒加载显著降低首屏资源体积。</div>
</div>

### 问题1： 动态路由是怎么生成的？菜单树从哪来？ {#q5-1}

<div class="original-text">
动态路由的核心在于“后端驱动”。我们的系统不是一个静态的路由表，而是根据当前登录用户的角色和权限，从后端接口实时拉取菜单树。

生成流程如下：
1. 登录成功后：调用 getCaidanList() 或类似的接口获取用户有权访问的菜单树结构。
2. 存入全局配置：将菜单树存入 wlConf.viewTree，并遍历生成 wlConf.router 映射表（key 到路由对象的映射）。
3. 转换为路由数组：在 src/router/index.ts 中，调用 getRouterArray()。这个函数会遍历 wlConf.router，提取出 path, name, meta 等信息。
4. 动态挂载组件：通过 _import 函数（根据环境不同分为 development 和 production），将路由配置中的 name 字段映射到具体的 .vue 文件路径。
5. 初始化 Router：将这些动态生成的路由数组作为 children 挂载到 layout 布局组件下。

菜单树的来源主要有两个：
- 系统内置模块：在 wl_global.js 中预定义的 viewTree。
- 网站后台自定义：通过 /wangzhan/caidan/chaxun 接口获取管理员配置的自定义菜单。
</div>

```ts
// static/wl/wl_global.js - 自动导入路由
const getRouterArray = function () {
  var routeConf = getRouterConf() // 获取全局路由配置映射
  var routerArray = []
  for (var i in routeConf) {
    var temp = {}
    temp.key = routeConf[i].key
    temp.path = routeConf[i].key1 // 前端访问路径
    temp.name = routeConf[i].path.substr(1) // 组件文件名
    temp.meta = {
      "title": routeConf[i].key1, 
      "icon": "", 
      noCache: true
    }
    routerArray.push(temp)
  }
  return routerArray
}

// src/router/index.ts - 动态挂载
const views = getRouterArray()
views.forEach((val: any) => {
  // _import 会根据环境返回不同的加载函数
  val.component = _import(val.name) 
})

const createRouter = (_views: any) => {
  let routes = initialRoutes(_views)
  return new Router({
    base: getAbsolutePath(),
    routes,
  })
}
```

<div class="memory-aid">
  <ul>
    <li><strong>来源：</strong>后端接口 /wangzhan/caidan/chaxun 或系统预定义</li>
    <li><strong>转换：</strong>wlConf.router -> getRouterArray() -> component = _import(name)</li>
    <li><strong>挂载：</strong>作为 layout 的子路由动态注入</li>
  </ul>
</div>

### 问题2： 按钮级权限是怎么控制的？ {#q5-2}

<div class="original-text">
我们摒弃了传统的 v-if 指令硬编码，而是封装了一个统一的 WlButton 组件来实现按钮级权限控制。

控制逻辑：
1. 权限存储：登录后，用户的权限 Key 列表（如 ['yiqiyuyue:add', 'shijihaocai:delete']）被存入全局对象 __wl_global__.permissions。
2. 组件封装：在 WlButton 组件中，通过 props 接收 rightKey。
3. 实时校验：在 filterButton 方法中，遍历全局权限列表。如果 Config.bAllRight 为真（超级管理员模式）或者 rightKey 存在于权限列表中，则显示按钮。
4. 响应式更新：通过 Watch 监听 userInfo 变化，确保切换账号或权限变更时按钮状态能实时更新。

这种方式的好处是：权限逻辑集中管理，业务页面只需配置 key，无需关心底层判断逻辑。
</div>

```ts
// src/wlframe/components/ts/button/wl_button.ts
@Component({})
export default class WlButton extends WlCompBase {
    @Prop({ type: String })
    readonly rightKey: string; // 按钮对应的权限 Key

    bShowBtn:boolean = false

    created() {
        this.bShowBtn = this.filterButton()
    }

    filterButton() {
        // 1. 超级管理员模式直接放行
        if(Config.bAllRight){
            return true
        }
        let flag = false
        if (this.rightKey == undefined) {
            flag = true
        }
        // 2. 遍历全局权限列表进行匹配
        if(wllib.detect.wlIsNotNullArray(getPermissions())){
            getPermissions().every((item: any) => {
                if (item == this.rightKey) {
                    flag = true
                    return false // 找到即停止遍历
                }
                return true
            })
        }
        return flag
    }

    get rightShow(): boolean {
        return this.filterButton()
    }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>核心组件：</strong>WlButton (src/wlframe/components/ts/button/wl_button.ts)</li>
    <li><strong>校验依据：</strong>getPermissions() 返回的字符串数组</li>
    <li><strong>特殊逻辑：</strong>Config.bAllRight 开启时跳过校验</li>
  </ul>
</div>

### 问题3： 路由懒加载是怎么配置的？ {#q5-3}

<div class="original-text">
为了优化首屏加载速度，我们针对开发环境和生产环境采用了不同的懒加载策略。

1. 生产环境：使用 Webpack 的 import() 语法。这会将每个路由组件打包成独立的 chunk 文件，只有在访问该路由时才会下载。
2. 开发环境：使用 require.ensure 或直接 require。这是为了保证 HMR（热模块替换）的稳定性和调试的便利性。

这种配置通过 src/router/_import_*.js 文件进行隔离，并在主路由文件中根据 process.env.NODE_ENV 动态引入。
</div>

```js
// src/router/_import_production.js
// 生产环境：使用动态 import，Webpack 会自动进行 Code Splitting
module.exports = file => () => import('@/views/' + file + '.vue')

// src/router/_import_development.js
// 开发环境：使用 require，支持 HMR
module.exports = file => require('@/views/' + file + '.vue').default 

// src/router/index.ts
const _import = require('./_import_' + process.env.NODE_ENV)

// 在具体路由配置中使用
val.component = _import(val.name)
```

<div class="memory-aid">
  <ul>
    <li><strong>生产：</strong>import() 实现真正的异步加载和分包</li>
    <li><strong>开发：</strong>require 保证热更新效率</li>
    <li><strong>切换：</strong>通过 process.env.NODE_ENV 自动选择策略</li>
  </ul>
</div>

### 问题4： 首屏资源体积从多少优化到多少？ {#q5-4}

<div class="original-text">
在优化前，项目采用全量导入的方式，所有业务模块（仪器预约、危化品、安全教育等）的代码都被打包进了 app.js，导致首屏资源体积高达 8MB+，加载时间超过 5 秒。

优化措施：
1. 按需加载模块：在 src/router/index.ts 中，通过 checkSystemType(WLConst.systemType.XXX) 判断当前系统是否开启了某个模块。只有开启的模块才会执行 require('../views/xxx/main')。
2. 路由懒加载：配合上述的 _import 机制，未访问的页面不会加载。

优化后：
首屏资源体积下降至 2.5MB 左右，加载时间缩短至 1.5 秒以内。对于只开启了“仪器预约”和“系统管理”的轻量级用户，体积甚至能控制在 1.5MB 以下。
</div>

```ts
// src/router/index.ts - 模块化按需导入
if (checkSystemType(WLConst.systemType.YQYY)) {
  require('../views/yiqiyuyueguanli/main');// 仅当开启仪器预约模块时才加载
}
if (checkSystemType(WLConst.systemType.SJHC)) {
  require('../views/shijihaocai/main');// 仅当开启试剂耗材模块时才加载
}
if (checkSystemType(WLConst.systemType.WHP)) {
  require('../views/weihuapin/main');// 仅当开启危化品模块时才加载
}
```

<div class="memory-aid">
  <ul>
    <li><strong>优化前：</strong>~8MB (全量打包)</li>
    <li><strong>优化后：</strong>~2.5MB (按需加载 + 懒加载)</li>
    <li><strong>手段：</strong>checkSystemType 动态 require + Webpack Chunk</li>
  </ul>
</div>

### 问题5： 权限变更时怎么处理？ {#q5-5}

<div class="original-text">
当管理员在后台修改了某个角色的权限，或者用户切换了账号，前端必须立即感知并更新路由和按钮状态。

处理流程：
1. 触发更新：登录成功或切换角色时，调用 managerLoginData，分发 LISTEN_UPDATEURL_PERMISSION 事件。
2. 重置路由：在 src/router/index.ts 导出的 resetRouter 函数会被调用。它会重新执行 getRouterArray()，并创建一个新的 Router 实例，将其 matcher 赋值给原 router。这会清除旧的路由映射。
3. 刷新权限列表：Vuex 中的 setPermissions mutation 会更新 __wl_global__.permissions。
4. 组件响应：WlButton 组件通过 Watch 监听 userInfo，一旦检测到变化，会重新执行 filterButton，从而自动显隐按钮。
5. 菜单刷新：左侧菜单栏通过 watch userInfo 也会重新调用 getAuList() 并重新计算 menuData。
</div>

```ts
// src/utils/wl_xm_utils.ts - 登录数据处理
export function managerLoginData(loginData: any) {
  wllib.global.WLCommit(WLConst.updateGlobalData, loginData);
  // 触发权限更新事件
  wllib.global.WLDispatchEvent("LISTEN_UPDATEURL_PERMISSION", null)
  wllib.global.WLDispatchEvent("LISTEN_BUTTON_PERMISSION",{});
  // ...其他初始化逻辑
}

// src/router/index.ts - 路由重置
export function resetRouter() {
  const views = getRouterArray()
  views.forEach((val: any) => {
    val.component = _import(val.name)
  })
  // 关键：替换 matcher，实现路由表的动态替换
  router.matcher = createRouter(views).matcher
}
```

<div class="memory-aid">
  <ul>
    <li><strong>入口：</strong>managerLoginData 触发一系列更新</li>
    <li><strong>路由：</strong>router.matcher = newRouter.matcher (Vue Router 官方推荐的重置方式)</li>
    <li><strong>视图：</strong>通过 Vuex 和 Watch 驱动菜单和按钮的重新渲染</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 动态路由与权限控制 · 面试笔记 ——</p>
