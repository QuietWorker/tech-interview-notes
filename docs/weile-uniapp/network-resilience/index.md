---
title: 网络容错与用户体验 - 弱网处理与防抖节流
outline: deep
---

# 网络容错与用户体验 - 弱网处理与防抖节流

## 重难点4：网络容错与用户体验 - 弱网处理与防抖节流

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：实验室环境网络不稳定，请求超时与重试机制，全局节流防止重复提交，MAC地址硬件绑定，App端沉浸式全屏展示</div>
  <ul>
    <li><strong>弱网容错：</strong>Request类设置100s长超时，Net层封装Loading与错误提示，App端监听网络状态变化自动刷新</li>
    <li><strong>防抖节流：</strong>重写Vue原型实现全局节流，业务层（如保存、签到）直接调用，防止弱网下用户多次点击导致的数据重复</li>
    <li><strong>MAC绑定：</strong>通过Native TCP插件获取设备MAC，后端校验后返回房间ID，实现“一机一室”的自动化配置</li>
    <li><strong>沉浸体验：</strong>Pages.json配置custom导航栏，CSS隐藏滚动条，配合高分辨率UI设计，打造专业电子班牌视觉</li>
  </ul>
  <div class="one-liner">📌 一句话总结：通过底层网络拦截与上层交互节流双重保障，结合硬件标识绑定，在弱网环境下依然提供稳定、流畅的班牌服务。</div>
</div>

### 问题1：针对实验室弱网环境，做了哪些具体的容错处理？ {#q4-1}

<div class="original-text">
实验室通常位于建筑内部，WiFi信号覆盖不均，且多设备并发时容易拥堵。如果网络请求没有容错，用户会遇到页面卡死、数据加载失败或重复提交等问题。

我主要做了三层处理：

**第一层：请求超时与拦截。** 在 `utils/request.js` 中，我将默认超时时间设置为 100秒（100000ms），虽然较长，但确保了在极慢网络下仍有成功机会。同时在 `utils/net.js` 中封装了统一的 Loading 动画和错误 Modal 提示，避免用户在等待时无所适从。

**第二层：网络状态监听。** 在电子班牌首页 `index.vue` 中，利用 `uni.onNetworkStatusChange` 实时监听网络通断。一旦检测到网络恢复（`isConnected` 为 true），立即触发 `clickLogo` 方法重新拉取课程和房间信息，实现“自愈”。

**第三层：请求锁与防抖。** 对于关键的业务接口（如获取房间详情），设置了 `isRequesting` 标志位。如果上一次请求还没结束，新的请求会被拦截并提示“加载中”，防止弱网下用户因急躁而疯狂点击刷新，导致服务器压力过大。

示例代码：

</div>

```javascript [e:/为乐项目/mobile/src/utils/request.js]
// Request 类中的超时配置
request (options = {}) {
  // 针对弱网环境，设置较长的超时时间（100秒）
  options.timeout = 100000
  options.baseUrl = options.baseUrl || this.config.baseUrl
  // ... 其他配置
  return new Promise((resolve, reject) => {
    // ... uni.request 逻辑
  })
}
```

```vue [e:/为乐项目/dianzibanpai_app/pages/index/index.vue]
// 监听网络状态变化，实现自动重连 updateDisplay(){ uni.getNetworkType({ success: (res)=> {
this.wifiState = res.networkType != "none"; } }); // 当网络从断开变为连接时，自动刷新数据
uni.onNetworkStatusChange(this.setNetworkState); }, setNetworkState(res){ this.wifiState =
res.isConnected; if(this.wifiState){ this.clickLogo(); // 网络恢复后自动刷新 } }
```

<div class="memory-aid">
  <ul>
    <li><strong>长超时：</strong>100s timeout 应对极端拥堵</li>
    <li><strong>自动重连：</strong>onNetworkStatusChange 监听，网通即刷</li>
    <li><strong>请求锁：</strong>isRequesting 标志位防止并发请求</li>
  </ul>
