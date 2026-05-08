---
title: 重难点1：多端统一架构 - Uni-app 条件编译与平台适配
outline: deep
---

# 重难点1：多端统一架构 - Uni-app 条件编译与平台适配

## 核心逻辑：一套代码，多端运行。通过条件编译处理平台差异，利用 rpx 实现自适应布局，解决“在我机器上能跑”的跨端难题。

<div class="memory-aid">
  <ul>
    <li><strong>技术选型：</strong>Uni-app (Vue.js) + 条件编译 (#ifdef)</li>
    <li><strong>适配目标：</strong>H5、微信小程序、APP (Android/iOS)、钉钉小程序</li>
    <li><strong>核心手段：</strong>模板/脚本/样式条件编译、rpx 响应式单位、原生 API 封装</li>
    <li><strong>效果：</strong>开发效率提升 60%，维护成本降低 70%，实现多端业务逻辑统一</li>
  </ul>
  <div class="one-liner">📌 一句话总结：以 Uni-app 为基础，通过精细化的条件编译和 rpx 布局，在保持核心逻辑统一的同时，精准适配各平台特性。</div>
</div>

### 问题1：为什么选择 Uni-app？相比原生开发或 React Native 有什么优势？ {#q1-1}

<div class="original-text">
在项目初期，我们面临着 H5、微信小程序、APP 甚至钉钉小程序的多端需求。如果采用原生开发，需要维护 iOS、Android、Web 等多套代码，人力成本极高且迭代缓慢。React Native 虽然也是跨端方案，但在小程序生态的支持上不如 Uni-app 完善。

选择 Uni-app 主要基于以下几点：

1. **多端覆盖广**：一套代码可发布到 iOS、Android、H5、以及各种小程序（微信/支付宝/百度/头条/QQ/钉钉）。
2. **学习成本低**：基于 Vue.js 语法，团队上手快，生态丰富。
3. **性能表现佳**：在小程序和 APP 端，底层渲染接近原生体验，且支持原生插件扩展。
4. **开发效率高**：内置了丰富的组件和 API，配合 HBuilderX 工具链，调试和打包非常方便。

在我们的实验室安全管理系统中，用户既需要在微信里快速扫码预约，也需要在 APP 上进行复杂的危化品管理，Uni-app 完美平衡了这些需求。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>优势：</strong>一套代码多端发布、Vue 语法易上手、小程序生态支持好、接近原生的性能</li>
    <li><strong>场景：</strong>同时满足 H5 传播、小程序便捷访问、APP 深度功能的需求</li>
  </ul>
</div>

### 问题2：条件编译（#ifdef）具体是怎么用的？能举几个实际例子吗？ {#q1-2}

<div class="original-text">
条件编译是 Uni-app 实现多端适配的核心。它允许我们在同一份代码中，根据不同的平台编写特定的逻辑。语法包括 `#ifdef` (如果定义了平台)、`#ifndef` (如果没定义平台) 和 `#endif`。

**实际应用场景一：登录逻辑差异化**
在 `acclogin.vue` 中，不同平台的登录授权方式完全不同：

- **微信小程序**：需要调用 `wx.getUserProfile` 获取昵称，并通过 `uni.login` 获取 code 进行绑定。
- **H5**：如果是外网环境，需要走微信公众号 OAuth2.0 授权流程，跳转获取 code。
- **钉钉小程序**：需要调用钉钉的原生 SDK 获取 authCode。

```javascript
// [acclogin.vue] 登录点击事件的条件编译示例
clickLogin(){
  // <!-- #ifdef MP-WEIXIN -->
  if(!this.nickName){
    // 微信小程序：引导用户授权获取昵称
    wx.getUserProfile({
      desc: '用于绑定当前账号',
      success: (res) => {
        this.nickName = res.userInfo.nickName
        this.loginSystem()
      }
    })
  }else{
    this.loginSystem()
  }
  // <!-- #endif -->

  // <!-- #ifdef H5 || APP-PLUS -->
  // H5 和 APP 直接走账号密码登录流程
  this.loginSystem()
  // <!-- #endif -->

  // <!-- #ifdef MP-ALIPAY -->
  console.log("钉钉登录")
  this.loginSystem()
  // <!-- #endif -->
},
```

**实际应用场景二：静态资源路径处理**
H5 环境下，静态资源的路径可能受部署目录影响，而 APP 和小程序则使用相对路径。

```javascript
// [tabwode.vue] 头像路径的动态处理
data() {
  return {
    // <!-- #ifndef H5 -->
    avatarUrl: '/static/head.png', // APP/小程序使用相对路径
    // <!-- #endif -->
    // <!-- #ifdef H5 -->
    avatarUrl: `${window.wlConfig.H5.publicPath}/static/head.png`, // H5 使用配置的全局路径
    // <!-- #endif -->
  }
}
```

**实际应用场景三：引入特定平台的配置文件**
在 `App.vue` 中，非 H5 平台需要引入本地的 `appConfig.js`，而 H5 则通过动态加载远程配置。

```javascript
// <!-- #ifndef H5 -->
import wlConfig from '@/common/appConfig.js'
// <!-- #endif -->
```

</div>

<div class="memory-aid">
  <ul>
    <li><strong>语法：</strong>`#ifdef PLATFORM` ... `#endif`</li>
    <li><strong>常用平台标识：</strong>`H5`, `MP-WEIXIN`, `APP-PLUS`, `MP-ALIPAY`</li>
    <li><strong>应用点：</strong>登录授权流程、API 调用差异、静态资源路径、UI 细节调整</li>
  </ul>
</div>

### 问题3：不同平台的样式兼容性怎么处理？（如 rpx 转换、刘海屏适配） {#q1-3}

<div class="original-text">
样式兼容是多端开发的另一大痛点。Uni-app 提供了 `rpx` (responsive pixel) 单位来解决屏幕适配问题。

**1. rpx 响应式布局**
`rpx` 可以根据屏幕宽度进行自适应。规定所有屏幕宽为 750rpx。

- 在 iPhone6 (375px) 上，1rpx = 0.5px。
- 在 PC 端 H5 上，通常会有最大宽度限制，防止内容过宽。
  在我们的项目中，所有的间距、字体大小、容器宽度都统一使用 `rpx`。例如在 `wl.scss` 中：

```scss
.footBox {
  height: 100upx; // upx 等同于 rpx
  .btn2 {
    width: 160upx;
    border-radius: 60upx;
  }
}
```

**2. 刘海屏与安全区域适配**
在 `App.vue` 的 onLaunch 生命周期中，我们通过 `uni.getSystemInfo` 获取状态栏高度，并针对微信小程序计算自定义导航栏的高度：

```javascript
uni.getSystemInfo({
  success: function (e) {
    // <!-- #ifdef MP-WEIXIN -->
    Vue.prototype.StatusBar = e.statusBarHeight
    let custom = wx.getMenuButtonBoundingClientRect()
    Vue.prototype.Custom = custom
    // 计算导航栏总高度，确保内容不被刘海或胶囊按钮遮挡
    Vue.prototype.CustomBar = custom.bottom + custom.top - e.statusBarHeight
    // <!-- #endif -->
  },
})
```

**3. 平台专属样式微调**
有时某个样式只在特定平台有问题，我们可以使用 CSS 条件编译：

```css
/* [tabwode.vue] H5 环境下底部按钮位置的修正 */
.myposibot {
  bottom: 80upx;
  /* <!-- #ifdef H5 --> */
  bottom: 100px !important; /* H5 下可能需要更大的间距避开浏览器工具栏 */
  /* <!-- #endif --> */
}
```

</div>

<div class="memory-aid">
  <ul>
    <li><strong>rpx/upx：</strong>以 750rpx 为基准，自动换算不同设备的像素值</li>
    <li><strong>刘海屏适配：</strong>获取 `statusBarHeight` 和胶囊按钮位置，动态计算导航栏高度</li>
    <li><strong>CSS 条件编译：</strong>在 `&lt;style&gt;` 标签内同样可以使用 `#ifdef` 处理平台专属样式</li>
  </ul>
</div>

### 问题4：在开发过程中遇到过哪些跨端兼容的“坑”？怎么解决的？ {#q1-4}

<div class="original-text">
**坑1：H5 环境的回调丢失问题**
在 H5 微信公众号授权时，跳转授权页面会导致 `window` 对象重置，之前存储在全局变量的配置信息会丢失。
**解决方案：** 在 `App.vue` 中，我们将配置信息持久化到 `localStorage` (`uni.setStorageSync`)，并在每次 `onLaunch` 时检查并恢复 `window.wlConfig`。

**坑2：小程序隐私协议与授权变更**
微信小程序近期更新了隐私保护指引，且 `getUserInfo` 接口不再返回真实昵称和头像，改为 `getUserProfile`。
**解决方案：** 及时更新 `acclogin.vue` 中的授权逻辑，增加二次弹窗引导用户点击授权按钮，并对未授权情况进行友好提示。

**坑3：APP 端的版本更新与原生权限**
APP 端无法像 H5 那样实时更新，且涉及相机、定位等敏感权限。
**解决方案：**

- **自动更新：** 在 `App.vue` 中实现了 `androidCheckUpdate`，通过对比服务器版本号，利用 `plus.downloader` 下载 APK 并调用 `plus.runtime.install` 完成静默安装。
- **权限管理：** 在 `manifest.json` 中提前声明所需的 Android 权限（如 `CAMERA`, `ACCESS_FINE_LOCATION`），并在代码中通过条件编译调用原生插件。

**坑4：钉钉与微信的环境冲突**
项目同时支持微信小程序和钉钉小程序，两者的 API 命名空间不同（如 `wx` vs `dd`）。
**解决方案：** 封装统一的工具类 `wllib`，在内部根据 `uni.getSystemInfoSync().platform` 或条件编译来分发不同的 API 调用，对外暴露统一的接口。

</div>

<div class="memory-aid">
  <ul>
    <li><strong>H5 刷新丢失状态：</strong>利用 `Storage` 持久化配置，启动时恢复</li>
    <li><strong>小程序授权变更：</strong>跟进官方最新 API (`getUserProfile`)，优化引导流程</li>
    <li><strong>APP 更新：</strong>利用 `plus` 对象实现 APK 下载与安装，处理原生权限</li>
    <li><strong>多小程序兼容：</strong>通过工具类封装抹平 `wx` 和 `dd` 的 API 差异</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— Uni-app 多端架构 · 面试笔记 ——</p>
