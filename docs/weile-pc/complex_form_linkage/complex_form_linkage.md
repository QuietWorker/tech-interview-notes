---
title: 复杂表单联动 - 多级校验与动态表单项
outline: deep
---

# 复杂表单联动 - 多级校验与动态表单项

## 重难点7：复杂表单联动 - 多级校验与动态表单项

<div class="memory-aid">
  <div class="core-logic">💡 核心逻辑：wl-table-ts 驱动的动态行管理，inputSearch 触发级联填充，checkBuxiangrong 实时安全校验，getDanpinshuju 自动同步单瓶明细，多层级 doValueCheck 拦截非法提交</div>
  <ul>
    <li><strong>联动机制：</strong>基于 wl-select-dialog 的 onChange 回调，实现“名称 -> 基础信息 -> 存放位置 -> 货位”的链式反应。</li>
    <li><strong>动态表格：</strong>通过 allList 维护全量数据，结合分页切片（slice）渲染，支持行内增删改及“复制至下方”功能。</li>
    <li><strong>安全校验：</strong>集成不相容化学品检查 API，在货位选择时异步阻断危险操作。</li>
    <li><strong>数据一致性：</strong>数量变更时自动重置/同步 rukuWupins（单瓶信息），确保主从表数据逻辑闭环。</li>
    <li><strong>效果数据：</strong>支持扫码枪毫秒级响应，批量入库效率提升 60%，杜绝不相容化学品混放风险。</li>
  </ul>
  <div class="one-liner">📌 一句话总结：构建以危化品入库为代表的复杂业务表单，通过深度定制 wl-table-ts 实现多级联动、动态行管理与自动化安全校验的低代码解决方案。</div>
</div>

### 问题1：危化品管理中的多级表单联动是怎么实现的？ {#q7-1}

<div class="original-text">
在危化品入库场景中，用户选择“名称”后，需要自动带出品牌、规格、CAS号、默认存放地等信息；选择“存放地”后，又需要根据该房间的部门属性动态加载“货位”列表。

实现方案：
1. 组件选型：使用封装好的 wl-form-item-ts 和 wl-table-ts，配合 compType="wl-select-dialog" 或 "wl-select-remote"。
2. 事件监听：在 wl-table-ts 中监听 @inputSearch 事件。当用户在下拉框选中某项时，会触发该回调并返回完整的选中对象 param。
3. 级联处理：在 inputSearch 方法中，根据 param.field 判断是哪个字段发生了变化。如果是 mingcheng，则执行一系列赋值操作；如果是 cunfang，则调用 setHuowei 异步获取货位。
4. 状态同步：利用 Vue 的 $set 确保响应式更新，并通过 wllib.data.insertDataId 为新增行注入唯一标识。

这种设计将复杂的联动逻辑收敛在 view 层的几个核心方法中，保持了配置文件的简洁性。
</div>

