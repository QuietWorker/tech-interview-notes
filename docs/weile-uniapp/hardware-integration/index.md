---
title: 硬件交互集成 - 扫码器监听与 BLE 蓝牙通信
outline: deep
---

# 硬件交互集成 - 扫码器监听与 BLE 蓝牙通信

## 重难点2：硬件交互集成 - 扫码器监听与 BLE 蓝牙通信

### 问题1： 班牌端没有摄像头，是怎么实现“扫码”签到的？ {#q2-1}

#### 示例代码：扫码监听逻辑 (dianzibanpai_app/utils/wl_utils.js)

```javascript
// 安卓 keyCode 对应字典（部分示例）
const keyCodeEnum = {
  "7": "0", "8": "1", ..., "29": "A", ..., "66": "Enter"
};

/**
 * 监听 keyup 事件回调
 * @param {Object} e - 键盘事件对象
 * @param {Object} that - 调用页面的 this 上下文
 * @param {Function} cb - 获取到完整码后的回调
 */
const keyupCallback = (e, that, cb) => {
  that.nextCode = e.keyCode; // 当前键码
  that.nextTime = new Date().getTime(); // 当前毫秒数

  // 判断是否为连续快速输入（扫码枪特征）
  // 如果时间差 <= 200ms，认为是扫码枪输入；否则视为手动输入，清空缓存
  if (that.lastCode != null && that.lastTime != null && that.nextTime - that.lastTime <= 200) {
    that.code += keyCodeEnum[that.lastCode];
  } else {
    that.code = ""; // 手动输入间隔长，不存储，直接清空
  }

  that.lastCode = that.nextCode;
  that.lastTime = that.nextTime;

  // 情况1：以 Enter 键结束（大多数扫码枪配置）
  if (that.nextCode == 66) {
    if (that.code && (that.nextTime - that.lastTime) <= 200) {
      console.log('扫码成功:', that.code);
      cb && cb(that.code);
      that.resetKeyupEventData(); // 重置状态
    }
  } else {
    // 情况2：无 Enter 键，通过延时判断输入是否结束
    const lastTime = that.lastTime;
    const lastCodeChar = keyCodeEnum[that.lastCode];
    setTimeout(() => {
      if (that.nextTime <= lastTime) { // 期间没有新按键
        if (that.code) {
          console.log('扫码成功(无回车):', that.code + lastCodeChar);
          cb && cb(that.code + lastCodeChar);
          that.resetKeyupEventData();
        }
      }
    }, 200);
  }
}
```

### 问题2： 怎么区分用户是手动键盘输入还是扫码枪快速输入？ {#q2-2}

### 问题3： BLE 蓝牙连接仪器的完整流程是怎样的？ {#q2-3}

BLE（低功耗蓝牙）的连接比经典蓝牙复杂，需要遵循严格的 GATT 协议流程。在 uni-app 或微信小程序中，主要步骤如下：

1. **初始化蓝牙模块：** `uni.openBluetoothAdapter()`。这是所有操作的前提。
2. **搜索设备：** `uni.startBluetoothDevicesDiscovery()`。可以过滤特定 UUID 或名称。
3. **发现设备：** 通过 `uni.onBluetoothDeviceFound()` 监听或 `uni.getBluetoothDevices()` 获取列表。
4. **建立连接：** `uni.createBLEConnection({ deviceId })`。注意 iOS 必须传 deviceId，Android 有时可用 MAC。
5. **获取服务（Services）：** 连接成功后，调用 `uni.getBLEDeviceServices()` 获取设备支持的所有服务 UUID。
6. **获取特征值（Characteristics）：** 针对每个 Service，调用 `uni.getBLEDeviceCharacteristics()`。我们需要找到支持 `write`（写入）和 `notify`（通知）的特征值 ID。
7. **启用通知：** 如果需要接收设备返回的数据，调用 `uni.notifyBLECharacteristicValueChange()` 开启监听。

#### 示例代码：BLE 连接流程

### 问题4： 蓝牙发送指令时，为什么要分包？怎么实现的？ {#q2-4}

#### 示例代码：分包发送逻辑

```javascript
// 示例代码省略
```

### 问题5： 蓝牙连接失败或断开怎么处理？ {#q2-5}

蓝牙通信受环境影响大，容易出现连接超时、意外断开等情况。健壮的处理机制包括：

1. **连接失败：**
   - 提示用户检查蓝牙是否开启、权限是否授权、设备 MAC 是否正确。
   - 提供"重试"按钮，重新触发搜索和连接流程。
2. **意外断开：**
   - 监听 `uni.onBLEConnectionStateChange` 事件。
   - 一旦检测到 `connected: false`，立即清理全局保存的 `deviceId` 和特征值 ID。
   - 关闭蓝牙适配器 `uni.closeBluetoothAdapter()` 释放资源，防止后续连接冲突。
3. **超时处理：**
   - 在搜索和连接阶段设置定时器，如果超过一定时间（如 15s）未成功，主动停止搜索并提示用户。

#### 示例代码：连接状态监听与清理

```javascript
// 监听连接状态变化
uni.onBLEConnectionStateChange(function (res) {
  if (!res.connected) {
    console.warn('蓝牙已断开', res.deviceId)
    wllib.utils.showMsg('蓝牙连接已断开')

    // 清理全局状态
    getApp().globalData.BLEInformation = {
      deviceId: '',
      writeServiceId: '',
      writeCharaterId: '',
    }

    // 关闭适配器，方便下次重新初始化
    closeBluetooth()
  }
})

// 关闭蓝牙模块
export function closeBluetooth() {
  uni.closeBluetoothAdapter({
    success: function (res) {
      console.log('蓝牙模块已关闭')
    },
  })
}
```

--- 硬件交互与 BLE 通信 · 面试笔记 ---