</div>

### 问题2：全局重写 Vue.$on 实现节流的原理是什么？ {#q4-2}

<div class="original-text">
在移动端或触控屏上，用户的点击操作往往不如鼠标精准，容易出现短时间内多次触发的情况。为了在全局范围内控制这种高频操作，我采用了节流（Throttle）策略。

虽然项目中没有直接重写 `Vue.$on`，但我将节流函数挂载到了全局工具库 `wllib.utils` 中。其核心原理是利用闭包记录上一次执行的时间戳。当函数被调用时，检查当前时间与上次执行时间的差值。如果差值小于设定的阈值（如 3000ms），则忽略本次调用；否则执行函数并更新时间戳。

这种做法的好处是，无论用户在 3 秒内点击了多少次“保存”或“签到”按钮，系统只会在第一次点击时响应，从而有效保护后端接口不被刷爆。

示例代码：

</div>

```javascript [e:/为乐项目/mobile/src/utils/wl_utils.js]
/**
 * 节流阀函数：确保函数在 threshhold 毫秒内只执行一次
 * @param fn {Function} 实际要执行的函数
 * @param threshhold {Number} 执行间隔，单位毫秒
 */
const throttle = function (fn, threshhold) {
  var last // 记录上次执行的时间
  var timer // 定时器（预留扩展）
  threshhold || (threshhold = 500) // 默认间隔 500ms

  return function () {
    var context = this
    var args = arguments
    var now = +new Date()

    // 如果距离上次执行的时间小于阈值，则放弃执行
    if (last && now < last + threshhold) {
      // 可以在这里选择是否使用定时器补偿执行
    } else {
      last = now
      fn.apply(context, args) // 执行原函数
    }
  }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>原理：</strong>闭包记录时间戳，对比当前时间与上次执行时间</li>
    <li><strong>效果：</strong>高频触发下，每隔固定时间才执行一次</li>
    <li><strong>应用：</strong>保存提交、扫码签到等易误触场景</li>
  </ul>
</div>

### 问题3：为什么不直接用 lodash 的 throttle，而要自己重写？ {#q4-3}

<div class="original-text">
主要有三个原因：

**第一，轻量化考虑。** 我们的项目是基于 uni-app 开发的，需要同时发布到 H5、小程序和 App 端。lodash 是一个庞大的工具库，如果为了一个 throttle 函数引入整个库，会显著增加打包体积，影响首屏加载速度。

**第二，业务定制需求。** 原生 lodash 的节流在某些边界情况下的表现（如首次执行时机、 trailing edge 处理）可能与我们的业务习惯不完全一致。自己实现的版本可以根据项目需求灵活调整，比如我们目前的实现是“立即执行”模式，更符合用户点击后立即看到反馈的心理预期。

**第三，零依赖维护。** 在早期的 uni-app 生态中，过多的 npm 依赖可能会导致编译兼容性问题。手写一个简单的节流函数只有十几行代码，逻辑清晰，没有任何外部依赖，维护成本极低。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>体积：</strong>避免引入 lodash 大库，保持 App/小程序轻量</li>
    <li><strong>定制：</strong>实现“立即执行”模式，符合点击反馈直觉</li>
    <li><strong>兼容：</strong>减少 npm 依赖，降低 uni-app 多端编译风险</li>
  </ul>
</div>

### 问题4：班牌端的 MAC 地址绑定逻辑是怎么做的？ {#q4-4}

<div class="original-text">
电子班牌是固定在教室门口的硬件设备，为了确保每个班牌只显示对应教室的课程，我们采用了 MAC 地址绑定的方案。

**第一步：获取 MAC。** 由于 H5 和小程序无法直接获取硬件 MAC，我们在 App 端（Android）通过 `uni.requireNativePlugin` 调用了一个自定义的 TCP 原生插件。该插件在 App 启动时（`App.vue onLaunch`）建立 TCP 连接并从底层读取设备的 MAC 地址存入 `globalData`。

**第二步：后端匹配。** 页面加载时，前端携带 MAC 地址请求 `/banpai/detail` 接口。后端数据库里预先录入了“MAC 地址 - 房间 ID”的映射关系。

**第三步：动态渲染。** 拿到房间 ID 后，再请求 `/syjx/sign/getRoomInfoWithClassInfo` 获取具体的课表和考勤数据。这样就实现了“换个教室不用改配置，插上电就能用”的零配置部署。

示例代码：

</div>

```javascript [e:/为乐项目/dianzibanpai_app/App.vue]
// App 启动时通过原生插件获取 MAC
getTCPConnect() {
  const module = uni.requireNativePlugin("TcpModule");
  module.connect({ ip: wlConfig.terminalIP, port: wlConfig.terminalPort }, res => { })
  module.getMac(res => {
    try {
      let mac = res.data.mac;
      this.globalData.mac = mac; // 存入全局变量
    } catch (e) {
      wllib.utils.showToast("Error in obtaining MAC address!", "error");
    }
  });
}
```

```vue [e:/为乐项目/dianzibanpai_app/pages/index/index.vue]
// 页面通过 MAC 换取房间信息 getBindRoomIdByMac(callback){ let mac = getApp().globalData.mac;
wllib.net.wlGet("/banpai/detail", {mac}, false, false, true).then((res)=>{ if(res && res.roomId){
this.roomId = res.roomId; this.getRoomInfo(); // 获取课表 } }) }
```

<div class="memory-aid">
  <ul>
    <li><strong>获取方式：</strong>Native Plugin (TCP模块) 读取 Android 底层信息</li>
    <li><strong>绑定逻辑：</strong>前端传 MAC → 后端查表 → 返回 RoomID</li>
    <li><strong>优势：</strong>硬件与软件解耦，支持批量自动化部署</li>
  </ul>
</div>

### 问题5：App 端如何实现全屏沉浸式体验？ {#q4-5}

<div class="original-text">
电子班牌通常是大尺寸触摸屏，为了让界面看起来像一个专业的数字标牌，我们需要隐藏掉所有系统自带的 UI 元素。

**第一，自定义导航栏。** 在 `pages.json` 中，我将页面的 `navigationStyle` 设置为 `custom`。这样就去掉了顶部的标题栏和返回按钮，让内容可以从屏幕最顶端开始布局。

**第二，CSS 细节优化。** 我在 `App.vue` 的全局样式中添加了 `::-webkit-scrollbar { display: none; }`，彻底隐藏了滚动条。在 UI 设计上，使用了 3840x2160 的 4K 分辨率单位（upx），确保在大屏上显示清晰锐利。

**第三，交互沉浸。** 为了防止用户误触退出，我取消了物理返回键的默认行为，并增加了一个“长按退出”的隐藏功能。用户只有在主界面长按并输入特定的维护密码后，才能退出应用到安卓桌面，保证了设备运行时的封闭性和安全性。

</div>

```json [e:/为乐项目/dianzibanpai_app/pages.json]
{
  "path": "pages/index/index",
  "style": {
    "navigationBarTitleText": "",
    "navigationStyle": "custom" // 开启自定义导航，实现全屏
  }
}
```

```css [e:/为乐项目/dianzibanpai_app/App.vue]
/* 全局隐藏滚动条，提升沉浸感 */
::-webkit-scrollbar {
  display: none;
}
```

<div class="memory-aid">
  <ul>
    <li><strong>配置：</strong>navigationStyle: "custom" 去除原生标题栏</li>
    <li><strong>样式：</strong>CSS 隐藏滚动条，适配 4K 大屏分辨率</li>
    <li><strong>安全：</strong>长按+密码退出机制，防止学生误操作退出</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 网络容错与交互优化 · 面试笔记 ——</p>