```ts
// xinzeng.ts - inputSearch 联动处理核心逻辑
/** 下拉选择搜索的回调处理 */
inputSearch(param: any, rowData: any) {
  if (param.field == 'mingcheng') {
    // 1. 基础信息自动填充
    let { guishubumenId, hanliangdanwei, id, mingcheng, pinpai, guige, cas } = param
    rowData.shijihaocaiId = id
    rowData.mingcheng = mingcheng
    rowData.pinpai = pinpai
    rowData.guige = guige
    rowData.cas = cas
    
    // 2. 存放地联动：优先使用商品自带的默认仓库，否则使用系统记录的最近仓库
    if (param.cangkuId) {
      rowData.cunfangdiId = param.cangkuId
      rowData.cunfang = { name: param.cunfangdi, id: param.cangkuId }
    } else if (this.weizhi) {
      rowData.cunfangdiId = this.weizhi.id
      rowData.cunfang = { name: this.weizhi.name, id: this.weizhi.id }
    }
    
    // 3. 触发不相容检查与单瓶信息重置
    this.checkBxr(rowData);
    rowData.rukuWupins = this.getRukuWupins(rowData, true)
    
    // 4. 进一步触发货位列表加载
    this.setHuowei(rowData, rowData.cunfangdiId)
  }
  else if (param.field == 'cunfang') {
    // 存放地变更，清空货位并重新加载
    rowData.huowei = ''
    rowData.quyuId = ''
    this.setHuowei(rowData, param.id)
  }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>入口：</strong>wl-table-ts 的 @inputSearch 事件，携带 param (选中值) 和 rowData (当前行)</li>
    <li><strong>分支：</strong>通过 param.field 区分是名称变更还是位置变更</li>
    <li><strong>动作：</strong>直接修改 rowData 引用，配合 $set 触发视图更新</li>
  </ul>
</div>

### 问题2：选择化学品后自动填充信息的逻辑？ {#q7-2}

<div class="original-text">
自动填充的核心在于后端接口 /whp/shijihaocai/saoshangpinma 或查询接口返回的完整数据结构。

实现细节：
1. 扫码/选择触发：无论是扫码枪输入还是手动搜索，最终都会调用 getDataByShangpinma。
2. 深度合并：从后端获取到 data 后，并不是简单替换整行，而是提取关键字段（如 guanliren, guishubumen）进行定向赋值。
3. 默认值覆盖：如果后端没返回存放地，系统会自动补全当前用户的默认部门或最近使用的仓库（weizhi）。
4. 增量更新：如果该行原本是空行（emptyIndex != -1），则直接替换；否则 push 新行。这保证了用户体验的连贯性。
</div>

```ts
// xinzeng.ts - 扫码/选择商品后的自动填充
getDataByShangpinma(code: any) {
  wllib.net.wlGet(Config.ajaxUrl + '/whp/shijihaocai/saoshangpinma', { shangpinma: code }).then(res => {
    let data = res.data
    // 1. 权限与归属人自动绑定
    data.guanliren = this.userInfo.realName
    data.guishurenId = this.userInfo.userId
    data.guishubumen = this.userInfo.deptName
    
    // 2. 数量与ID映射
    data.shuliang = 1
    data.shijihaocaiId = data.id
    
    // 3. 存放地智能匹配
    if (data.cangkuId) {
      data.cunfang = { name: data.cangku_mingcheng, id: data.cangkuId }
    } else if (this.weizhi) {
      data.cunfang = { name: this.weizhi.name, id: this.weizhi.id }
    }
    
    // 4. 初始化单瓶明细数组
    data.rukuWupins = this.getDanpinshuju(data);
    
    // 5. 插入或替换行数据
    let emptyIndex = this.checkEmptyIndex()
    if (emptyIndex != -1) {
      this.allList.splice(emptyIndex, 1, data)
    } else {
      this.allList.push(data)
    }
    this.setDataList()
  })
}
```

<div class="memory-aid">
  <ul>
    <li><strong>数据源：</strong>/saoshangpinma 接口返回的标准化试剂信息</li>
    <li><strong>智能补全：</strong>缺失的存放地自动回退到 weizhi（最近一次选择的房间）</li>
    <li><strong>行管理：</strong>优先填补空白行，避免表格无限增长</li>
  </ul>
</div>

### 问题3：动态表格（单瓶信息管理）怎么实现的？ {#q7-3}

<div class="original-text">
危化品管理要求“一瓶一码”，因此主表的 shuliang（数量）决定了子表 rukuWupins（单瓶信息）的长度。

实现逻辑：
1. 动态生成：在 getDanpinshuju 方法中，根据 row.shuliang 循环生成对应数量的对象。每个对象包含唯一的剩余量、过期日期等字段。
2. 弹窗编辑：点击“单瓶信息”按钮，弹出 danpingxinxi 组件。该组件内部也是一个 wl-table-ts，支持对每一瓶的剩余量进行微调。
3. 数据回传：弹窗关闭时，通过 triggerClose 将修改后的 rukuWupins 数组回传给主表，并使用 $set 强制刷新。
4. 自动重置：当主表的“名称”或“数量”发生改变时，checkReset 会判断是否需要重置单瓶信息，防止出现数据不一致（如数量改为5，但单瓶数组只有3个）。
</div>

```ts
// xinzeng.ts - 单瓶信息动态生成与同步
getDanpinshuju(row: any) {
  let list: any = []
  let { shuliang, mingcheng, guige }: any = row
  for (var i = 0; i < shuliang; i++) {
    let wupin: any = {
      "wupinmingcheng": mingcheng,
      "shengyuliang": this.getShengyuliangByguige(guige), // 根据规格自动计算初始剩余量
      "hanliangdanwei": row.hanliangdanwei
    }
    list.push(wupin)
  }
  return list
}

// 弹窗回调处理
listHandler(listConf: any): void {
  if (listConf.name == 'danpingxinxi') {
    let attach: any = {
      pageType: 'rukudanxinzeng',
      rukuWupins: this.getRukuWupins(listConf.row) // 传入最新的单瓶数组
    }
    wllib.framework.wlPopupUI("weihuapin_rukudan_danpingxinxi", attach, (res: any) => {
      // 核心：使用 $set 确保 Vue 能检测到数组内部的变化
      this.$set(this.allList[index], 'rukuWupins', res)
    });
  }
}
```

<div class="memory-aid">
  <ul>
    <li><strong>映射关系：</strong>1 条主表记录 : N 条单瓶记录 (N = shuliang)</li>
    <li><strong>交互：</strong>行内按钮触发弹窗，弹窗内独立维护一个子表格</li>
    <li><strong>同步策略：</strong>主表关键参数变动时，自动重新生成子表数组</li>
  </ul>
</div>

### 问题4：表单校验的难点在哪里？ {#q7-4}

<div class="original-text">
复杂表单的校验不仅仅是必填项检查，还涉及业务逻辑冲突（如不相容化学品）和数据完整性。

难点与对策：
1. 异步业务校验：在 checkBxr 中，我们调用了后端接口 checkBuxiangrong。由于是异步的，必须在 Promise resolve 后才能决定是否清空货位。如果用户在请求返回前快速切换，可能会导致状态错乱。
2. 跨行/跨列依赖：校验“存放地”时必须先有“名称”；校验“货位”时必须先有“存放地”。我们在 disabledIcon 中通过闭包引用 row 数据，实时计算按钮的可用状态。
3. 批量提交的原子性：在 rukutijiao 时，我们需要遍历 allList 进行预检（checkInputData）。如果有任何一行缺少必填项，整个提交流程都会被打断。
4. 动态显隐校验：根据系统配置 whpBelongtoManage，某些字段（如管理人、归属部门）可能不需要填写。校验逻辑必须动态适配这些配置。
</div>

```ts
// xinzeng.ts - 多维度校验逻辑
/**
 * 检查不相容化学品（异步校验）
 */
checkBxr(rowData:any){
  let {cunfangdiId, huowei, quyuId, mingcheng} = rowData;
  if(!mingcheng || !quyuId) return
  // 异步调用后端接口，存在风险则清空货位并提示
  checkBuxiangrong(cunfangdiId, huowei, quyuId, mingcheng).then((res:any)=>{
    if (res.data) {
      wllib.global.WLWarnMessage(`该试剂柜存在不相容化学品${res.data}，请选择其他试剂柜`);
      rowData.huowei = '';
      rowData.quyuId = '';
    }
  })
}

/**
 * 提交前的全量数据预检
 */
checkInputData(list:any=[]){
  // 动态校验：根据配置决定是否需要检查 guishurenId 或 guishubumenId
  let flag:boolean=list.some((item:any)=>
    !item.shijihaocaiId || 
    !item.cunfangdiId || 
    !item.mingcheng || 
    !item.shuliang ||  
    (this.isShowGuanliren && !item.guishurenId) || 
    (this.isShowGuishubumen && !item.guishubumenId)
  )
  if(flag){
    wllib.global.WLWarnMessage('表格中存在必填项未填写')
    return false;
  }
  return true;
}
```

<div class="memory-aid">
  <ul>
    <li><strong>异步陷阱：</strong>不相容检查是异步的，需注意竞态条件，通常通过清空字段来保证安全</li>
    <li><strong>动态规则：</strong>isShowGuanliren 等计算属性决定了校验规则的边界</li>
    <li><strong>全局拦截：</strong>提交时在 todoRuku 之前插入 checkInputData，确保脏数据不进后端</li>
  </ul>
</div>

<p style="text-align: center; color: #6c757d; margin-top: 60px;">—— 复杂表单联动 · 面试笔记 ——</p>
